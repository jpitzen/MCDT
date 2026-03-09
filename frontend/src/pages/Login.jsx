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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CloudQueue,
  Business as AdIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginLocal, loginAd, adEnabled } = useAuth();
  const idleLogout = searchParams.get('reason') === 'idle';
  const [activeTab, setActiveTab] = useState(0); // 0 = Local, 1 = AD

  // Local login state
  const [email, setEmail] = useState('');
  const [localPassword, setLocalPassword] = useState('');

  // AD login state
  const [username, setUsername] = useState('');
  const [adPassword, setAdPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLocalSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginLocal(email, localPassword);
      navigate('/dashboard');
    } catch (err) {
      setLocalPassword('');
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginAd(username, adPassword);
      navigate('/dashboard');
    } catch (err) {
      setAdPassword('');
      const msg = err.response?.data?.message || err.response?.data?.error || '';
      if (msg.includes('not configured') || err.response?.data?.code === 'AD_NOT_CONFIGURED') {
        setError('AD/LDAP authentication is not configured. Contact your administrator.');
      } else if (err.response?.data?.code === 'ACCOUNT_LOCKED') {
        setError('Too many failed attempts. Try again in a few minutes.');
      } else {
        setError(msg || 'AD login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
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
        <Card elevation={6} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <CloudQueue sx={{ fontSize: 60, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                ZL Cloud Deploy
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Multi-Cloud Kubernetes Deployment Manager
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {idleLogout && !error && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Your session expired due to inactivity. Please sign in again.
              </Alert>
            )}

            {/* Show tabs only when AD is enabled */}
            {adEnabled && (
              <Tabs
                value={activeTab}
                onChange={(_, v) => { setActiveTab(v); setError(''); }}
                variant="fullWidth"
                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="Local" />
                <Tab label="AD / LDAP" icon={<AdIcon fontSize="small" />} iconPosition="start" />
              </Tabs>
            )}

            {/* ─── Local Login Tab ─── */}
            {(activeTab === 0 || !adEnabled) && (
              <form onSubmit={handleLocalSubmit}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                />
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={localPassword}
                  onChange={(e) => setLocalPassword(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ mt: 3, mb: 2, py: 1.5 }}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Don't have an account?{' '}
                    <Button size="small" onClick={() => navigate('/register')} disabled={loading}>
                      Register
                    </Button>
                  </Typography>
                </Box>
              </form>
            )}

            {/* ─── AD Login Tab ─── */}
            {activeTab === 1 && adEnabled && (
              <form onSubmit={handleAdSubmit}>
                <TextField
                  fullWidth
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                  helperText="Your corporate Active Directory username"
                />
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={adPassword}
                  onChange={(e) => setAdPassword(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ mt: 3, mb: 2, py: 1.5 }}
                  startIcon={<AdIcon />}
                >
                  {loading ? 'Signing In...' : 'Sign in with AD'}
                </Button>
                <Box sx={{ mt: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Uses your corporate Active Directory account
                  </Typography>
                </Box>
              </form>
            )}
          </CardContent>
        </Card>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="white" sx={{ opacity: 0.8 }}>
            Supports AWS, Azure, GCP, DigitalOcean, and Linode
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;
