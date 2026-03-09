import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, CloudQueue } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'operator', // Default role
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await api.auth.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
      });

      // Store the JWT token (response wrapped in data envelope by backend)
      const responseData = response.data.data || response.data;
      if (responseData.token) {
        localStorage.setItem('authToken', responseData.token);
        localStorage.setItem('user', JSON.stringify(responseData.user));
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError('Registration successful but no token received');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Card
          elevation={6}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <CloudQueue
                sx={{
                  fontSize: 60,
                  color: 'primary.main',
                  mb: 1,
                }}
              />
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                Create Account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Join ZL Cloud Deploy
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                margin="normal"
                required
                autoComplete="given-name"
                autoFocus
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                margin="normal"
                required
                autoComplete="family-name"
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                margin="normal"
                required
                autoComplete="email"
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                margin="normal"
                required
                autoComplete="new-password"
                disabled={loading}
                helperText="Must be at least 8 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                margin="normal"
                required
                autoComplete="new-password"
                disabled={loading}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Button
                    size="small"
                    onClick={() => navigate('/login')}
                    disabled={loading}
                  >
                    Sign In
                  </Button>
                </Typography>
              </Box>
            </form>
          </CardContent>
        </Card>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="white" sx={{ opacity: 0.8 }}>
            Secure multi-cloud Kubernetes deployment platform
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Register;
