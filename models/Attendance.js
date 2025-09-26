const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  students: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      required: true
    },
    markedAt: {
      type: Date,
      default: Date.now
    },
    remarks: {
      type: String,
      trim: true
    }
  }],
  totalStudents: {
    type: Number,
    required: true
  },
  presentCount: {
    type: Number,
    default: 0
  },
  absentCount: {
    type: Number,
    default: 0
  },
  lateCount: {
    type: Number,
    default: 0
  },
  excusedCount: {
    type: Number,
    default: 0
  },
  attendancePercentage: {
    type: Number,
    default: 0
  },
  sessionType: {
    type: String,
    enum: ['regular', 'makeup', 'exam', 'event'],
    default: 'regular'
  },
  isFinalized: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Calculate attendance statistics before saving
AttendanceSchema.pre('save', function(next) {
  this.totalStudents = this.students.length;
  this.presentCount = this.students.filter(s => s.status === 'present').length;
  this.absentCount = this.students.filter(s => s.status === 'absent').length;
  this.lateCount = this.students.filter(s => s.status === 'late').length;
  this.excusedCount = this.students.filter(s => s.status === 'excused').length;
  
  if (this.totalStudents > 0) {
    this.attendancePercentage = Math.round((this.presentCount / this.totalStudents) * 100);
  }
  
  next();
});

// Index for efficient queries
AttendanceSchema.index({ class: 1, date: -1 });
AttendanceSchema.index({ teacher: 1, date: -1 });
AttendanceSchema.index({ 'students.student': 1, date: -1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);