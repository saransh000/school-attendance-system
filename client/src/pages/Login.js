import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Container>
        <Card className="login-card bg-white">
          <Card.Body>
            <div className="text-center mb-4">
              <h2 className="text-primary">🎓 School Attendance</h2>
              <p className="text-muted">Sign in to your account</p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
              <div className="form-floating mb-3">
                <Form.Control
                  type="email"
                  id="email"
                  name="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="email">Email address</label>
              </div>

              <div className="form-floating mb-3">
                <Form.Control
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="password">Password</label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </Form>

            <div className="mt-4 text-center">
              <small className="text-muted">
                Demo Accounts:<br />
                Admin: admin@school.com / password123<br />
                Teacher: teacher@school.com / password123<br />
                Student: student@school.com / password123
              </small>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default Login;