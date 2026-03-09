import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';

export default function DeploymentWizard() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Deployment Wizard
        </Typography>
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="body1">
            Single cloud deployment wizard coming soon...
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
