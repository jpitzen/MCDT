import { useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';

/**
 * React Hook for WebSocket connection to deployment real-time updates
 * Manages Socket.IO connection lifecycle and deployment event handling
 * 
 * @param {string} deploymentId - The deployment ID to monitor
 * @param {object} options - Configuration options
 * @param {string} options.url - WebSocket server URL (defaults to API server)
 * @param {function} options.onLog - Callback for deployment logs
 * @param {function} options.onPhaseUpdate - Callback for phase transitions
 * @param {function} options.onProgressUpdate - Callback for progress changes
 * @param {function} options.onCompletion - Callback for deployment completion
 * @param {function} options.onError - Callback for deployment errors
 * @param {function} options.onFailure - Callback for deployment failure
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * 
 * @returns {object} Socket state and control methods
 */
export const useDeploymentSocket = (deploymentId, options = {}) => {
  const {
    url = `http://${window.location.hostname}:5000`,
    onLog,
    onPhaseUpdate,
    onProgressUpdate,
    onCompletion,
    onError,
    onFailure,
    autoConnect = true,
  } = options;

  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [logs, setLogs] = useState([]);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [progress, setProgress] = useState(0);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [outputs, setOutputs] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000;

  /**
   * Initialize WebSocket connection
   */
  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (socketRef.current?.connected || isConnectingRef.current) {
      console.log('Already connected or connecting, skipping connection attempt');
      return;
    }

    // Check if max reconnection attempts reached
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Please refresh the page.');
      setStatus('error');
      setConnectionError('Maximum reconnection attempts exceeded. Please refresh the page.');
      return;
    }

    isConnectingRef.current = true;
    reconnectAttemptsRef.current += 1;
    setStatus('connecting');
    setConnectionError(null);

    console.log(`Connection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);

    try {
      // Clean up existing socket if any
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      socketRef.current = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: false, // We'll handle reconnection manually
        query: {
          deploymentId,
        },
      });

      /**
       * Handle successful connection
       */
      socketRef.current.on('connect', () => {
        console.log('WebSocket connected:', socketRef.current.id);
        setStatus('connected');
        setConnectionError(null);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0; // Reset counter on successful connection

        // Subscribe to deployment events
        socketRef.current.emit('subscribe-deployment', deploymentId, (ack) => {
          if (ack?.success) {
            console.log('Successfully subscribed to deployment:', deploymentId);
          } else {
            console.warn('Failed to subscribe to deployment:', ack?.error);
          }
        });
      });

      /**
       * Handle disconnection
       */
      socketRef.current.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setStatus('disconnected');
        isConnectingRef.current = false;
        
        // Only auto-reconnect if server initiated the disconnect
        if (reason === 'io server disconnect' || reason === 'transport close') {
          scheduleReconnect();
        }
      });

      /**
       * Handle connection errors
       */
      socketRef.current.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error.message);
        setStatus('error');
        setConnectionError(error.message);
        isConnectingRef.current = false;
        
        // Schedule reconnect with exponential backoff
        scheduleReconnect();
      });

      /**
       * Handle deployment logs
       */
      socketRef.current.on('deployment:log', (event) => {
        console.log('Deployment log received:', event);
        const { eventType, timestamp, data: logData = {} } = event;
        const logEntry = {
          type: logData.type || eventType || 'info',
          message: logData.message || logData,
          timestamp: timestamp || new Date(),
          data: logData,
        };
        setLogs((prev) => [...prev, logEntry]);
        if (onLog) onLog(logEntry);
      });

      /**
       * Handle phase transitions
       */
      socketRef.current.on('deployment:phase-update', (event) => {
        console.log('Phase update received:', event);
        const { data = {} } = event;
        const { phase, progress: newProgress, fromPhase, ...metadata } = data;
        
        if (phase) {
          setCurrentPhase(phase);
        }
        if (newProgress !== undefined) {
          setProgress(newProgress);
        }
        if (onPhaseUpdate) onPhaseUpdate({ phase, progress: newProgress, fromPhase, ...metadata });
      });

      /**
       * Handle progress updates
       */
      socketRef.current.on('deployment:progress-update', (event) => {
        console.log('Progress update received:', event);
        const { data = {} } = event;
        const { progress: newProgress, phase } = data;
        
        if (newProgress !== undefined) {
          setProgress(newProgress);
        }
        if (phase) {
          setCurrentPhase(phase);
        }
        if (onProgressUpdate) onProgressUpdate({ progress: newProgress, phase, ...data });
      });

      /**
       * Handle deployment completion
       */
      socketRef.current.on('deployment:completion', (event) => {
        console.log('Deployment completed:', event);
        const { data = {} } = event;
        const { outputs: results = {}, results: legacyResults, ...metadata } = data;
        const finalOutputs = results || legacyResults || {};
        setDeploymentStatus('completed');
        setOutputs(finalOutputs);
        setProgress(100);
        if (onCompletion) onCompletion({ results: finalOutputs, ...metadata });
      });

      /**
       * Handle Terraform output
       */
      socketRef.current.on('deployment:terraform-output', (event) => {
        console.log('Terraform output received:', event);
        const { data = {} } = event;
        const { output = {} } = data;
        setOutputs((prev) => ({ ...prev, ...output }));
      });

      /**
       * Handle deployment errors
       */
      socketRef.current.on('deployment:error', (event) => {
        console.error('Deployment error:', event);
        const { data = {} } = event;
        const { message, error, errorMessage } = data;
        setLogs((prev) => [
          ...prev,
          {
            type: 'error',
            message: message || errorMessage || error || 'Unknown error',
            timestamp: event.timestamp || new Date(),
            data,
          },
        ]);
        if (onError) onError(data);
      });

      /**
       * Handle deployment failure
       */
      socketRef.current.on('deployment:failure', (event) => {
        console.error('Deployment failed:', event);
        const { data = {} } = event;
        const { errorMessage, message, error, ...metadata } = data;
        const finalErrorMessage = errorMessage || message || error || 'Deployment failed';
        setDeploymentStatus('failed');
        setLogs((prev) => [
          ...prev,
          {
            type: 'failure',
            message: finalErrorMessage,
            timestamp: event.timestamp || new Date(),
            data: metadata,
          },
        ]);
        if (onFailure) onFailure({ errorMessage: finalErrorMessage, ...metadata });
      });

      /**
       * Handle rollback completion
       */
      socketRef.current.on('deployment:rollback-completed', (event) => {
        console.log('Rollback completed:', event);
        const { data = {} } = event;
        setDeploymentStatus('rolled_back');
        setLogs((prev) => [
          ...prev,
          {
            type: 'rollback-completed',
            message: 'Deployment rolled back',
            timestamp: event.timestamp || new Date(),
            data,
          },
        ]);
      });

      /**
       * Handle server stats request
       */
      socketRef.current.on('server:stats', (stats) => {
        console.log('Server stats received:', stats);
      });
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setStatus('error');
      setConnectionError(error.message);
      isConnectingRef.current = false;
      scheduleReconnect();
    }
  }, [deploymentId, url, onLog, onPhaseUpdate, onProgressUpdate, onCompletion, onError, onFailure]);

  /**
   * Schedule automatic reconnection with exponential backoff
   */
  const scheduleReconnect = useCallback(() => {
    // Clear existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Check if max attempts reached
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    // Calculate exponential backoff delay
    const delay = Math.min(
      baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
      30000 // Max 30 seconds
    );

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      if (!socketRef.current?.connected && !isConnectingRef.current) {
        connect();
      }
    }, delay);
  }, [connect, baseReconnectDelay, maxReconnectAttempts]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    console.log('Disconnecting WebSocket');
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Reset state
    isConnectingRef.current = false;
    reconnectAttemptsRef.current = 0;

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setStatus('disconnected');
  }, []);

  /**
   * Get current deployment status
   */
  const getDeploymentStatus = useCallback((callback) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('get-status', deploymentId, (response) => {
        // Update local state with the status from the server
        if (response?.success && response?.status) {
          const serverStatus = response.status;
          
          if (serverStatus.progress !== undefined && serverStatus.progress !== null) {
            setProgress(serverStatus.progress);
          }
          
          if (serverStatus.deploymentPhase) {
            setCurrentPhase(serverStatus.deploymentPhase);
          }
          
          if (serverStatus.status) {
            // Map deployment status to our state
            if (serverStatus.status === 'completed') {
              setDeploymentStatus('completed');
            } else if (serverStatus.status === 'failed') {
              setDeploymentStatus('failed');
            } else if (serverStatus.status === 'rolled_back') {
              setDeploymentStatus('rolled_back');
            }
          }
        }
        
        if (callback) callback(response);
      });
    }
  }, [deploymentId]);

  /**
   * Get logs for deployment
   */
  const getDeploymentLogs = useCallback((callback) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('get-logs', { deploymentId }, (response) => {
        if (callback) callback(response);
      });
    }
  }, [deploymentId]);

  /**
   * Send ping to server
   */
  const ping = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('ping', (response) => {
        console.log('Ping response:', response);
        return response;
      });
    }
  }, []);

  /**
   * Unsubscribe from deployment events
   */
  const unsubscribe = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('unsubscribe-deployment', { deploymentId }, (ack) => {
        if (ack?.success) {
          console.log('Successfully unsubscribed from deployment:', deploymentId);
        }
      });
    }
  }, [deploymentId]);

  /**
   * Effect: Auto-connect on mount
   */
  useEffect(() => {
    if (autoConnect && deploymentId) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deploymentId, autoConnect]);

  /**
   * Return hook state and methods
   */
  return {
    // State
    status,
    logs,
    currentPhase,
    progress,
    deploymentStatus,
    outputs,
    connectionError,
    isConnected: status === 'connected',

    // Methods
    connect,
    disconnect,
    getDeploymentStatus,
    getDeploymentLogs,
    ping,
    unsubscribe,
  };
};

/**
 * Alternative export: useDeploymentSocket as default
 * Usage: import useDeploymentSocket from './hooks/useDeploymentSocket';
 */
export default useDeploymentSocket;
