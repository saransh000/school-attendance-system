import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }
  
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

function authenticateToken(authHeader) {
  if (!authHeader) return null;
  
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://project-a-six-pied.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = authenticateToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const client = await connectToDatabase();
    const db = client.db('attendance_system');

    // Get user profile
    const profile = await db.collection('users').findOne(
      { email: user.email },
      { projection: { password: 0 } }
    );

    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get role-specific data
    let roleData = {};
    
    if (user.role === 'teacher') {
      const classes = await db.collection('classes').find({ teacher: user.email }).toArray();
      roleData = { classes };
    } else if (user.role === 'student') {
      const attendance = await db.collection('attendance')
        .find({ studentEmail: user.email })
        .sort({ date: -1 })
        .limit(10)
        .toArray();
      roleData = { recentAttendance: attendance };
    } else if (user.role === 'admin') {
      const totalUsers = await db.collection('users').countDocuments();
      const totalClasses = await db.collection('classes').countDocuments();
      const todayAttendance = await db.collection('attendance')
        .countDocuments({ date: new Date().toISOString().split('T')[0] });
      
      roleData = {
        totalUsers,
        totalClasses,
        todayAttendance
      };
    }

    res.json({
      user: profile,
      ...roleData
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}