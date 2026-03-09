import React from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

/**
 * 500 Server Error page
 */
const ServerError = () => {
  const navigate = useNavigate();

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            textAlign: 'center',
            backgroundColor: 'background.paper',
          }}
        >
          <ReportProblemIcon
            sx={{
              fontSize: 120,
              color: 'error.main',
              mb: 3,
            }}
          />
          
          <Typography variant="h1" sx={{ fontSize: '4rem', fontWeight: 'bold', mb: 2 }}>
            500
          </Typography>
          
          <Typography variant="h4" gutterBottom color="error">
            Server Error
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
            Something went wrong on our end. Our team has been notified and is working to fix the issue.
            Please try again in a few moments.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleReload}
              size="large"
            >
              Try Again
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate('/')}
              size="large"
            >
              Go to Home
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary">
            If the problem persists, please contact support.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default ServerError;
