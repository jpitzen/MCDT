import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CloudDone as CloudDoneIcon,
  CloudUpload as CloudUploadIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import api from '../services/api';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalDeployments: 0,
    activeDeployments: 0,
    failedDeployments: 0,
    totalCredentials: 0,
    successRate: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dashboardResponse = await api.get('/status/dashboard');
      const data = dashboardResponse.data;
      
      setStats({
        totalDeployments: data.statistics?.totalDeployments || 0,
        activeDeployments: data.statistics?.activeDeployments || 0,
        failedDeployments: data.statistics?.failedDeployments || 0,
        totalCredentials: data.statistics?.totalCredentials || 0,
        successRate: data.statistics?.successRate || 0
      });

      setRecentActivity(data.recentActivity || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
    <Card 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { boxShadow: 3 } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4">{value}</Typography>
          </Box>
          <Icon sx={{ fontSize: 40, color: color }} />
        </Box>
      </CardContent>
    </Card>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'FAILED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <CloudDoneIcon />;
      case 'IN_PROGRESS':
        return <CircularProgress size={20} />;
      case 'FAILED':
        return <ErrorIcon />;
      default:
        return <ScheduleIcon />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4">Cloud Deployment Platform</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Deploy and manage Kubernetes clusters across AWS, Azure, GCP, DigitalOcean, and Linode
          </Typography>
        </Box>
        <Tooltip title="Refresh Dashboard">
          <IconButton onClick={fetchDashboardData} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Deployments"
            value={stats.totalDeployments}
            icon={CloudUploadIcon}
            color="#2196F3"
            onClick={() => navigate('/deployments')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Deployments"
            value={stats.activeDeployments}
            icon={CloudUploadIcon}
            color="#4CAF50"
            onClick={() => navigate('/deployments')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Failed Deployments"
            value={stats.failedDeployments}
            icon={ErrorIcon}
            color="#F44336"
            onClick={() => navigate('/deployments')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Success Rate"
            value={`${stats.successRate}%`}
            icon={TrendingUpIcon}
            color="#FF9800"
          />
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Card>
        <CardHeader 
          title="Recent Deployments" 
          action={
            <Button 
              size="small" 
              onClick={() => navigate('/deployments')}
            >
              View All
            </Button>
          }
        />
        <CardContent>
          {recentActivity.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No deployments yet. Use the "New Deployment" navigation item to create your first cluster.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
                    <TableCell>Cluster Name</TableCell>
                    <TableCell>Cloud Provider</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentActivity.map((dep) => (
                    <TableRow key={dep.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {dep.clusterName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={dep.cloudProvider?.toUpperCase()} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{dep.region}</TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(dep.status)}
                          label={dep.status}
                          color={getStatusColor(dep.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(dep.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => navigate(`/deployment/${dep.id}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default Dashboard;
