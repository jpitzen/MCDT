import axios from 'axios';

/**
 * Global API error handler with retry logic and user-friendly messages
 */

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504]; // Retryable errors

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
const getRetryDelay = (retryCount) => {
  return RETRY_DELAY * Math.pow(2, retryCount - 1); // 1s, 2s, 4s
};

/**
 * Determine if error is retryable
 */
const isRetryableError = (error) => {
  if (!error.response) {
    // Network errors (no response) are retryable
    return true;
  }
  
  // Check if status code is in retryable list
  return RETRY_STATUS_CODES.includes(error.response.status);
};

/**
 * Get user-friendly error message based on error type
 */
export const getUserFriendlyMessage = (error) => {
  // Network error (no response from server)
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please check your connection and try again.';
    }
    return 'Unable to connect to server. Please check your internet connection.';
  }

  // HTTP status code errors
  const status = error.response.status;
  const data = error.response.data;

  switch (status) {
    case 400:
      return data?.message || 'Invalid request. Please check your input.';
    case 401:
      return 'Session expired. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return data?.message || 'Resource not found.';
    case 408:
      return 'Request timed out. Please try again.';
    case 409:
      return data?.message || 'Conflict with existing data.';
    case 422:
      return data?.message || 'Validation failed. Please check your input.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Our team has been notified.';
    case 502:
      return 'Server temporarily unavailable. Please try again shortly.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    case 504:
      return 'Server response timeout. Please try again.';
    default:
      return data?.message || `An error occurred (${status}). Please try again.`;
  }
};

/**
 * Setup axios interceptors for global error handling
 */
export const setupAxiosInterceptors = () => {
  // Request interceptor (add auth token, etc.)
  axios.interceptors.request.use(
    (config) => {
      // Add auth token if available
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Initialize retry count
      config.retryCount = config.retryCount || 0;

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor (handle errors, retry logic)
  axios.interceptors.response.use(
    (response) => {
      // Success response, return as-is
      return response;
    },
    async (error) => {
      const config = error.config;

      // If no config, reject immediately
      if (!config) {
        return Promise.reject(error);
      }

      // Check if we should retry
      if (isRetryableError(error) && config.retryCount < MAX_RETRIES) {
        config.retryCount += 1;
        
        const delay = getRetryDelay(config.retryCount);
        console.log(
          `Retrying request (${config.retryCount}/${MAX_RETRIES}) after ${delay}ms:`,
          config.url
        );

        // Wait before retrying
        await sleep(delay);

        // Retry the request
        return axios(config);
      }

      // Handle 401 Unauthorized (session expired)
      if (error.response?.status === 401) {
        // Clear auth token
        localStorage.removeItem('authToken');
        
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
      }

      // Log error to console (can extend to send to backend)
      console.error('API Error:', {
        url: config.url,
        method: config.method,
        status: error.response?.status,
        message: getUserFriendlyMessage(error),
        retries: config.retryCount,
      });

      // Attach user-friendly message to error
      error.userMessage = getUserFriendlyMessage(error);

      return Promise.reject(error);
    }
  );
};

/**
 * Handle API error in components (display to user)
 */
export const handleApiError = (error, setError) => {
  const message = error.userMessage || getUserFriendlyMessage(error);
  
  if (setError) {
    setError(message);
  }
  
  return message;
};

/**
 * Create axios instance with custom config
 */
export const createApiClient = (baseURL = '/api') => {
  const instance = axios.create({
    baseURL,
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Apply interceptors to this instance
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      config.retryCount = config.retryCount || 0;
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;
      if (!config) return Promise.reject(error);

      if (isRetryableError(error) && config.retryCount < MAX_RETRIES) {
        config.retryCount += 1;
        await sleep(getRetryDelay(config.retryCount));
        return instance(config);
      }

      if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
      }

      error.userMessage = getUserFriendlyMessage(error);
      return Promise.reject(error);
    }
  );

  return instance;
};

export default {
  setupAxiosInterceptors,
  getUserFriendlyMessage,
  handleApiError,
  createApiClient,
};
