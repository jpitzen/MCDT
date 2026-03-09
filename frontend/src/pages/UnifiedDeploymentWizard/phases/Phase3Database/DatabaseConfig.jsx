import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControlLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Switch,
  TextField,
  Grid,
  Alert,
  Chip,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudIcon from '@mui/icons-material/Cloud';
import { useWizard } from '../../WizardContext';
import api from '../../../../services/api';

/**
 * DatabaseConfig - Configures managed database service
 * Part of Phase 3: Database Configuration
 */
function DatabaseConfig() {
  const { state, updateDatabaseConfig } = useWizard();
  const { databaseConfig = {}, cloudProvider = 'aws', selectedCredential } = state;

  // State for existing databases
  const [existingDatabases, setExistingDatabases] = useState([]);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [databasesError, setDatabasesError] = useState(null);

  // Get database engines based on cloud provider
  const getDatabaseEngines = () => {
    const engines = {
      aws: [
        { value: 'postgres', label: 'PostgreSQL', versions: ['15.4', '14.9', '13.12'] },
        { value: 'mysql', label: 'MySQL', versions: ['8.0.34', '5.7.43'] },
        { value: 'mariadb', label: 'MariaDB', versions: ['10.6.14', '10.5.21'] },
        { value: 'aurora-postgresql', label: 'Aurora PostgreSQL', versions: ['15.4', '14.9'] },
        { value: 'aurora-mysql', label: 'Aurora MySQL', versions: ['3.04.0', '3.03.1'] },
        { value: 'sqlserver-ex', label: 'SQL Server Express (Free)', versions: ['15.00', '14.00'] },
        { value: 'sqlserver-se', label: 'SQL Server Standard', versions: ['15.00', '14.00'] },
        { value: 'sqlserver-ee', label: 'SQL Server Enterprise', versions: ['15.00', '14.00'] },
      ],
      azure: [
        { value: 'postgres', label: 'Azure Database for PostgreSQL', versions: ['15', '14', '13'] },
        { value: 'mysql', label: 'Azure Database for MySQL', versions: ['8.0', '5.7'] },
        { value: 'sqlserver', label: 'Azure SQL Database', versions: ['12.0'] },
      ],
      gcp: [
        { value: 'postgres', label: 'Cloud SQL for PostgreSQL', versions: ['15', '14', '13'] },
        { value: 'mysql', label: 'Cloud SQL for MySQL', versions: ['8.0', '5.7'] },
        { value: 'sqlserver', label: 'Cloud SQL for SQL Server', versions: ['2019', '2017'] },
      ],
      digitalocean: [
        { value: 'postgres', label: 'Managed PostgreSQL', versions: ['15', '14', '13'] },
        { value: 'mysql', label: 'Managed MySQL', versions: ['8'] },
        { value: 'redis', label: 'Managed Redis', versions: ['7', '6'] },
      ],
      linode: [
        { value: 'postgres', label: 'Managed PostgreSQL', versions: ['15', '14'] },
        { value: 'mysql', label: 'Managed MySQL', versions: ['8.0'] },
      ],
    };
    return engines[cloudProvider] || engines.aws;
  };

  // Get instance classes based on cloud provider and engine
  const getInstanceClasses = () => {
    const classes = {
      aws: [
        { value: 'db.t3.micro', label: 'db.t3.micro (1 vCPU, 1GB) - Dev/Test', cost: 0.017 },
        { value: 'db.t3.small', label: 'db.t3.small (2 vCPU, 2GB) - Light', cost: 0.034 },
        { value: 'db.t3.medium', label: 'db.t3.medium (2 vCPU, 4GB) - Small apps', cost: 0.068 },
        { value: 'db.m5.large', label: 'db.m5.large (2 vCPU, 8GB) - Production', cost: 0.192 },
        { value: 'db.r5.large', label: 'db.r5.large (2 vCPU, 16GB) - Memory intensive', cost: 0.24 },
        { value: 'db.r5.xlarge', label: 'db.r5.xlarge (4 vCPU, 32GB) - High performance', cost: 0.48 },
      ],
      azure: [
        { value: 'B_Gen5_1', label: 'Basic (1 vCore) - Dev/Test', cost: 0.025 },
        { value: 'GP_Gen5_2', label: 'General Purpose (2 vCores) - Small apps', cost: 0.228 },
        { value: 'GP_Gen5_4', label: 'General Purpose (4 vCores) - Production', cost: 0.456 },
        { value: 'MO_Gen5_2', label: 'Memory Optimized (2 vCores)', cost: 0.295 },
      ],
      gcp: [
        { value: 'db-f1-micro', label: 'Shared Core (0.6GB) - Dev/Test', cost: 0.015 },
        { value: 'db-g1-small', label: 'Shared Core (1.7GB) - Light', cost: 0.05 },
        { value: 'db-n1-standard-1', label: 'Standard (1 vCPU, 3.75GB)', cost: 0.11 },
        { value: 'db-n1-standard-2', label: 'Standard (2 vCPU, 7.5GB)', cost: 0.22 },
      ],
      digitalocean: [
        { value: 'db-s-1vcpu-1gb', label: '1 vCPU, 1GB - Dev/Test', cost: 0.021 },
        { value: 'db-s-1vcpu-2gb', label: '1 vCPU, 2GB - Light', cost: 0.03 },
        { value: 'db-s-2vcpu-4gb', label: '2 vCPU, 4GB - Production', cost: 0.089 },
      ],
      linode: [
        { value: 'g6-nanode-1', label: 'Nanode (1GB) - Dev/Test', cost: 0.0075 },
        { value: 'g6-standard-1', label: 'Standard (2GB) - Light', cost: 0.015 },
        { value: 'g6-standard-2', label: 'Standard (4GB) - Production', cost: 0.03 },
      ],
    };
    return classes[cloudProvider] || classes.aws;
  };

  const engines = getDatabaseEngines();
  const instanceClasses = getInstanceClasses();
  const selectedEngine = engines.find(e => e.value === databaseConfig.engine);

  // Fetch existing managed databases from the selected cloud provider
  const fetchExistingDatabases = async () => {
    if (!selectedCredential?.id) {
      setDatabasesError('No credential selected. Please select a credential first.');
      return;
    }

    setLoadingDatabases(true);
    setDatabasesError(null);

    try {
      // Use infrastructure discovery to get managed database instances
      const response = await api.get(`/infrastructure/databases/${selectedCredential.id}`);
      const databases = response.data?.data?.databases || [];
      setExistingDatabases(databases);
      
      if (databases.length === 0) {
        setDatabasesError('No existing database instances found in this region.');
      }
    } catch (error) {
      console.error('Failed to fetch existing databases:', error);
      setDatabasesError(error.response?.data?.message || 'Failed to fetch existing databases. Please ensure your credentials have database service access.');
    } finally {
      setLoadingDatabases(false);
    }
  };

  // Auto-fetch existing databases when "Use Existing" is selected
  useEffect(() => {
    if (databaseConfig.useExisting && selectedCredential?.id && existingDatabases.length === 0 && !loadingDatabases) {
      fetchExistingDatabases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseConfig.useExisting, selectedCredential?.id]);

  const handleSelectExistingDatabase = (database) => {
    updateDatabaseConfig({
      selectedDatabase: database,
      engine: database.engine,
      version: database.engineVersion,
      instanceClass: database.instanceClass,
      allocatedStorage: database.allocatedStorage,
      multiAZ: database.multiAZ,
      dbName: database.databaseName || database.id,
      existingEndpoint: database.endpoint?.host,
      existingPort: database.endpoint?.port,
    });
  };

  const handleUseExistingChange = (event) => {
    const useExisting = event.target.value === 'existing';
    updateDatabaseConfig({ 
      useExisting,
      // Reset selection when switching
      selectedDatabase: null,
      existingEndpoint: '',
      existingPort: '',
    });
    
    // Fetch existing databases when switching to "existing"
    if (useExisting && selectedCredential?.id) {
      fetchExistingDatabases();
    }
  };

  // Calculate estimated monthly cost
  const estimatedCost = useMemo(() => {
    if (!databaseConfig.enabled || databaseConfig.useExisting) return '0.00';
    
    const instance = instanceClasses.find(c => c.value === databaseConfig.instanceClass);
    const costPerHour = instance ? instance.cost : 0.068;
    const hoursPerMonth = 730;
    let cost = costPerHour * hoursPerMonth;
    
    // Multi-AZ doubles the cost
    if (databaseConfig.multiAZ) {
      cost *= 2;
    }
    
    // Storage cost (~$0.115/GB)
    cost += 0.115 * (databaseConfig.allocatedStorage || 20);
    
    return cost.toFixed(2);
  }, [databaseConfig, instanceClasses]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    updateDatabaseConfig({ [field]: value });
  };

  const handleEnableChange = (event) => {
    updateDatabaseConfig({ enabled: event.target.checked });
  };

  const handleEngineChange = (event) => {
    const engine = event.target.value;
    const engineData = engines.find(e => e.value === engine);
    updateDatabaseConfig({
      engine,
      version: engineData?.versions[0] || '',
    });
  };

  const enabled = databaseConfig.enabled || false;

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorageIcon color="primary" />
        Database Configuration
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Deploy a fully managed database service. Managed databases handle backups, updates, 
        monitoring, and scaling automatically.
      </Typography>

      {/* Enable/Disable Toggle */}
      <Box sx={{ mb: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={handleEnableChange}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Deploy Managed Database Service
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Recommended for production applications requiring reliable database infrastructure
              </Typography>
            </Box>
          }
        />
      </Box>

      {enabled && (
        <>
          {/* New or Existing Selection */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Database Source
                </FormLabel>
                <RadioGroup
                  value={databaseConfig.useExisting ? 'existing' : 'new'}
                  onChange={handleUseExistingChange}
                >
                  <FormControlLabel
                    value="new"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          Create New Database
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Provision a new managed database instance for this deployment
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="existing"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          Use Existing Database
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Connect to an existing database instance in your account
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>

          {/* Existing Database Selection */}
          {databaseConfig.useExisting ? (
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Select Existing Database
                  </Typography>
                  <Chip
                    icon={<RefreshIcon />}
                    label={loadingDatabases ? 'Loading...' : 'Refresh'}
                    size="small"
                    onClick={fetchExistingDatabases}
                    disabled={loadingDatabases}
                    sx={{ cursor: 'pointer' }}
                  />
                </Box>

                {/* Existing Databases List */}
                {loadingDatabases ? (
                  <Box sx={{ py: 2 }}>
                    <Skeleton variant="rectangular" height={70} sx={{ mb: 1, borderRadius: 1 }} />
                    <Skeleton variant="rectangular" height={70} sx={{ mb: 1, borderRadius: 1 }} />
                    <Skeleton variant="rectangular" height={70} sx={{ borderRadius: 1 }} />
                  </Box>
                ) : databasesError ? (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {databasesError}
                  </Alert>
                ) : existingDatabases.length > 0 ? (
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider', mb: 2 }}>
                    {existingDatabases.map((database, index) => (
                      <ListItemButton
                        key={database.id || index}
                        selected={databaseConfig.selectedDatabase?.id === database.id}
                        onClick={() => handleSelectExistingDatabase(database)}
                        sx={{
                          borderBottom: index < existingDatabases.length - 1 ? 1 : 0,
                          borderColor: 'divider',
                          '&.Mui-selected': {
                            bgcolor: 'action.selected',
                            borderLeft: 3,
                            borderLeftColor: 'primary.main',
                          },
                        }}
                      >
                        <ListItemIcon>
                          {databaseConfig.selectedDatabase?.id === database.id ? (
                            <CheckCircleIcon color="primary" />
                          ) : (
                            <StorageIcon color="action" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography component="span" variant="body1" fontWeight={500}>
                                {database.id}
                              </Typography>
                              <Chip
                                label={database.engine}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              <Chip
                                label={database.status}
                                size="small"
                                color={database.status === 'available' ? 'success' : 'warning'}
                                variant="outlined"
                              />
                              {database.multiAZ && (
                                <Chip label="Multi-AZ" size="small" variant="outlined" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                              <Typography component="span" variant="body2" color="text.secondary">
                                {database.instanceClass} • {database.allocatedStorage}GB • v{database.engineVersion}
                              </Typography>
                              {database.endpoint && (
                                <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-all' }}>
                                  {database.endpoint.host}:{database.endpoint.port}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItemButton>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Click "Refresh" to load existing database instances from your AWS account.
                  </Alert>
                )}

                {/* Manual Connection Entry */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, mt: 2 }}>
                  Or enter connection details manually:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Database Endpoint"
                      value={databaseConfig.existingEndpoint || ''}
                      onChange={handleChange('existingEndpoint')}
                      placeholder={cloudProvider === 'aws' ? 'mydb.xxxxx.region.rds.amazonaws.com' : cloudProvider === 'azure' ? 'mydb.database.windows.net' : cloudProvider === 'gcp' ? 'project:region:instance' : 'db-hostname.example.com'}
                      helperText="Hostname of the existing database"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CloudIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Port"
                      type="number"
                      value={databaseConfig.existingPort || ''}
                      onChange={handleChange('existingPort')}
                      placeholder="5432"
                      helperText="Database port"
                    />
                  </Grid>
                </Grid>

                {/* Credentials for existing database */}
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={databaseConfig.dbUsername || ''}
                      onChange={handleChange('dbUsername')}
                      placeholder="admin"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Password"
                      value={databaseConfig.dbPassword || ''}
                      onChange={handleChange('dbPassword')}
                    />
                  </Grid>
                </Grid>

                <Alert severity="info" sx={{ mt: 3 }}>
                  <Typography variant="body2">
                    <strong>Requirements for existing databases:</strong>
                  </Typography>
                  <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 0 }}>
                    <li>Database must be accessible from your VPC/cluster</li>
                    <li>Security groups must allow inbound connections</li>
                    <li>You'll need valid credentials to connect</li>
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Database Engine Selection */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Database Engine
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        select
                        label="Engine Type"
                        value={databaseConfig.engine || 'postgres'}
                        onChange={handleEngineChange}
                        SelectProps={{ native: true }}
                        helperText="Choose your preferred database engine"
                      >
                        {engines.map((engine) => (
                          <option key={engine.value} value={engine.value}>
                            {engine.label}
                          </option>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        select
                        label="Engine Version"
                        value={databaseConfig.version || selectedEngine?.versions[0] || ''}
                        onChange={handleChange('version')}
                        SelectProps={{ native: true }}
                        helperText="Select version (latest recommended)"
                      >
                        {selectedEngine?.versions.map((version) => (
                          <option key={version} value={version}>
                            {version}
                          </option>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>

              {databaseConfig.engine?.startsWith('sqlserver') && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <strong>SQL Server Licensing:</strong>{' '}
                  {databaseConfig.engine === 'sqlserver-ex'
                    ? 'Express Edition is FREE (limited to 10GB database size, 1GB memory, 4 cores). Perfect for development.'
                    : 'Includes Microsoft licensing costs. Standard is suitable for most apps. Enterprise includes advanced features.'}
                </Alert>
              )}
                </CardContent>
              </Card>

              {/* Instance Configuration */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SpeedIcon color="action" />
                    Instance Configuration
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        select
                        label="Instance Class"
                        value={databaseConfig.instanceClass || 'db.t3.micro'}
                        onChange={handleChange('instanceClass')}
                        SelectProps={{ native: true }}
                        helperText="Choose instance size based on workload"
                      >
                        {instanceClasses.map((cls) => (
                          <option key={cls.value} value={cls.value}>
                            {cls.label}
                          </option>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Storage Size (GB)"
                        value={databaseConfig.allocatedStorage || 20}
                        onChange={handleChange('allocatedStorage')}
                        inputProps={{ min: 20, max: 65536 }}
                        helperText="Database storage capacity (20-65,536 GB)"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">GB</InputAdornment>,
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Database Name"
                        value={databaseConfig.dbName || ''}
                        onChange={handleChange('dbName')}
                        placeholder="myappdb"
                        helperText="Database identifier (lowercase, alphanumeric, hyphens)"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={databaseConfig.multiAZ || false}
                            onChange={handleChange('multiAZ')}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1">Enable Multi-AZ Deployment</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Provides high availability with automatic failover (doubles cost)
                            </Typography>
                          </Box>
                        }
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Credentials */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon color="action" />
                    Database Credentials
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Master Username"
                        value={databaseConfig.dbUsername || 'admin'}
                        onChange={handleChange('dbUsername')}
                        placeholder="admin"
                        helperText="Database master username"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Master Password"
                        value={databaseConfig.dbPassword || ''}
                        onChange={handleChange('dbPassword')}
                        helperText="Min 8 characters, include uppercase, lowercase, numbers"
                      />
                    </Grid>
                  </Grid>

                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Store credentials securely. Consider using AWS Secrets Manager or similar services 
                    for production deployments.
                  </Alert>
                </CardContent>
              </Card>

              {/* Cost Estimate */}
              <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    💰 Estimated Monthly Cost: ${estimatedCost}
                  </Typography>
                  <Typography variant="caption">
                    Based on {databaseConfig.instanceClass || 'db.t3.micro'}, {databaseConfig.allocatedStorage || 20}GB storage
                    {databaseConfig.multiAZ ? ', Multi-AZ enabled' : ''}
                  </Typography>
                </Box>
              </Alert>
            </>
          )}

          {/* Status Summary */}
          <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              icon={<CheckCircleIcon />}
              label={databaseConfig.useExisting ? 'Using Existing' : 'Database Enabled'}
              color="success"
              size="small"
            />
            {databaseConfig.selectedDatabase ? (
              <Chip 
                label={databaseConfig.selectedDatabase.id}
                color="primary"
                variant="outlined"
                size="small"
              />
            ) : (
              <Chip 
                label={selectedEngine?.label || 'PostgreSQL'}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
            {!databaseConfig.useExisting && (
              <Chip 
                label={databaseConfig.instanceClass || 'db.t3.micro'}
                variant="outlined"
                size="small"
              />
            )}
            {databaseConfig.multiAZ && (
              <Chip 
                label="Multi-AZ"
                color="warning"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        </>
      )}

      {!enabled && (
        <Alert severity="info">
          Database deployment is disabled. You can configure it later or use an existing database.
        </Alert>
      )}
    </Box>
  );
}

export default DatabaseConfig;
