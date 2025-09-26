const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('class', 'name section grade subject')
      .populate('classes', 'name section grade subject');

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        employeeId: user.employeeId,
        phoneNumber: user.phoneNumber,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        class: user.class,
        classes: user.classes,
        profilePicture: user.profilePicture,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: 'Server error getting user profile' 
    });
  }
});

// Update user profile
router.put('/profile', [
  auth,
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phoneNumber').optional().trim(),
  body('address').optional().trim(),
  body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, phoneNumber, address, dateOfBirth } = req.body;
    
    // Build update object with only provided fields
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (address !== undefined) updates.address = address;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('class', 'name section grade subject')
    .populate('classes', 'name section grade subject');

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        employeeId: user.employeeId,
        phoneNumber: user.phoneNumber,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        class: user.class,
        classes: user.classes,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Server error updating profile' 
    });
  }
});

// Change password
router.put('/change-password', [
  auth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ 
        message: 'Current password is incorrect' 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      message: 'Server error changing password' 
    });
  }
});

// Get dashboard data based on user role
router.get('/dashboard', auth, async (req, res) => {
  try {
    let dashboardData = {};

    if (req.user.role === 'student') {
      // Student dashboard data
      const Class = require('../models/Class');
      const Attendance = require('../models/Attendance');

      const userClass = await Class.findById(req.user.class)
        .populate('teacher', 'name employeeId');

      // Get recent attendance records
      const recentAttendance = await Attendance.find({
        'students.student': req.user._id
      })
      .populate('class', 'name subject')
      .sort({ date: -1 })
      .limit(10);

      // Calculate attendance statistics
      const attendanceStats = recentAttendance.reduce((acc, record) => {
        const studentData = record.students.find(s => s.student.equals(req.user._id));
        acc.totalSessions++;
        switch (studentData.status) {
          case 'present': acc.present++; break;
          case 'absent': acc.absent++; break;
          case 'late': acc.late++; break;
          case 'excused': acc.excused++; break;
        }
        return acc;
      }, { totalSessions: 0, present: 0, absent: 0, late: 0, excused: 0 });

      attendanceStats.attendancePercentage = attendanceStats.totalSessions > 0 
        ? Math.round((attendanceStats.present / attendanceStats.totalSessions) * 100) 
        : 0;

      dashboardData = {
        class: userClass,
        recentAttendance: recentAttendance.map(record => {
          const studentData = record.students.find(s => s.student.equals(req.user._id));
          return {
            date: record.date,
            class: record.class,
            status: studentData.status,
            remarks: studentData.remarks
          };
        }),
        statistics: attendanceStats
      };

    } else if (req.user.role === 'teacher') {
      // Teacher dashboard data
      const Class = require('../models/Class');
      const Attendance = require('../models/Attendance');

      const teacherClasses = await Class.find({
        teacher: req.user._id,
        isActive: true
      }).populate('students', 'name studentId');

      // Get recent attendance records
      const recentAttendance = await Attendance.find({
        teacher: req.user._id
      })
      .populate('class', 'name section grade')
      .sort({ date: -1 })
      .limit(10);

      // Calculate summary statistics
      const totalStudents = teacherClasses.reduce((acc, cls) => acc + cls.students.length, 0);
      const totalClasses = teacherClasses.length;

      dashboardData = {
        classes: teacherClasses,
        recentAttendance,
        statistics: {
          totalClasses,
          totalStudents,
          recentSessions: recentAttendance.length
        }
      };

    } else if (req.user.role === 'admin') {
      // Admin dashboard data
      const Class = require('../models/Class');
      const Attendance = require('../models/Attendance');

      const totalUsers = await User.countDocuments({ isActive: true });
      const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
      const totalTeachers = await User.countDocuments({ role: 'teacher', isActive: true });
      const totalClasses = await Class.countDocuments({ isActive: true });

      // Get recent activity
      const recentAttendance = await Attendance.find()
        .populate('class', 'name section grade')
        .populate('teacher', 'name employeeId')
        .sort({ createdAt: -1 })
        .limit(10);

      dashboardData = {
        statistics: {
          totalUsers,
          totalStudents,
          totalTeachers,
          totalClasses
        },
        recentActivity: recentAttendance
      };
    }

    res.json({
      dashboard: dashboardData
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ 
      message: 'Server error getting dashboard data' 
    });
  }
});

module.exports = router;