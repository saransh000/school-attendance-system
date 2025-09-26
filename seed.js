const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Class = require('./models/Class');
require('dotenv').config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/school-attendance');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Class.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = new User({
      name: 'System Administrator',
      email: 'admin@school.com',
      password: 'password123',
      role: 'admin',
      phoneNumber: '123-456-7890'
    });
    await admin.save();
    console.log('Admin user created');

    // Create teachers
    const teacher1 = new User({
      name: 'Sarah Johnson',
      email: 'teacher@school.com',
      password: 'password123',
      role: 'teacher',
      employeeId: 'T001',
      phoneNumber: '123-456-7891'
    });
    await teacher1.save();

    const teacher2 = new User({
      name: 'Michael Brown',
      email: 'michael.brown@school.com',
      password: 'password123',
      role: 'teacher',
      employeeId: 'T002',
      phoneNumber: '123-456-7892'
    });
    await teacher2.save();
    console.log('Teachers created');

    // Create students
    const students = [];
    for (let i = 1; i <= 10; i++) {
      const student = new User({
        name: `Student ${i}`,
        email: `student${i}@school.com`,
        password: 'password123',
        role: 'student',
        studentId: `S${i.toString().padStart(3, '0')}`,
        phoneNumber: `123-456-78${i.toString().padStart(2, '0')}`
      });
      await student.save();
      students.push(student);
    }
    console.log('Students created');

    // Create demo student for login
    const demoStudent = new User({
      name: 'Demo Student',
      email: 'student@school.com',
      password: 'password123',
      role: 'student',
      studentId: 'S999',
      phoneNumber: '123-456-7899'
    });
    await demoStudent.save();
    students.push(demoStudent);

    // Create classes
    const class1 = new Class({
      name: 'Mathematics',
      section: 'A',
      grade: '10',
      subject: 'Advanced Mathematics',
      teacher: teacher1._id,
      students: students.slice(0, 5).map(s => s._id),
      schedule: {
        days: ['Monday', 'Wednesday', 'Friday'],
        startTime: '09:00',
        endTime: '10:00'
      },
      academicYear: '2024-2025'
    });
    await class1.save();

    const class2 = new Class({
      name: 'Science',
      section: 'B',
      grade: '9',
      subject: 'General Science',
      teacher: teacher2._id,
      students: students.slice(5).map(s => s._id),
      schedule: {
        days: ['Tuesday', 'Thursday'],
        startTime: '10:00',
        endTime: '11:00'
      },
      academicYear: '2024-2025'
    });
    await class2.save();

    // Update teachers with their classes
    await User.findByIdAndUpdate(teacher1._id, { classes: [class1._id] });
    await User.findByIdAndUpdate(teacher2._id, { classes: [class2._id] });

    // Update students with their classes
    for (let i = 0; i < 5; i++) {
      await User.findByIdAndUpdate(students[i]._id, { class: class1._id });
    }
    for (let i = 5; i < students.length; i++) {
      await User.findByIdAndUpdate(students[i]._id, { class: class2._id });
    }

    console.log('Classes created and users updated');
    console.log('Demo data seeded successfully!');
    console.log('\nDemo login credentials:');
    console.log('Admin: admin@school.com / password123');
    console.log('Teacher: teacher@school.com / password123');
    console.log('Student: student@school.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();