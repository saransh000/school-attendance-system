const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/users', auth, authorize(['admin']), async (req, res) => {
  try {
    const { role, page = 1, limit = 10, search } = req.query;
    
    // Build query
    let query = { isActive: true };
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(query)
      .populate('class', 'name section grade')
      .populate('classes', 'name section grade subject')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      message: 'Server error getting users'
    });
  }
});

// Create new user (admin only)
router.post('/users', [
  auth,
  authorize(['admin']),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'teacher', 'student']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role, studentId, employeeId, phoneNumber, address, dateOfBirth } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email already exists'
      });
    }

    // Create user data object
    const userData = {
      name,
      email,
      password,
      role,
      phoneNumber,
      address,
      dateOfBirth
    };

    // Add role-specific fields
    if (role === 'student' && studentId) {
      // Check if student ID already exists
      const existingStudent = await User.findOne({ studentId, role: 'student' });
      if (existingStudent) {
        return res.status(400).json({
          message: 'Student ID already exists'
        });
      }
      userData.studentId = studentId;
    }

    if (role === 'teacher' && employeeId) {
      // Check if employee ID already exists
      const existingTeacher = await User.findOne({ employeeId, role: 'teacher' });
      if (existingTeacher) {
        return res.status(400).json({
          message: 'Employee ID already exists'
        });
      }
      userData.employeeId = employeeId;
    }

    const user = new User(userData);
    await user.save();

    const populatedUser = await User.findById(user._id)
      .populate('class', 'name section grade')
      .populate('classes', 'name section grade subject');

    res.status(201).json({
      message: 'User created successfully',
      user: populatedUser
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      message: 'Server error creating user'
    });
  }
});

// Update user (admin only)
router.put('/users/:id', [
  auth,
  authorize(['admin']),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('role').optional().isIn(['admin', 'teacher', 'student']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const updates = req.body;

    // If email is being updated, check for duplicates
    if (updates.email && updates.email !== user.email) {
      const existingUser = await User.findOne({ email: updates.email });
      if (existingUser) {
        return res.status(400).json({
          message: 'Email already exists'
        });
      }
    }

    // Handle role-specific ID updates
    if (updates.studentId && user.role === 'student') {
      const existingStudent = await User.findOne({ 
        studentId: updates.studentId, 
        role: 'student',
        _id: { $ne: user._id }
      });
      if (existingStudent) {
        return res.status(400).json({
          message: 'Student ID already exists'
        });
      }
    }

    if (updates.employeeId && user.role === 'teacher') {
      const existingTeacher = await User.findOne({ 
        employeeId: updates.employeeId, 
        role: 'teacher',
        _id: { $ne: user._id }
      });
      if (existingTeacher) {
        return res.status(400).json({
          message: 'Employee ID already exists'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('class', 'name section grade')
    .populate('classes', 'name section grade subject');

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      message: 'Server error updating user'
    });
  }
});

// Deactivate user (admin only)
router.patch('/users/:id/deactivate', auth, authorize(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    user.isActive = false;
    await user.save();

    res.json({
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      message: 'Server error deactivating user'
    });
  }
});

// Activate user (admin only)
router.patch('/users/:id/activate', auth, authorize(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    user.isActive = true;
    await user.save();

    res.json({
      message: 'User activated successfully'
    });

  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      message: 'Server error activating user'
    });
  }
});

// Get system statistics (admin only)
router.get('/statistics', auth, authorize(['admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // User statistics
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
    const totalTeachers = await User.countDocuments({ role: 'teacher', isActive: true });
    const totalAdmins = await User.countDocuments({ role: 'admin', isActive: true });

    // Class statistics
    const totalClasses = await Class.countDocuments({ isActive: true });
    const classByGrade = await Class.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Attendance statistics
    let attendanceQuery = {};
    if (startDate || endDate) {
      attendanceQuery.date = {};
      if (startDate) attendanceQuery.date.$gte = new Date(startDate);
      if (endDate) attendanceQuery.date.$lte = new Date(endDate);
    }

    const attendanceStats = await Attendance.aggregate([
      { $match: attendanceQuery },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          avgAttendancePercentage: { $avg: '$attendancePercentage' },
          totalPresent: { $sum: '$presentCount' },
          totalAbsent: { $sum: '$absentCount' },
          totalLate: { $sum: '$lateCount' },
          totalExcused: { $sum: '$excusedCount' }
        }
      }
    ]);

    // Monthly attendance trend
    const monthlyTrend = await Attendance.aggregate([
      { $match: attendanceQuery },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          sessions: { $sum: 1 },
          avgAttendance: { $avg: '$attendancePercentage' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      users: {
        total: totalUsers,
        students: totalStudents,
        teachers: totalTeachers,
        admins: totalAdmins
      },
      classes: {
        total: totalClasses,
        byGrade: classByGrade
      },
      attendance: attendanceStats[0] || {
        totalSessions: 0,
        avgAttendancePercentage: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalExcused: 0
      },
      trends: {
        monthly: monthlyTrend
      }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      message: 'Server error getting statistics'
    });
  }
});

// Generate attendance report (admin only)
router.get('/reports/attendance', auth, authorize(['admin']), async (req, res) => {
  try {
    const { startDate, endDate, classId, format = 'json' } = req.query;

    // Build query
    let query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    if (classId) query.class = classId;

    const attendanceRecords = await Attendance.find(query)
      .populate('class', 'name section grade subject')
      .populate('teacher', 'name employeeId')
      .populate('students.student', 'name studentId')
      .sort({ date: -1 });

    if (format === 'csv') {
      // Generate CSV format
      let csv = 'Date,Class,Teacher,Student,Status,Remarks\n';
      
      attendanceRecords.forEach(record => {
        record.students.forEach(student => {
          csv += `${record.date.toISOString().split('T')[0]},`;
          csv += `"${record.class.name} - ${record.class.section}",`;
          csv += `"${record.teacher.name}",`;
          csv += `"${student.student.name}",`;
          csv += `${student.status},`;
          csv += `"${student.remarks || ''}"\n`;
        });
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
      return res.send(csv);
    }

    res.json({
      report: attendanceRecords,
      summary: {
        totalRecords: attendanceRecords.length,
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
    });

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      message: 'Server error generating report'
    });
  }
});

// Bulk import users (admin only)
router.post('/users/bulk-import', [
  auth,
  authorize(['admin']),
  body('users').isArray({ min: 1 }).withMessage('Users array is required'),
  body('users.*.name').trim().notEmpty().withMessage('Name is required for each user'),
  body('users.*.email').isEmail().withMessage('Valid email is required for each user'),
  body('users.*.role').isIn(['teacher', 'student']).withMessage('Valid role is required for each user')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { users } = req.body;
    const results = {
      success: [],
      errors: []
    };

    for (let i = 0; i < users.length; i++) {
      try {
        const userData = users[i];
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          results.errors.push({
            row: i + 1,
            email: userData.email,
            error: 'Email already exists'
          });
          continue;
        }

        // Set default password if not provided
        if (!userData.password) {
          userData.password = 'defaultpass123';
        }

        const user = new User(userData);
        await user.save();
        
        results.success.push({
          row: i + 1,
          email: userData.email,
          name: userData.name,
          role: userData.role
        });

      } catch (error) {
        results.errors.push({
          row: i + 1,
          email: users[i].email,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Bulk import completed',
      results: {
        totalProcessed: users.length,
        successful: results.success.length,
        failed: results.errors.length,
        success: results.success,
        errors: results.errors
      }
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      message: 'Server error during bulk import'
    });
  }
});

module.exports = router;