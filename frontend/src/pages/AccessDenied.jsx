import React from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={3}
        sx={{
          mt: 8,
          p: 6,
          textAlign: 'center',
          borderRadius: 2,
        }}
      >
        <LockIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          You don't have permission to view this page. Contact your administrator
          if you believe this is an error.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="contained" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AccessDenied;
