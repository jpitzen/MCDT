/**
 * useCredentials Hook
 * 
 * Handles all credential management logic including:
 * - Fetching credentials list
 * - Validating credentials
 * - Creating/updating credentials
 * - Testing cloud connectivity
 * 
 * Migrated from CredentialsManager.jsx and CloudDeploymentToolkit.jsx
 */

import { useState, useCallback } from 'react';
import api from '../../../services/api';

export function useCredentials() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState({});
  const [error, setError] = useState(null);

  /**
   * Fetch all credentials for the current user
   */
  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/credentials');
      const creds = response.data.data?.credentials || response.data.credentials || [];
      setCredentials(creds);
      return creds;
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch credentials';
      setError(errorMsg);
      console.error('Failed to fetch credentials:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Validate a specific credential
   * Tests if the credential can authenticate with the cloud provider
   */
  const validateCredential = useCallback(async (credentialId) => {
    setValidating(prev => ({ ...prev, [credentialId]: true }));
    
    try {
      const response = await api.post(`/credentials/${credentialId}/validate`);
      const result = {
        success: true,
        isValid: response.data.data?.isValid ?? response.data.isValid ?? true,
        message: response.data.message || 'Credentials validated successfully',
        details: response.data.data,
      };
      
      // Update credential status in list
      setCredentials(prev => prev.map(cred => 
        cred.id === credentialId 
          ? { ...cred, isValid: result.isValid, lastValidated: new Date().toISOString() }
          : cred
      ));
      
      return result;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Validation failed';
      return {
        success: false,
        isValid: false,
        message: errorMsg,
        details: err.response?.data?.details,
      };
    } finally {
      setValidating(prev => ({ ...prev, [credentialId]: false }));
    }
  }, []);

  /**
   * Create a new credential
   */
  const createCredential = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/credentials', data);
      const newCred = response.data.data || response.data;
      setCredentials(prev => [...prev, newCred]);
      return { success: true, credential: newCred };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to create credential';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update an existing credential
   */
  const updateCredential = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.put(`/credentials/${id}`, data);
      const updatedCred = response.data.data || response.data;
      setCredentials(prev => prev.map(cred => 
        cred.id === id ? { ...cred, ...updatedCred } : cred
      ));
      return { success: true, credential: updatedCred };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to update credential';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete a credential
   */
  const deleteCredential = useCallback(async (id) => {
    try {
      await api.delete(`/credentials/${id}`);
      setCredentials(prev => prev.filter(cred => cred.id !== id));
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to delete credential';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  /**
   * Test connectivity to cloud provider
   */
  const testConnectivity = useCallback(async (credentialId) => {
    try {
      const response = await api.post(`/credentials/${credentialId}/test-connectivity`);
      return {
        success: true,
        connected: response.data.data?.connected ?? true,
        latency: response.data.data?.latency,
        services: response.data.data?.services || [],
      };
    } catch (err) {
      return {
        success: false,
        connected: false,
        error: err.response?.data?.message || err.message,
      };
    }
  }, []);

  /**
   * Get credentials grouped by provider
   */
  const getCredentialsByProvider = useCallback(() => {
    const grouped = {};
    credentials.forEach(cred => {
      const provider = (cred.cloudProvider || 'unknown').toLowerCase();
      if (!grouped[provider]) {
        grouped[provider] = [];
      }
      grouped[provider].push(cred);
    });
    return grouped;
  }, [credentials]);

  /**
   * Get valid credentials only
   */
  const getValidCredentials = useCallback(() => {
    return credentials.filter(cred => cred.isValid !== false);
  }, [credentials]);

  return {
    // State
    credentials,
    loading,
    validating,
    error,
    
    // Actions
    fetchCredentials,
    validateCredential,
    createCredential,
    updateCredential,
    deleteCredential,
    testConnectivity,
    
    // Helpers
    getCredentialsByProvider,
    getValidCredentials,
  };
}

export default useCredentials;
