import React from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchOffIcon from '@mui/icons-material/SearchOff';

/**
 * 404 Not Found page
 */
const NotFound = () => {
  const navigate = useNavigate();

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
          <SearchOffIcon
            sx={{
              fontSize: 120,
              color: 'text.secondary',
              mb: 3,
            }}
          />
          
          <Typography variant="h1" sx={{ fontSize: '4rem', fontWeight: 'bold', mb: 2 }}>
            404
          </Typography>
          
          <Typography variant="h4" gutterBottom color="text.primary">
            Page Not Found
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
            The page you're looking for doesn't exist. It may have been moved or deleted.
            Check the URL or return to the home page.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/')}
              size="large"
            >
              Go to Home
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate(-1)}
              size="large"
            >
              Go Back
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFound;
