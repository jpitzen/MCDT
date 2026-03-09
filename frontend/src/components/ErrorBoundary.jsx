import React from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * Global Error Boundary to catch JavaScript errors in React component tree
 * Displays user-friendly error page and logs error details
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (can extend to send to backend)
    console.error('ErrorBoundary caught error:', error, errorInfo);
    
    // Store error details in state
    this.setState({
      error,
      errorInfo,
    });

    // Optional: Send to backend for logging
    this.logErrorToBackend(error, errorInfo);
  }

  logErrorToBackend = (error, errorInfo) => {
    try {
      // Send error to backend API (optional)
      fetch('/api/logs/frontend-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.toString(),
          stack: error.stack,
          componentStack: errorInfo?.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(err => {
        // Silently fail if logging fails
        console.error('Failed to log error to backend:', err);
      });
    } catch (err) {
      // Don't let error logging break the error boundary
      console.error('Error in logErrorToBackend:', err);
    }
  };

  handleReload = () => {
    // Reload the page to reset state
    window.location.reload();
  };

  handleGoHome = () => {
    // Navigate to home page
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: 'background.paper',
            }}
          >
            <ErrorOutlineIcon
              sx={{
                fontSize: 80,
                color: 'error.main',
                mb: 2,
              }}
            />
            
            <Typography variant="h4" gutterBottom color="error">
              Oops! Something went wrong
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We encountered an unexpected error. Don't worry, your data is safe.
              Try reloading the page or returning to the home page.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 4 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={this.handleGoHome}
              >
                Go to Home
              </Button>
            </Box>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box
                sx={{
                  mt: 4,
                  p: 2,
                  backgroundColor: 'grey.900',
                  borderRadius: 1,
                  textAlign: 'left',
                  maxHeight: 400,
                  overflow: 'auto',
                }}
              >
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    color: 'error.light',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  <strong>Error:</strong> {this.state.error.toString()}
                  {'\n\n'}
                  <strong>Stack:</strong>
                  {'\n'}
                  {this.state.error.stack}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {'\n\n'}
                      <strong>Component Stack:</strong>
                      {'\n'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </Typography>
              </Box>
            )}

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 3, display: 'block' }}
            >
              Error ID: {Date.now().toString(36)}
            </Typography>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
