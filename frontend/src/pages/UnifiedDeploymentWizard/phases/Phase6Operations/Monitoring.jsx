import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import api from '../../../../services/api';

// Fallback simulated metrics when API is unavailable
const generateFallbackMetrics = () => ({
  cluster: {
    cpuUsage: Math.random() * 60 + 20,
    memoryUsage: Math.random() * 50 + 30,
    podCount: Math.floor(Math.random() * 20) + 10,
    nodeCount: Math.floor(Math.random() * 3) + 2,
  },
  nodes: [
    { name: 'node-1', status: 'Ready', cpu: Math.random() * 80, memory: Math.random() * 70 },
    { name: 'node-2', status: 'Ready', cpu: Math.random() * 80, memory: Math.random() * 70 },
    { name: 'node-3', status: Math.random() > 0.9 ? 'NotReady' : 'Ready', cpu: Math.random() * 80, memory: Math.random() * 70 },
  ],
  recentEvents: [
    { type: 'Normal', message: 'Successfully pulled image nginx:latest', time: '2m ago' },
    { type: 'Normal', message: 'Created container web-app', time: '3m ago' },
    { type: 'Warning', message: 'Readiness probe failed: connection refused', time: '5m ago' },
    { type: 'Normal', message: 'Started container api-server', time: '10m ago' },
  ],
  isSimulated: true,
});

function MetricCard({ title, value, unit, icon, color = 'primary' }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
              {typeof value === 'number' ? value.toFixed(1) : value}
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                {unit}
              </Typography>
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: `${color}.light`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: `${color}.main`,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function UsageBar({ label, value, threshold = 80 }) {
  const color = value > threshold ? 'error' : value > 60 ? 'warning' : 'primary';
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" color={`${color}.main`}>
          {value.toFixed(1)}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        color={color}
        sx={{ height: 8, borderRadius: 1 }}
      />
    </Box>
  );
}

export default function Monitoring() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    
    try {
      // Try to fetch real metrics from API
      const [nodeMetricsRes, podMetricsRes, healthRes] = await Promise.all([
        api.get('/container-deployments/k8s/metrics/nodes').catch(() => null),
        api.get('/container-deployments/k8s/metrics/pods').catch(() => null),
        api.get('/container-deployments/k8s/nodes/health').catch(() => null),
      ]);
      
      const nodeMetrics = nodeMetricsRes?.data?.data?.metrics || [];
      const podMetrics = podMetricsRes?.data?.data?.metrics || [];
      const nodes = healthRes?.data?.data?.nodes || [];
      
      if (nodes.length > 0 || nodeMetrics.length > 0) {
        // Calculate cluster-level metrics from real data
        const totalCpu = nodeMetrics.reduce((sum, n) => sum + (n.cpuUsage || 0), 0);
        const totalMem = nodeMetrics.reduce((sum, n) => sum + (n.memoryUsage || 0), 0);
        const avgCpu = nodeMetrics.length > 0 ? totalCpu / nodeMetrics.length : 0;
        const avgMem = nodeMetrics.length > 0 ? totalMem / nodeMetrics.length : 0;
        
        setMetrics({
          cluster: {
            cpuUsage: avgCpu,
            memoryUsage: avgMem,
            podCount: podMetrics.length,
            nodeCount: nodes.length,
          },
          nodes: nodes.map((node, idx) => ({
            name: node.name || `node-${idx + 1}`,
            status: node.status || 'Unknown',
            cpu: nodeMetrics[idx]?.cpuUsage || 0,
            memory: nodeMetrics[idx]?.memoryUsage || 0,
          })),
          recentEvents: [],
          isSimulated: false,
        });
        setUsingFallback(false);
      } else {
        throw new Error('No data available');
      }
    } catch (err) {
      // Fall back to simulated metrics
      console.warn('Using simulated metrics:', err.message);
      setMetrics(generateFallbackMetrics());
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading && !metrics) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Loading metrics...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Simulated Data Notice */}
      {usingFallback && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing simulated metrics. Connect to a Kubernetes cluster to see real data.
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6">Cluster Monitoring</Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time resource usage and cluster health
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            color={autoRefresh ? 'success' : 'default'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="small"
          />
          <Tooltip title="Refresh now">
            <IconButton onClick={fetchMetrics} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <MetricCard
            title="CPU Usage"
            value={metrics?.cluster.cpuUsage}
            unit="%"
            icon={<SpeedIcon />}
            color={metrics?.cluster.cpuUsage > 80 ? 'error' : 'primary'}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            title="Memory Usage"
            value={metrics?.cluster.memoryUsage}
            unit="%"
            icon={<MemoryIcon />}
            color={metrics?.cluster.memoryUsage > 80 ? 'error' : 'primary'}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            title="Pods"
            value={metrics?.cluster.podCount}
            unit="running"
            icon={<StorageIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            title="Nodes"
            value={metrics?.cluster.nodeCount}
            unit="active"
            icon={<StorageIcon />}
            color="success"
          />
        </Grid>
      </Grid>

      {/* Node Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Node Status
          </Typography>
          <Grid container spacing={2}>
            {metrics?.nodes.map((node, idx) => (
              <Grid item xs={12} md={4} key={idx}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle2">{node.name}</Typography>
                      <Chip
                        icon={node.status === 'Ready' ? <CheckCircleIcon /> : <ErrorIcon />}
                        label={node.status}
                        size="small"
                        color={node.status === 'Ready' ? 'success' : 'error'}
                      />
                    </Box>
                    <UsageBar label="CPU" value={node.cpu} />
                    <UsageBar label="Memory" value={node.memory} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Events
          </Typography>
          {metrics?.recentEvents.map((event, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                py: 1,
                borderBottom: idx < metrics.recentEvents.length - 1 ? 1 : 0,
                borderColor: 'divider',
              }}
            >
              {event.type === 'Warning' ? (
                <WarningIcon color="warning" fontSize="small" />
              ) : (
                <CheckCircleIcon color="success" fontSize="small" />
              )}
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2">{event.message}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {event.time}
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          For detailed metrics, visit the{' '}
          <Button
            size="small"
            onClick={() => window.open('/monitor', '_blank')}
          >
            Full Monitoring Dashboard
          </Button>
        </Typography>
      </Alert>
    </Box>
  );
}
