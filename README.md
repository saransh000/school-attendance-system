# School Attendance Management System

A comprehensive web application for managing school attendance with separate portals for teachers, students, and administrators.

## Features

### Teacher Portal
- Take attendance for assigned classes
- View attendance history
- Generate attendance reports
- Manage student lists

### Student Portal
- View personal attendance records
- Check attendance status
- View attendance percentage
- Download attendance reports

### Admin Portal
- Manage users (teachers and students)
- Create and manage classes
- Generate comprehensive reports
- Monitor system activity
- Bulk import/export functionality

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Frontend**: React.js
- **Authentication**: JWT (JSON Web Tokens)
- **Styling**: CSS3, Bootstrap

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   npm run client-install
   ```

4. Create a `.env` file in the root directory with the following variables:
   ```
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost/school-attendance
   JWT_SECRET=your_jwt_secret_key
   ```

5. Start the development server:
   ```bash
   npm run dev-full
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Project Structure

```
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── utils/
│   │   └── App.js
│   └── package.json
├── models/                 # MongoDB models
├── routes/                 # Express routes
├── middleware/             # Custom middleware
├── config/                 # Configuration files
├── server.js              # Main server file
└── package.json
```

## API Endpoints

### Authentication
- POST `/api/auth/login` - User login
- POST `/api/auth/register` - User registration

### Users
- GET `/api/users/profile` - Get user profile
- PUT `/api/users/profile` - Update user profile

### Attendance
- POST `/api/attendance` - Mark attendance
- GET `/api/attendance/:classId` - Get class attendance
- GET `/api/attendance/student/:studentId` - Get student attendance

### Classes
- GET `/api/classes` - Get all classes
- POST `/api/classes` - Create new class
- PUT `/api/classes/:id` - Update class
- DELETE `/api/classes/:id` - Delete class

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.