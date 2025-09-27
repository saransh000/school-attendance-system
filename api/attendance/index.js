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
      let attendance;

      if (user.role === 'student') {
        // Students can only see their own attendance
        attendance = await db.collection('attendance')
          .find({ studentEmail: user.email })
          .sort({ date: -1 })
          .toArray();
      } else if (user.role === 'teacher') {
        // Teachers can see attendance for their classes
        const { classId, date } = req.query;
        
        let query = {};
        if (classId) query.classId = classId;
        if (date) query.date = date;
        
        attendance = await db.collection('attendance')
          .find(query)
          .sort({ date: -1 })
          .toArray();
      } else if (user.role === 'admin') {
        // Admin can see all attendance
        const { date, classId } = req.query;
        
        let query = {};
        if (date) query.date = date;
        if (classId) query.classId = classId;
        
        attendance = await db.collection('attendance')
          .find(query)
          .sort({ date: -1 })
          .toArray();
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }

      return res.json(attendance);
    }

    if (req.method === 'POST') {
      // Only teachers can mark attendance
      if (user.role !== 'teacher') {
        return res.status(403).json({ message: 'Access denied' });
      }

      const { classId, studentEmail, status, date } = req.body;

      if (!classId || !studentEmail || !status) {
        return res.status(400).json({ message: 'Class ID, student email, and status are required' });
      }

      // Verify teacher owns this class
      const classDoc = await db.collection('classes').findOne({ 
        _id: { $oid: classId }, 
        teacher: user.email 
      });

      if (!classDoc) {
        return res.status(403).json({ message: 'You can only mark attendance for your classes' });
      }

      const attendanceRecord = {
        classId,
        studentEmail,
        status, // 'present', 'absent', 'late'
        date: date || new Date().toISOString().split('T')[0],
        markedBy: user.email,
        markedAt: new Date()
      };

      // Check if attendance already exists for this student/class/date
      const existing = await db.collection('attendance').findOne({
        classId,
        studentEmail,
        date: attendanceRecord.date
      });

      if (existing) {
        // Update existing record
        await db.collection('attendance').updateOne(
          { _id: existing._id },
          { $set: { status, markedBy: user.email, markedAt: new Date() } }
        );
        
        return res.json({
          message: 'Attendance updated successfully',
          attendance: { ...existing, status, markedBy: user.email }
        });
      } else {
        // Create new record
        const result = await db.collection('attendance').insertOne(attendanceRecord);
        
        return res.status(201).json({
          message: 'Attendance marked successfully',
          attendance: { ...attendanceRecord, _id: result.insertedId }
        });
      }
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Attendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}