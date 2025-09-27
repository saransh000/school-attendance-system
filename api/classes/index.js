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

  try {
    // Authenticate user
    const user = authenticateToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const client = await connectToDatabase();
    const db = client.db('attendance_system');

    if (req.method === 'GET') {
      // Get classes based on user role
      let classes;
      
      if (user.role === 'teacher') {
        classes = await db.collection('classes').find({ teacher: user.email }).toArray();
      } else if (user.role === 'admin') {
        classes = await db.collection('classes').find({}).toArray();
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }

      return res.json(classes);
    }

    if (req.method === 'POST') {
      // Only admin and teachers can create classes
      if (user.role !== 'admin' && user.role !== 'teacher') {
        return res.status(403).json({ message: 'Access denied' });
      }

      const { name, subject, students } = req.body;

      if (!name || !subject) {
        return res.status(400).json({ message: 'Name and subject are required' });
      }

      const newClass = {
        name,
        subject,
        teacher: user.email,
        students: students || [],
        createdAt: new Date()
      };

      const result = await db.collection('classes').insertOne(newClass);
      
      return res.status(201).json({
        message: 'Class created successfully',
        class: { ...newClass, _id: result.insertedId }
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Classes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}