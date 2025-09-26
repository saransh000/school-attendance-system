const express = require('express');
const { body, validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Take attendance (teachers only)
router.post('/', [
  auth,
  authorize(['teacher']),
  body('classId').isMongoId().withMessage('Valid class ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('students').isArray({ min: 1 }).withMessage('Students attendance data is required'),
  body('students.*.student').isMongoId().withMessage('Valid student ID is required'),
  body('students.*.status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid attendance status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { classId, date, students, sessionType = 'regular' } = req.body;

    // Verify class exists and teacher is assigned
    const classData = await Class.findById(classId).populate('students', 'name studentId');
    if (!classData) {
      return res.status(404).json({
        message: 'Class not found'
      });
    }

    if (!classData.teacher.equals(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied. You can only take attendance for your assigned classes.'
      });
    }

    // Check if attendance already exists for this date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    
    const existingAttendance = await Attendance.findOne({
      class: classId,
      date: {
        $gte: attendanceDate,
        $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingAttendance && existingAttendance.isFinalized) {
      return res.status(400).json({
        message: 'Attendance for this date has already been finalized'
      });
    }

    // Validate that all students belong to the class
    const classStudentIds = classData.students.map(s => s._id.toString());
    const providedStudentIds = students.map(s => s.student);
    
    const invalidStudents = providedStudentIds.filter(id => !classStudentIds.includes(id));
    if (invalidStudents.length > 0) {
      return res.status(400).json({
        message: 'Some students do not belong to this class'
      });
    }

    // Create or update attendance record
    let attendance;
    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.students = students.map(s => ({
        ...s,
        markedAt: new Date()
      }));
      existingAttendance.sessionType = sessionType;
      attendance = await existingAttendance.save();
    } else {
      // Create new attendance record
      attendance = new Attendance({
        class: classId,
        teacher: req.user._id,
        date: attendanceDate,
        students: students.map(s => ({
          ...s,
          markedAt: new Date()
        })),
        sessionType
      });
      await attendance.save();
    }

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('class', 'name section grade subject')
      .populate('teacher', 'name employeeId')
      .populate('students.student', 'name studentId');

    res.json({
      message: 'Attendance recorded successfully',
      attendance: populatedAttendance
    });

  } catch (error) {
    console.error('Take attendance error:', error);
    res.status(500).json({
      message: 'Server error recording attendance'
    });
  }
});

// Get attendance records for a class (teachers and admin)
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    // Verify class exists and user has permission
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        message: 'Class not found'
      });
    }

    // Check permissions
    if (req.user.role === 'teacher' && !classData.teacher.equals(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied. You can only view attendance for your assigned classes.'
      });
    }

    // Build query
    let query = { class: classId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Get attendance records with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const attendanceRecords = await Attendance.find(query)
      .populate('teacher', 'name employeeId')
      .populate('students.student', 'name studentId')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments(query);

    // Calculate attendance statistics
    const stats = await Attendance.aggregate([
      { $match: query },
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

    res.json({
      attendance: attendanceRecords,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        limit: parseInt(limit)
      },
      statistics: stats[0] || {
        totalSessions: 0,
        avgAttendancePercentage: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalExcused: 0
      }
    });

  } catch (error) {
    console.error('Get class attendance error:', error);
    res.status(500).json({
      message: 'Server error getting attendance records'
    });
  }
});

// Get attendance records for a student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    // Check permissions - students can only view their own records
    if (req.user.role === 'student' && !req.user._id.equals(studentId)) {
      return res.status(403).json({
        message: 'Access denied. You can only view your own attendance records.'
      });
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        message: 'Student not found'
      });
    }

    // Build query
    let query = { 'students.student': studentId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Get attendance records with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const attendanceRecords = await Attendance.find(query)
      .populate('class', 'name section grade subject')
      .populate('teacher', 'name employeeId')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Extract student-specific attendance data
    const studentAttendance = attendanceRecords.map(record => {
      const studentData = record.students.find(s => s.student.equals(studentId));
      return {
        _id: record._id,
        class: record.class,
        teacher: record.teacher,
        date: record.date,
        status: studentData.status,
        remarks: studentData.remarks,
        markedAt: studentData.markedAt,
        sessionType: record.sessionType
      };
    });

    const total = await Attendance.countDocuments(query);

    // Calculate student statistics
    const studentStats = studentAttendance.reduce((acc, record) => {
      acc.totalSessions++;
      switch (record.status) {
        case 'present': acc.present++; break;
        case 'absent': acc.absent++; break;
        case 'late': acc.late++; break;
        case 'excused': acc.excused++; break;
      }
      return acc;
    }, { totalSessions: 0, present: 0, absent: 0, late: 0, excused: 0 });

    if (studentStats.totalSessions > 0) {
      studentStats.attendancePercentage = Math.round((studentStats.present / studentStats.totalSessions) * 100);
    } else {
      studentStats.attendancePercentage = 0;
    }

    res.json({
      attendance: studentAttendance,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        limit: parseInt(limit)
      },
      statistics: studentStats
    });

  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({
      message: 'Server error getting student attendance'
    });
  }
});

// Update attendance record (teachers only)
router.put('/:id', [
  auth,
  authorize(['teacher']),
  body('students').isArray({ min: 1 }).withMessage('Students attendance data is required'),
  body('students.*.student').isMongoId().withMessage('Valid student ID is required'),
  body('students.*.status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid attendance status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({
        message: 'Attendance record not found'
      });
    }

    // Check if teacher owns this attendance record
    if (!attendance.teacher.equals(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied. You can only update your own attendance records.'
      });
    }

    // Check if attendance is finalized
    if (attendance.isFinalized) {
      return res.status(400).json({
        message: 'Cannot update finalized attendance record'
      });
    }

    // Update attendance
    attendance.students = req.body.students.map(s => ({
      ...s,
      markedAt: new Date()
    }));
    
    if (req.body.sessionType) {
      attendance.sessionType = req.body.sessionType;
    }

    await attendance.save();

    const updatedAttendance = await Attendance.findById(attendance._id)
      .populate('class', 'name section grade subject')
      .populate('teacher', 'name employeeId')
      .populate('students.student', 'name studentId');

    res.json({
      message: 'Attendance updated successfully',
      attendance: updatedAttendance
    });

  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      message: 'Server error updating attendance'
    });
  }
});

// Finalize attendance record (teachers only)
router.patch('/:id/finalize', auth, authorize(['teacher']), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({
        message: 'Attendance record not found'
      });
    }

    // Check if teacher owns this attendance record
    if (!attendance.teacher.equals(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied. You can only finalize your own attendance records.'
      });
    }

    if (attendance.isFinalized) {
      return res.status(400).json({
        message: 'Attendance record is already finalized'
      });
    }

    attendance.isFinalized = true;
    await attendance.save();

    res.json({
      message: 'Attendance record finalized successfully'
    });

  } catch (error) {
    console.error('Finalize attendance error:', error);
    res.status(500).json({
      message: 'Server error finalizing attendance'
    });
  }
});

// Delete attendance record (teachers and admin)
router.delete('/:id',auth, authorize(['teacher', 'admin']), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({
        message: 'Attendance record not found'
      });
    }

    // Teachers can only delete their own records, admins can delete any
    if (req.user.role === 'teacher' && !attendance.teacher.equals(req.user._id)) {
      return res.status(403).json({
        message: 'Access denied. You can only delete your own attendance records.'
      });
    }

    // Check if attendance is finalized
    if (attendance.isFinalized && req.user.role !== 'admin') {
      return res.status(400).json({
        message: 'Cannot delete finalized attendance record. Contact administrator.'
      });
    }

    await Attendance.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Attendance record deleted successfully'
    });

  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      message: 'Server error deleting attendance record'
    });
  }
});

module.exports = router;