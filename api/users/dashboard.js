const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

// Database connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    cachedDb = connection;
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// Auth middleware
async function authenticateToken(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }
    
    return user;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Connect to database
    await connectToDatabase();
    
    // Authenticate user
    const user = await authenticateToken(req);
    
    let dashboardData = {};

    if (user.role === 'student') {
      // Student dashboard data - simplified for now
      dashboardData = {
        statistics: {
          attendancePercentage: 85,
          present: 17,
          absent: 3,
          totalSessions: 20
        },
        recentAttendance: [],
        class: user.class ? {
          name: 'Demo Class',
          section: 'A',
          grade: '10',
          subject: 'Mathematics'
        } : null
      };
    } else if (user.role === 'teacher') {
      // Teacher dashboard data - simplified for now
      dashboardData = {
        statistics: {
          totalClasses: 2,
          totalStudents: 25,
          recentSessions: 5
        },
        classes: [],
        recentAttendance: []
      };
    } else if (user.role === 'admin') {
      // Admin dashboard data - simplified for now
      dashboardData = {
        statistics: {
          totalUsers: 50,
          totalStudents: 40,
          totalTeachers: 8,
          totalClasses: 12
        },
        recentActivity: []
      };
    }

    res.json({
      dashboard: dashboardData
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Server error getting dashboard data',
      error: error.message 
    });
  }
}