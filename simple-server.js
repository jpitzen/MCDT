// Simple health-check server for testing pod deployment
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'zl-mcdt-backend',
    version: 'v1',
    message: 'Pod is running successfully'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'ZL-MCDT Backend API',
    version: 'v1',
    endpoints: {
      health: '/health'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
});
