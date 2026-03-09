import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Collapse,
  Card,
  CardContent,
  Divider,
  Grid,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as ExecuteIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Storage as DatabaseIcon,
  Cloud as CloudIcon,
  Refresh as RefreshIcon,
  CloudQueue as CloudDiscoveryIcon,
  Key as KeyIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import api from '../services/api';

const DatabaseQueryInterface = () => {
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDatabases, setFetchingDatabases] = useState(true);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = All, 1 = Deployed, 2 = Cloud

  // Database credentials dialog state
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [credentialForm, setCredentialForm] = useState({
    name: '',
    username: '',
    password: '',
    host: '',
    port: 5432,
    databaseName: 'postgres',
    engine: 'postgres',
    sslEnabled: true,
  });
  const [savingCredential, setSavingCredential] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);

  // Load databases on mount
  useEffect(() => {
    fetchAllDatabases();
    loadQueryHistory();
  }, []);

  const fetchAllDatabases = async () => {
    try {
      setFetchingDatabases(true);
      setError(null);
      
      // Fetch from infrastructure discovery API (includes both deployed and cloud databases)
      const response = await api.get('/infrastructure/databases');
      const allDatabases = response.data.data.databases || [];
      
      setDatabases(allDatabases);
    } catch (err) {
      console.error('Failed to fetch databases:', err);
      // Fallback to deployment-only mode if infrastructure API fails
      try {
        const deploymentResponse = await api.get('/deployments');
        const dbDeployments = deploymentResponse.data.data.deployments.filter(
          d => d.status === 'completed' && d.configuration?.enableRDS
        );
        
        const fallbackDatabases = dbDeployments.map(d => ({
          source: 'deployment',
          sourceId: d.id,
          sourceName: d.clusterName,
          id: `deployment-${d.id}`,
          name: d.configuration?.dbName || 'zlaws',
          engine: d.configuration?.dbEngine || 'postgres',
          status: 'deployed',
          deploymentId: d.id,
        }));
        
        setDatabases(fallbackDatabases);
        setError('Cloud database discovery unavailable. Showing deployed databases only.');
      } catch (fallbackErr) {
        setError('Failed to load databases');
      }
    } finally {
      setFetchingDatabases(false);
    }
  };

  const loadQueryHistory = () => {
    const stored = localStorage.getItem('sqlQueryHistory');
    if (stored) {
      try {
        setQueryHistory(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse query history:', e);
      }
    }
  };

  const saveQueryToHistory = (query, database, result) => {
    const historyItem = {
      id: Date.now(),
      query,
      databaseId: database.id,
      databaseName: database.name,
      sourceName: database.sourceName,
      timestamp: new Date().toISOString(),
      rowCount: result.rowCount,
      executionTime: result.executionTime,
      success: true,
    };

    const newHistory = [historyItem, ...queryHistory].slice(0, 20); // Keep last 20
    setQueryHistory(newHistory);
    localStorage.setItem('sqlQueryHistory', JSON.stringify(newHistory));
  };

  const executeQuery = async () => {
    if (!selectedDatabase) {
      setError('Please select a database');
      return;
    }

    if (!query.trim()) {
      setError('Please enter a SQL query');
      return;
    }

    const database = databases.find(d => d.id === selectedDatabase);
    if (!database) {
      setError('Selected database not found');
      return;
    }

    // Check if database has credentials
    if (!database.hasCredentials && !database.deploymentId) {
      setError('No database credentials configured. Please add credentials first.');
      openCredentialDialog(database);
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setExecutionTime(null);

    try {
      let response;
      
      if (database.hasCredentials && database.databaseCredentialId) {
        // Use the new database credentials API for query execution
        response = await api.post(`/database-credentials/${database.databaseCredentialId}/query`, {
          query: query.trim(),
        });
      } else if (database.source === 'deployment' && database.deploymentId) {
        // Fallback to existing deployment SQL scripts API
        response = await api.post(`/deployments/${database.deploymentId}/sql-scripts/execute-query`, {
          query: query.trim(),
        });
      } else {
        throw new Error('No credentials available. Please add database credentials first.');
      }

      // Handle nested response structure from our API
      const resultData = response.data.data || response.data;
      setResults(resultData);
      setExecutionTime(resultData.executionTime);
      saveQueryToHistory(query.trim(), database, resultData);
      setError(null);
    } catch (err) {
      console.error('Query execution failed:', err);
      // Handle error - ensure it's a string, not an object
      const errorData = err.response?.data;
      let errorMessage = 'Query execution failed';
      if (typeof errorData?.details === 'string') {
        errorMessage = errorData.details;
      } else if (typeof errorData?.error === 'string') {
        errorMessage = errorData.error;
      } else if (typeof errorData?.message === 'string') {
        errorMessage = errorData.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    // Ctrl+Enter to execute
    if (e.ctrlKey && e.key === 'Enter') {
      executeQuery();
    }
  };

  const loadQueryFromHistory = (historyItem) => {
    setQuery(historyItem.query);
    setSelectedDatabase(historyItem.databaseId);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setQueryHistory([]);
    localStorage.removeItem('sqlQueryHistory');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getDbEngineInfo = () => {
    if (!selectedDatabase) return null;
    const database = databases.find(d => d.id === selectedDatabase);
    return database?.engine || 'postgres';
  };

  // Open credential dialog for a database
  const openCredentialDialog = (database) => {
    setCredentialForm({
      name: `${database.name || database.instanceId} credentials`,
      username: database.username || 'admin',
      password: '',
      host: database.host || '',
      port: database.port || 5432,
      databaseName: database.name || 'postgres',
      engine: database.engine || 'postgres',
      sslEnabled: true,
      sourceType: database.source,
      sourceId: database.sourceId,
      rdsInstanceId: database.instanceId,
    });
    setConnectionTestResult(null);
    setCredentialDialogOpen(true);
  };

  // Test database connection
  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    
    try {
      const response = await api.post('/database-credentials/test-direct', {
        engine: credentialForm.engine,
        host: credentialForm.host,
        port: credentialForm.port,
        databaseName: credentialForm.databaseName,
        username: credentialForm.username,
        password: credentialForm.password,
        sslEnabled: credentialForm.sslEnabled,
      });
      
      setConnectionTestResult({ 
        success: true, 
        message: 'Connection successful!',
        version: response.data.data?.version,
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Connection failed';
      setConnectionTestResult({ success: false, message: errorMsg });
    } finally {
      setTestingConnection(false);
    }
  };

  // Save database credential
  const saveCredential = async () => {
    setSavingCredential(true);
    
    try {
      await api.post('/database-credentials', credentialForm);
      setCredentialDialogOpen(false);
      setError(null);
      // Refresh databases to show new credential status
      fetchAllDatabases();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save credential';
      setError(errorMsg);
    } finally {
      setSavingCredential(false);
    }
  };

  const selectedDatabaseObj = databases.find(d => d.id === selectedDatabase);

  // Filter databases based on active tab
  const filteredDatabases = databases.filter(db => {
    if (activeTab === 0) return true; // All
    if (activeTab === 1) return db.source === 'deployment'; // Deployed
    if (activeTab === 2) return db.source === 'cloud'; // Cloud
    return true;
  });

  const getSourceIcon = (source) => {
    return source === 'cloud' ? <CloudIcon fontSize="small" /> : <DatabaseIcon fontSize="small" />;
  };

  const getStatusColor = (status) => {
    if (status === 'available' || status === 'deployed') return 'success';
    if (status === 'creating' || status === 'modifying') return 'warning';
    return 'default';
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DatabaseIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              SQL Query Interface
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Execute SQL queries against deployed and cloud databases
            </Typography>
          </Box>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchAllDatabases}
          disabled={fetchingDatabases}
        >
          Refresh Databases
        </Button>
      </Box>

      {/* Database Selector with Tabs */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label={`All Databases (${databases.length})`} />
            <Tab 
              label={`Deployed (${databases.filter(d => d.source === 'deployment').length})`}
              icon={<DatabaseIcon fontSize="small" />}
              iconPosition="start"
            />
            <Tab 
              label={`Cloud Discovered (${databases.filter(d => d.source === 'cloud').length})`}
              icon={<CloudDiscoveryIcon fontSize="small" />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <FormControl fullWidth disabled={fetchingDatabases}>
              <InputLabel>Select Database</InputLabel>
              <Select
                value={selectedDatabase}
                onChange={(e) => setSelectedDatabase(e.target.value)}
                label="Select Database"
              >
                {filteredDatabases.length === 0 && !fetchingDatabases && (
                  <MenuItem value="" disabled>
                    No databases found
                  </MenuItem>
                )}
                {filteredDatabases.map((database) => (
                  <MenuItem key={database.id} value={database.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      {getSourceIcon(database.source)}
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography component="span">{database.name || database.instanceId || 'Unknown'}</Typography>
                          <Chip
                            size="small"
                            label={database.engine || 'unknown'}
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={database.status || 'unknown'}
                            color={getStatusColor(database.status)}
                            variant="outlined"
                          />
                          {database.hasCredentials ? (
                            <Tooltip title="Credentials configured">
                              <Chip
                                size="small"
                                icon={<KeyIcon />}
                                label="Auth"
                                color="success"
                                variant="outlined"
                              />
                            </Tooltip>
                          ) : (
                            <Tooltip title="No credentials - click to add">
                              <Chip
                                size="small"
                                icon={<LockIcon />}
                                label="No Auth"
                                color="warning"
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" component="div">
                          {database.source === 'cloud' ? `Cloud: ${database.sourceName || 'Unknown'}` : `Deployment: ${database.sourceName || 'Unknown'}`}
                          {database.host && ` • ${database.host}`}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            {selectedDatabaseObj && (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  <strong>Source:</strong> {selectedDatabaseObj.source === 'cloud' ? 'Cloud Discovery' : 'Deployment'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Engine:</strong> {selectedDatabaseObj.engine || 'postgres'}
                </Typography>
                {selectedDatabaseObj.host && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Host:</strong> {selectedDatabaseObj.host}:{selectedDatabaseObj.port}
                  </Typography>
                )}
                {selectedDatabaseObj.instanceClass && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Instance:</strong> {selectedDatabaseObj.instanceClass}
                  </Typography>
                )}
                <Box sx={{ mt: 1 }}>
                  {selectedDatabaseObj.hasCredentials ? (
                    <Chip
                      icon={<CheckIcon />}
                      label={`Credentials: ${selectedDatabaseObj.credentialName || 'Configured'}`}
                      color="success"
                      size="small"
                    />
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      startIcon={<AddIcon />}
                      onClick={() => openCredentialDialog(selectedDatabaseObj)}
                    >
                      Add Database Credentials
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Query Editor */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">SQL Query</Typography>
          <Box>
            <Button
              startIcon={<HistoryIcon />}
              onClick={() => setShowHistory(!showHistory)}
              size="small"
              sx={{ mr: 1 }}
            >
              History ({queryHistory.length})
            </Button>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <ExecuteIcon />}
              onClick={executeQuery}
              disabled={loading || !selectedDatabase || !query.trim()}
            >
              Execute (Ctrl+Enter)
            </Button>
          </Box>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={10}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Enter your SQL query here...&#10;&#10;Examples:&#10;SELECT * FROM users LIMIT 10;&#10;SELECT COUNT(*) FROM orders;&#10;INSERT INTO products (name, price) VALUES ('Item', 99.99);"
          disabled={loading}
          sx={{
            fontFamily: 'monospace',
            '& textarea': {
              fontFamily: 'monospace',
              fontSize: '14px',
            },
          }}
        />

        {getDbEngineInfo() && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" icon={false}>
              <Typography variant="caption">
                <strong>{getDbEngineInfo().toUpperCase()} Syntax:</strong>{' '}
                {getDbEngineInfo() === 'postgres' && 'Supports transactional DDL, use IF NOT EXISTS for idempotency'}
                {getDbEngineInfo() === 'mysql' && 'DDL statements auto-commit, use IF NOT EXISTS'}
                {(getDbEngineInfo() === 'sqlserver' || getDbEngineInfo() === 'mssql') && 'Use IF NOT EXISTS or IF OBJECT_ID checks'}
              </Typography>
            </Alert>
          </Box>
        )}
      </Paper>

      {/* Query History */}
      <Collapse in={showHistory}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Query History</Typography>
            <Button
              startIcon={<DeleteIcon />}
              onClick={clearHistory}
              size="small"
              color="error"
              disabled={queryHistory.length === 0}
            >
              Clear History
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {queryHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center">
              No query history yet
            </Typography>
          ) : (
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {queryHistory.map((item) => (
                <Card key={item.id} sx={{ mb: 2, cursor: 'pointer' }} onClick={() => loadQueryFromHistory(item)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(item.timestamp).toLocaleString()}
                        </Typography>
                        <Chip size="small" label={item.sourceName || item.databaseName} sx={{ mt: 0.5 }} />
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">
                          {item.rowCount} rows • {item.executionTime}ms
                        </Typography>
                      </Box>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        bgcolor: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                        fontSize: '12px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {item.query.length > 200 ? item.query.substring(0, 200) + '...' : item.query}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Paper>
      </Collapse>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Results Display */}
      {results && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Query Results</Typography>
            <Box>
              <Chip
                label={`${results.rowCount || 0} rows`}
                color="success"
                size="small"
                sx={{ mr: 1 }}
              />
              <Chip
                label={`${executionTime || 0}ms`}
                color="primary"
                size="small"
              />
            </Box>
          </Box>

          {!results.rows || results.rows.length === 0 ? (
            <Alert severity="info">
              Query executed successfully. No rows returned.
            </Alert>
          ) : (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                      #
                    </TableCell>
                    {results.rows[0] && Object.keys(results.rows[0]).map((column) => (
                      <TableCell
                        key={column}
                        sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {String(column)}
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(column)}
                            sx={{ color: 'white', p: 0.5 }}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex} hover>
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                        {rowIndex + 1}
                      </TableCell>
                      {Object.entries(row).map(([column, value]) => (
                        <TableCell key={column}>
                          {value === null ? (
                            <em style={{ color: '#999' }}>NULL</em>
                          ) : typeof value === 'object' ? (
                            <pre style={{ margin: 0, fontSize: '12px' }}>
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : typeof value === 'boolean' ? (
                            value ? 'true' : 'false'
                          ) : (
                            String(value)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Loading State */}
      {fetchingDatabases && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, gap: 2 }}>
          <CircularProgress size={24} />
          <Typography color="text.secondary">
            Discovering databases from cloud platforms...
          </Typography>
        </Box>
      )}

      {/* Database Credentials Dialog */}
      <Dialog 
        open={credentialDialogOpen} 
        onClose={() => setCredentialDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <KeyIcon color="primary" />
            Add Database Credentials
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter the database authentication credentials to enable querying. These credentials are encrypted and stored securely.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Credential Name"
                value={credentialForm.name}
                onChange={(e) => setCredentialForm({ ...credentialForm, name: e.target.value })}
                placeholder="e.g., Production DB Credentials"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Host"
                value={credentialForm.host}
                onChange={(e) => setCredentialForm({ ...credentialForm, host: e.target.value })}
                placeholder="database.example.com"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Port"
                type="number"
                value={credentialForm.port}
                onChange={(e) => setCredentialForm({ ...credentialForm, port: parseInt(e.target.value) || 5432 })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Database Engine</InputLabel>
                <Select
                  value={credentialForm.engine}
                  onChange={(e) => setCredentialForm({ ...credentialForm, engine: e.target.value })}
                  label="Database Engine"
                >
                  <MenuItem value="postgres">PostgreSQL</MenuItem>
                  <MenuItem value="mysql">MySQL</MenuItem>
                  <MenuItem value="mariadb">MariaDB</MenuItem>
                  <MenuItem value="sqlserver">SQL Server</MenuItem>
                  <MenuItem value="mssql">MSSQL</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Database Name"
                value={credentialForm.databaseName}
                onChange={(e) => setCredentialForm({ ...credentialForm, databaseName: e.target.value })}
                placeholder="postgres"
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Authentication</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                value={credentialForm.username}
                onChange={(e) => setCredentialForm({ ...credentialForm, username: e.target.value })}
                placeholder="admin"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={credentialForm.password}
                onChange={(e) => setCredentialForm({ ...credentialForm, password: e.target.value })}
                placeholder="••••••••"
              />
            </Grid>
          </Grid>

          {/* Connection Test Result */}
          {connectionTestResult && (
            <Alert 
              severity={connectionTestResult.success ? 'success' : 'error'} 
              sx={{ mt: 2 }}
            >
              {connectionTestResult.message}
              {connectionTestResult.version && (
                <Typography variant="caption" display="block">
                  {connectionTestResult.version}
                </Typography>
              )}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCredentialDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={testConnection}
            disabled={testingConnection || !credentialForm.host || !credentialForm.username || !credentialForm.password}
            startIcon={testingConnection ? <CircularProgress size={16} /> : <CheckIcon />}
          >
            Test Connection
          </Button>
          <Button 
            variant="contained"
            onClick={saveCredential}
            disabled={savingCredential || !credentialForm.name || !credentialForm.host || !credentialForm.username || !credentialForm.password}
            startIcon={savingCredential ? <CircularProgress size={16} /> : <AddIcon />}
          >
            Save Credentials
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DatabaseQueryInterface;
