/**
 * useWebSocket Hook
 * Manages WebSocket connections for real-time deployment updates
 * 
 * Features:
 * - Automatic connection/reconnection
 * - Deployment subscription management
 * - Event handling (logs, phase updates, progress, completion, errors)
 * - Connection status tracking
 * - Cleanup on unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const useWebSocket = (deploymentId, options = {}) => {
  const {
    autoConnect = true,
    onLog = null,
    onPhaseUpdate = null,
    onProgressUpdate = null,
    onCompleted = null,
    onFailed = null,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [phase, setPhase] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(null);

  const socketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  /**
   * Initialize WebSocket connection
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxReconnectAttempts,
        timeout: 10000,
      });

      // Connection event handlers
      socket.on('connect', () => {
        console.log('[WebSocket] Connected', { socketId: socket.id });
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        // Auto-subscribe if deploymentId provided
        if (deploymentId) {
          subscribe(deploymentId);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected', { reason });
        setIsConnected(false);
        setIsSubscribed(false);
      });

      socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error', error);
        reconnectAttemptsRef.current += 1;
        
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('Failed to connect after multiple attempts');
        } else {
          setConnectionError(`Connection error (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
        }
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('[WebSocket] Reconnected', { attemptNumber });
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
      });

      socketRef.current = socket;

    } catch (error) {
      console.error('[WebSocket] Failed to initialize', error);
      setConnectionError('Failed to initialize WebSocket connection');
    }
  }, [deploymentId]);

  /**
   * Subscribe to deployment updates
   */
  const subscribe = useCallback((targetDeploymentId) => {
    if (!socketRef.current?.connected) {
      console.warn('[WebSocket] Cannot subscribe - not connected');
      return;
    }

    const id = targetDeploymentId || deploymentId;
    if (!id) {
      console.warn('[WebSocket] Cannot subscribe - no deployment ID');
      return;
    }

    console.log('[WebSocket] Subscribing to deployment', { deploymentId: id });

    socketRef.current.emit('subscribe-deployment', id, (response) => {
      if (response.success) {
        console.log('[WebSocket] Subscribed successfully', response);
        setIsSubscribed(true);

        // Setup event listeners for this deployment
        setupDeploymentListeners(id);

        // Request current status
        socketRef.current.emit('get-status', id, (statusResponse) => {
          if (statusResponse.success) {
            setStatus(statusResponse.status);
            setPhase(statusResponse.status.deploymentPhase);
            setProgress(statusResponse.status.progress || 0);
          }
        });

        // Request recent logs
        socketRef.current.emit('get-recent-logs', id, 50, (logsResponse) => {
          if (logsResponse.success) {
            setLogs(logsResponse.logs || []);
          }
        });
      } else {
        console.error('[WebSocket] Subscription failed', response);
        setConnectionError(`Subscription failed: ${response.error}`);
      }
    });
  }, [deploymentId]);

  /**
   * Unsubscribe from deployment updates
   */
  const unsubscribe = useCallback((targetDeploymentId) => {
    if (!socketRef.current?.connected) {
      return;
    }

    const id = targetDeploymentId || deploymentId;
    if (!id) {
      return;
    }

    console.log('[WebSocket] Unsubscribing from deployment', { deploymentId: id });

    socketRef.current.emit('unsubscribe-deployment', id, (response) => {
      if (response.success) {
        console.log('[WebSocket] Unsubscribed successfully');
        setIsSubscribed(false);
        removeDeploymentListeners(id);
      }
    });
  }, [deploymentId]);

  /**
   * Setup event listeners for deployment
   */
  const setupDeploymentListeners = useCallback((id) => {
    const socket = socketRef.current;
    if (!socket) return;

    // Log event
    const handleLog = (event) => {
      console.log('[WebSocket] Log event', event);
      const logEntry = {
        ...event.data,
        timestamp: new Date(event.timestamp),
      };
      setLogs((prevLogs) => [...prevLogs, logEntry]);
      
      if (onLog) onLog(logEntry);
    };

    // Phase update event
    const handlePhaseUpdate = (event) => {
      console.log('[WebSocket] Phase update', event);
      const newPhase = event.data.phase;
      setPhase(newPhase);
      
      if (onPhaseUpdate) onPhaseUpdate(newPhase, event.data);
    };

    // Progress update event
    const handleProgressUpdate = (event) => {
      console.log('[WebSocket] Progress update', event);
      const newProgress = event.data.progress;
      setProgress(newProgress);
      
      if (onProgressUpdate) onProgressUpdate(newProgress, event.data);
    };

    // Completion event
    const handleCompleted = (event) => {
      console.log('[WebSocket] Deployment completed', event);
      setPhase('completed');
      setProgress(100);
      setStatus({ ...status, status: 'completed' });
      
      if (onCompleted) onCompleted(event.data.outputs);
    };

    // Failure event
    const handleFailed = (event) => {
      console.error('[WebSocket] Deployment failed', event);
      setPhase('failed');
      setStatus({ ...status, status: 'failed', errorMessage: event.data.errorMessage });
      
      if (onFailed) onFailed(event.data.errorMessage, event.data);
    };

    // Attach listeners
    socket.on('deployment:log', handleLog);
    socket.on('deployment:phase-update', handlePhaseUpdate);
    socket.on('deployment:progress-update', handleProgressUpdate);
    socket.on('deployment:completed', handleCompleted);
    socket.on('deployment:failed', handleFailed);

    // Store handler references for cleanup
    socket._deploymentHandlers = {
      handleLog,
      handlePhaseUpdate,
      handleProgressUpdate,
      handleCompleted,
      handleFailed,
    };
  }, [onLog, onPhaseUpdate, onProgressUpdate, onCompleted, onFailed, status]);

  /**
   * Remove deployment event listeners
   */
  const removeDeploymentListeners = useCallback((id) => {
    const socket = socketRef.current;
    if (!socket || !socket._deploymentHandlers) return;

    const {
      handleLog,
      handlePhaseUpdate,
      handleProgressUpdate,
      handleCompleted,
      handleFailed,
    } = socket._deploymentHandlers;

    socket.off('deployment:log', handleLog);
    socket.off('deployment:phase-update', handlePhaseUpdate);
    socket.off('deployment:progress-update', handleProgressUpdate);
    socket.off('deployment:completed', handleCompleted);
    socket.off('deployment:failed', handleFailed);

    delete socket._deploymentHandlers;
  }, []);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      if (deploymentId) {
        unsubscribe(deploymentId);
      }
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsSubscribed(false);
  }, [deploymentId, unsubscribe]);

  /**
   * Clear logs
   */
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  /**
   * Auto-connect on mount if enabled
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  /**
   * Re-subscribe if deploymentId changes
   */
  useEffect(() => {
    if (isConnected && deploymentId && !isSubscribed) {
      subscribe(deploymentId);
    }

    return () => {
      if (isSubscribed && deploymentId) {
        unsubscribe(deploymentId);
      }
    };
  }, [deploymentId, isConnected, isSubscribed, subscribe, unsubscribe]);

  return {
    // Connection state
    isConnected,
    isSubscribed,
    connectionError,

    // Deployment state
    logs,
    phase,
    progress,
    status,

    // Actions
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    clearLogs,

    // Socket reference (for advanced use)
    socket: socketRef.current,
  };
};

export default useWebSocket;
