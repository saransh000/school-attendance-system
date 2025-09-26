import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import axios from '../utils/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/users/dashboard');
      setDashboardData(response.data.dashboard);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      present: 'success',
      absent: 'danger',
      late: 'warning',
      excused: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Container>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h1>Welcome, {user?.name}!</h1>
          <p className="text-muted">Here's your dashboard overview</p>
        </Col>
      </Row>

      {/* Admin Dashboard */}
      {user?.role === 'admin' && dashboardData && (
        <>
          <Row className="mb-4">
            <Col md={3}>
              <Card className="dashboard-card">
                <Card.Body>
                  <h5>{dashboardData.statistics?.totalUsers || 0}</h5>
                  <p>Total Users</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="dashboard-card">
                <Card.Body>
                  <h5>{dashboardData.statistics?.totalStudents || 0}</h5>
                  <p>Students</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="dashboard-card">
                <Card.Body>
                  <h5>{dashboardData.statistics?.totalTeachers || 0}</h5>
                  <p>Teachers</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="dashboard-card">
                <Card.Body>
                  <h5>{dashboardData.statistics?.totalClasses || 0}</h5>
                  <p>Classes</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col>
              <Card>
                <Card.Header>
                  <h5>Recent Activity</h5>
                </Card.Header>
                <Card.Body>
                  {dashboardData.recentActivity?.length > 0 ? (
                    <Table responsive>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Class</th>
                          <th>Teacher</th>
                          <th>Attendance %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.recentActivity.map((activity, index) => (
                          <tr key={index}>
                            <td>{formatDate(activity.date)}</td>
                            <td>{activity.class?.name} - {activity.class?.section}</td>
                            <td>{activity.teacher?.name}</td>
                            <td>
                              <Badge bg={activity.attendancePercentage >= 75 ? 'success' : 'warning'}>
                                {activity.attendancePercentage}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p>No recent activity</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Teacher Dashboard */}
      {user?.role === 'teacher' && dashboardData && (
        <>
          <Row className="mb-4">
            <Col md={4}>
              <Card className="dashboard-card">
                <Card.Body>
                  <h5>{dashboardData.statistics?.totalClasses || 0}</h5>
                  <p>My Classes</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="dashboard-card">
                <Card.Body>
                  <h5>{dashboardData.statistics?.totalStudents || 0}</h5>
                  <p>Total Students</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="dashboard-card">
                <Card.Body>
                  <h5>{dashboardData.statistics?.recentSessions || 0}</h5>
                  <p>Recent Sessions</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>My Classes</h5>
                </Card.Header>
                <Card.Body>
                  {dashboardData.classes?.length > 0 ? (
                    <Table responsive>
                      <thead>
                        <tr>
                          <th>Class</th>
                          <th>Subject</th>
                          <th>Students</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.classes.map((cls, index) => (
                          <tr key={index}>
                            <td>{cls.name} - {cls.section}</td>
                            <td>{cls.subject}</td>
                            <td>{cls.students?.length || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p>No classes assigned</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Recent Attendance</h5>
                </Card.Header>
                <Card.Body>
                  {dashboardData.recentAttendance?.length > 0 ? (
                    <Table responsive>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Class</th>
                          <th>Attendance %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.recentAttendance.map((record, index) => (
                          <tr key={index}>
                            <td>{formatDate(record.date)}</td>
                            <td>{record.class?.name}</td>
                            <td>
                              <Badge bg={record.attendancePercentage >= 75 ? 'success' : 'warning'}>
                                {record.attendancePercentage}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p>No recent attendance records</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Student Dashboard */}
      {user?.role === 'student' && dashboardData && (
        <>
          <Row className="mb-4">
            <Col md={3}>
              <Card className="dashboard-card">
                <Card.Body>
                  <h5>{dashboardData.statistics?.attendancePercentage || 0}%</h5>
                  <p>Attendance Rate</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="dashboard-card">
                <Card.Body>
                  <h5>{dashboardData.statistics?.present || 0}</h5>
                  <p>Present Days</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="dashboard-card">
                <Card.Body>
                  <h5>{dashboardData.statistics?.absent || 0}</h5>
                  <p>Absent Days</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="dashboard-card">
                <Card.Body>
                  <h5>{dashboardData.statistics?.totalSessions || 0}</h5>
                  <p>Total Sessions</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>My Class</h5>
                </Card.Header>
                <Card.Body>
                  {dashboardData.class ? (
                    <div>
                      <p><strong>Class:</strong> {dashboardData.class.name} - {dashboardData.class.section}</p>
                      <p><strong>Grade:</strong> {dashboardData.class.grade}</p>
                      <p><strong>Subject:</strong> {dashboardData.class.subject}</p>
                      <p><strong>Teacher:</strong> {dashboardData.class.teacher?.name}</p>
                    </div>
                  ) : (
                    <p>No class assigned</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Recent Attendance</h5>
                </Card.Header>
                <Card.Body>
                  {dashboardData.recentAttendance?.length > 0 ? (
                    <Table responsive>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Class</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.recentAttendance.map((record, index) => (
                          <tr key={index}>
                            <td>{formatDate(record.date)}</td>
                            <td>{record.class?.name}</td>
                            <td>{getStatusBadge(record.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p>No attendance records yet</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default Dashboard;