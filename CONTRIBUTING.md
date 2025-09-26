# Contributing to School Attendance System

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- MongoDB (running locally or connection string to remote instance)
- npm or yarn

## Quick Start

1. **Clone and navigate to the project**
   ```bash
   cd project-folder
   ```

2. **Install dependencies**
   ```bash
   npm install
   npm run client-install
   ```

3. **Set up environment variables**
   Copy `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

5. **Seed demo data** (optional)
   ```bash
   node seed.js
   ```

6. **Start the development server**
   ```bash
   npm run dev-full
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Demo Accounts

After running the seed script, you can use these accounts:

- **Admin**: admin@school.com / password123
- **Teacher**: teacher@school.com / password123  
- **Student**: student@school.com / password123

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/change-password` - Change password
- `GET /api/users/dashboard` - Get dashboard data

### Classes (Admin/Teachers)
- `GET /api/classes` - Get classes
- `POST /api/classes` - Create class (admin only)
- `PUT /api/classes/:id` - Update class (admin only)
- `DELETE /api/classes/:id` - Delete class (admin only)

### Attendance (Teachers/Students)
- `POST /api/attendance` - Take attendance (teachers)
- `GET /api/attendance/class/:classId` - Get class attendance
- `GET /api/attendance/student/:studentId` - Get student attendance
- `PUT /api/attendance/:id` - Update attendance (teachers)

### Admin Functions
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/statistics` - Get system statistics
- `GET /api/admin/reports/attendance` - Generate attendance report

## Project Structure

```
├── client/                 # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── contexts/       # React context providers
│   │   ├── pages/          # Main application pages
│   │   └── utils/          # Utility functions
│   └── package.json
├── models/                 # MongoDB/Mongoose models
│   ├── User.js            # User model (admin, teacher, student)
│   ├── Class.js           # Class model
│   └── Attendance.js      # Attendance record model
├── routes/                 # Express API routes
│   ├── auth.js            # Authentication routes
│   ├── users.js           # User management routes
│   ├── classes.js         # Class management routes
│   ├── attendance.js      # Attendance routes
│   └── admin.js           # Admin-specific routes
├── middleware/             # Express middleware
│   └── auth.js            # Authentication & authorization middleware
├── server.js              # Main Express server
├── seed.js               # Demo data seeder
└── package.json          # Backend dependencies
```

## Features by Role

### Admin Portal
- 👥 **User Management**: Create, update, deactivate users
- 🏫 **Class Management**: Create classes, assign teachers and students
- 📊 **System Analytics**: View system-wide statistics and trends
- 📈 **Reports**: Generate attendance reports (JSON/CSV)
- 📋 **Bulk Operations**: Import users in bulk

### Teacher Portal  
- 📋 **Take Attendance**: Mark attendance for assigned classes
- 📊 **View Reports**: Class attendance statistics and trends
- 👥 **Manage Classes**: View assigned classes and student lists
- 📈 **Analytics**: Track attendance patterns

### Student Portal
- 📊 **View Attendance**: Personal attendance records and status
- 📈 **Statistics**: Attendance percentage and trends  
- 🏫 **Class Info**: View class details and schedule
- 📋 **History**: Historical attendance records

## Development

### Backend Development
The backend is built with Node.js and Express, using MongoDB for data storage.

**Key technologies:**
- Express.js for REST API
- Mongoose for MongoDB ODM
- JWT for authentication
- bcrypt for password hashing
- express-validator for input validation

### Frontend Development  
The frontend is a React.js application with Bootstrap for styling.

**Key technologies:**
- React.js with hooks
- React Router for navigation
- Bootstrap & React-Bootstrap for UI
- Axios for API calls
- React Context for state management

### Database Schema

**Users Collection:**
- Basic info (name, email, role)
- Role-specific fields (studentId, employeeId)
- Profile data (phone, address, etc.)

**Classes Collection:**
- Class details (name, section, grade, subject)
- Teacher assignment
- Student enrollments
- Schedule information

**Attendance Collection:**
- Class and date reference
- Student attendance records
- Status tracking (present/absent/late/excused)
- Statistics calculation

## Troubleshooting

**Common Issues:**

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`

2. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing processes on ports 3000/5000

3. **Authentication Issues**
   - Verify JWT_SECRET in `.env`
   - Check token expiration

4. **Dependency Issues**
   - Delete `node_modules` and run `npm install`
   - Check Node.js version compatibility

## License

MIT License - feel free to use this project for educational purposes.