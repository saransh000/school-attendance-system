const express = require('express');
const { body, validationResult } = require('express-validator');
const Class = require('../models/Class');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all classes (for admin and teachers)
router.get('/', auth, async (req, res) => {
  try {
    let query = { isActive: true };
    
    // If teacher, only show their classes
    if (req.user.role === 'teacher') {
      query.teacher = req.user._id;
    }
    
    // If student, only show their class
    if (req.user.role === 'student') {
      query._id = req.user.class;
    }

    const classes = await Class.find(query)
      .populate('teacher', 'name email employeeId')
      .populate('students', 'name email studentId')
      .sort({ grade: 1, section: 1, name: 1 });

    res.json({
      classes,
      total: classes.length
    });

  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ 
      message: 'Server error getting classes' 
    });
  }
});

// Get class by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('teacher', 'name email employeeId phoneNumber')
      .populate('students', 'name email studentId phoneNumber');

    if (!classData) {
      return res.status(404).json({ 
        message: 'Class not found' 
      });
    }

    // Check permissions
    if (req.user.role === 'teacher' && !classData.teacher._id.equals(req.user._id)) {
      return res.status(403).json({ 
        message: 'Access denied. You can only view your assigned classes.' 
      });
    }

    if (req.user.role === 'student' && !classData.students.some(student => student._id.equals(req.user._id))) {
      return res.status(403).json({ 
        message: 'Access denied. You can only view your enrolled classes.' 
      });
    }

    res.json({ class: classData });

  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ 
      message: 'Server error getting class' 
    });
  }
});

// Create new class (admin only)
router.post('/', [
  auth,
  authorize(['admin']),
  body('name').trim().notEmpty().withMessage('Class name is required'),
  body('section').trim().notEmpty().withMessage('Section is required'),
  body('grade').trim().notEmpty().withMessage('Grade is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('teacher').isMongoId().withMessage('Valid teacher ID is required'),
  body('academicYear').trim().notEmpty().withMessage('Academic year is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, section, grade, subject, teacher, schedule, academicYear, description, students } = req.body;

    // Verify teacher exists and has teacher role
    const teacherUser = await User.findById(teacher);
    if (!teacherUser || teacherUser.role !== 'teacher') {
      return res.status(400).json({ 
        message: 'Invalid teacher selected' 
      });
    }

    // Check if class already exists
    const existingClass = await Class.findOne({
      grade,
      section,
      subject,
      academicYear,
      isActive: true
    });

    if (existingClass) {
      return res.status(400).json({ 
        message: 'A class with this grade, section, and subject already exists for the academic year' 
      });
    }

    // Verify students exist and have student role
    let validStudents = [];
    if (students && students.length > 0) {
      const studentUsers = await User.find({
        _id: { $in: students },
        role: 'student',
        isActive: true
      });
      validStudents = studentUsers.map(student => student._id);
    }

    const newClass = new Class({
      name,
      section,
      grade,
      subject,
      teacher,
      schedule,
      academicYear,
      description,
      students: validStudents
    });

    await newClass.save();

    // Update teacher's classes array
    await User.findByIdAndUpdate(teacher, {
      $addToSet: { classes: newClass._id }
    });

    // Update students' class field
    if (validStudents.length > 0) {
      await User.updateMany(
        { _id: { $in: validStudents } },
        { class: newClass._id }
      );
    }

    const populatedClass = await Class.findById(newClass._id)
      .populate('teacher', 'name email employeeId')
      .populate('students', 'name email studentId');

    res.status(201).json({
      message: 'Class created successfully',
      class: populatedClass
    });

  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ 
      message: 'Server error creating class' 
    });
  }
});

// Update class (admin only)
router.put('/:id', [
  auth,
  authorize(['admin']),
  body('name').optional().trim().notEmpty().withMessage('Class name cannot be empty'),
  body('section').optional().trim().notEmpty().withMessage('Section cannot be empty'),
  body('grade').optional().trim().notEmpty().withMessage('Grade cannot be empty'),
  body('subject').optional().trim().notEmpty().withMessage('Subject cannot be empty'),
  body('teacher').optional().isMongoId().withMessage('Valid teacher ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const classData = await Class.findById(req.params.id);
    if (!classData) {
      return res.status(404).json({ 
        message: 'Class not found' 
      });
    }

    const updates = req.body;

    // If teacher is being updated, verify the new teacher
    if (updates.teacher) {
      const teacherUser = await User.findById(updates.teacher);
      if (!teacherUser || teacherUser.role !== 'teacher') {
        return res.status(400).json({ 
          message: 'Invalid teacher selected' 
        });
      }
    }

    // If students are being updated, verify they exist
    if (updates.students) {
      const studentUsers = await User.find({
        _id: { $in: updates.students },
        role: 'student',
        isActive: true
      });
      updates.students = studentUsers.map(student => student._id);
    }

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('teacher', 'name email employeeId')
    .populate('students', 'name email studentId');

    res.json({
      message: 'Class updated successfully',
      class: updatedClass
    });

  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ 
      message: 'Server error updating class' 
    });
  }
});

// Add student to class (admin only)
router.post('/:id/students', [
  auth,
  authorize(['admin']),
  body('studentId').isMongoId().withMessage('Valid student ID is required')
], async (req, res) => {
  try {
    const { studentId } = req.body;

    const classData = await Class.findById(req.params.id);
    if (!classData) {
      return res.status(404).json({ 
        message: 'Class not found' 
      });
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({ 
        message: 'Invalid student selected' 
      });
    }

    // Check if student is already in the class
    if (classData.students.includes(studentId)) {
      return res.status(400).json({ 
        message: 'Student is already enrolled in this class' 
      });
    }

    // Add student to class
    classData.students.push(studentId);
    await classData.save();

    // Update student's class field
    await User.findByIdAndUpdate(studentId, { class: classData._id });

    res.json({
      message: 'Student added to class successfully'
    });

  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({ 
      message: 'Server error adding student to class' 
    });
  }
});

// Remove student from class (admin only)
router.delete('/:id/students/:studentId', auth, authorize(['admin']), async (req, res) => {
  try {
    const { id: classId, studentId } = req.params;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ 
        message: 'Class not found' 
      });
    }

    // Remove student from class
    classData.students = classData.students.filter(
      student => !student.equals(studentId)
    );
    await classData.save();

    // Remove class from student
    await User.findByIdAndUpdate(studentId, { $unset: { class: 1 } });

    res.json({
      message: 'Student removed from class successfully'
    });

  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({ 
      message: 'Server error removing student from class' 
    });
  }
});

// Delete class (admin only)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);
    if (!classData) {
      return res.status(404).json({ 
        message: 'Class not found' 
      });
    }

    // Soft delete - mark as inactive
    classData.isActive = false;
    await classData.save();

    // Remove class from teacher's classes array
    await User.findByIdAndUpdate(classData.teacher, {
      $pull: { classes: classData._id }
    });

    // Remove class from students
    await User.updateMany(
      { class: classData._id },
      { $unset: { class: 1 } }
    );

    res.json({
      message: 'Class deleted successfully'
    });

  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ 
      message: 'Server error deleting class' 
    });
  }
});

module.exports = router;