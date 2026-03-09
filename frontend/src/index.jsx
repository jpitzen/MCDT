import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { ThemePreferencesProvider, useThemePreferences } from './contexts/ThemeContext';
import { setupAxiosInterceptors } from './utils/apiErrorHandler';

// Setup global axios error handling and retry logic
setupAxiosInterceptors();

// Inner component that consumes the theme from ThemePreferencesProvider
function ThemedApp() {
  const { theme, effectiveMode } = useThemePreferences();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AuthProvider>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={effectiveMode === 'dark' ? 'dark' : 'light'}
      />
    </ThemeProvider>
  );
}

function AppWithTheme() {
  return (
    <ThemePreferencesProvider>
      <ThemedApp />
    </ThemePreferencesProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppWithTheme />
  </React.StrictMode>
);
