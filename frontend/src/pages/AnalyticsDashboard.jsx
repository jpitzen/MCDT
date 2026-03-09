import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Alert,
  Chip,
  Tab,
  Tabs,
  Paper,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * AnalyticsDashboard Component
 * Comprehensive analytics and metrics visualization for deployments
 * Shows trends, success rates, performance, and cost analysis
 */
const AnalyticsDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [costData, setCostData] = useState(null);

  /**
   * Fetch all analytics data
   */
  const fetchAnalytics = async () => {
    try {
      setError(null);
      setLoading(true);

      const [metricsRes, trendsRes, costRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/analytics/metrics`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }),
        axios.get(`${API_BASE_URL}/analytics/trends?days=30`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }),
        axios.get(`${API_BASE_URL}/analytics/cost`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }),
      ]);

      setMetrics(metricsRes.data);
      setTrends(trendsRes.data || []);
      setCostData(costRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err.response?.data?.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch analytics on mount
   */
  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Deployment Analytics
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Real-time metrics, trends, and performance analysis
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Deployments
              </Typography>
              <Typography variant="h4">
                {metrics?.totalDeployments || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Success Rate
              </Typography>
              <Typography variant="h4" sx={{ color: 'success.main' }}>
                {metrics?.successRate || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Duration
              </Typography>
              <Typography variant="h4">
                {Math.round(metrics?.averageDuration / 60) || 0}m
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Est. Total Cost
              </Typography>
              <Typography variant="h4">
                ${costData?.estimatedTotalCost || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different analytics views */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(event, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Trends" />
          <Tab label="Status Distribution" />
          <Tab label="Performance" />
          <Tab label="Cost Analysis" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={2}>
          {/* Deployment Trend */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Deployment Trends (Last 30 Days)" />
              <CardContent>
                {trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#8884d8"
                        name="Total Deployments"
                      />
                      <Line
                        type="monotone"
                        dataKey="successful"
                        stroke="#82ca9d"
                        name="Successful"
                      />
                      <Line
                        type="monotone"
                        dataKey="failed"
                        stroke="#ffc658"
                        name="Failed"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Alert severity="info">No trend data available</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Success Rate Trend */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Daily Success Rate" />
              <CardContent>
                {trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={trends.map((t) => ({
                        ...t,
                        successRate:
                          t.total > 0 ? ((t.successful / t.total) * 100).toFixed(0) : 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="successRate" fill="#82ca9d" name="Success %" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Alert severity="info">No data available</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Provider Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Deployments by Cloud Provider" />
              <CardContent>
                {metrics?.byCloudProvider && Object.keys(metrics.byCloudProvider).length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={Object.entries(metrics.byCloudProvider).map(([name, data]) => ({
                          name: name.toUpperCase(),
                          value: data.count,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a4de6c'].map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Alert severity="info">No provider data available</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Deployment Status Distribution" />
              <CardContent>
                {metrics?.byStatus && Object.keys(metrics.byStatus).length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={Object.entries(metrics.byStatus).map(([status, count]) => ({
                        status: status.charAt(0).toUpperCase() + status.slice(1),
                        count,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Alert severity="info">No status data available</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Success vs Failure" />
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: 'Successful',
                          value: metrics?.successfulDeployments || 0,
                        },
                        {
                          name: 'Failed',
                          value: metrics?.failedDeployments || 0,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#82ca9d" />
                      <Cell fill="#ff7c7c" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Deployment Stats" />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Total Deployments
                    </Typography>
                    <Typography variant="h6">
                      {metrics?.totalDeployments || 0}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Min Duration
                    </Typography>
                    <Typography variant="h6">
                      {Math.round(metrics?.minDuration / 60) || 0}m
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Max Duration
                    </Typography>
                    <Typography variant="h6">
                      {Math.round(metrics?.maxDuration / 60) || 0}m
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Median Duration
                    </Typography>
                    <Typography variant="h6">
                      {Math.round(metrics?.medianDuration / 60) || 0}m
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Deployment Performance Metrics" />
              <CardContent>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Avg Duration
                    </Typography>
                    <Typography variant="h5">
                      {Math.round(metrics?.averageDuration / 60) || 0}m
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Min Duration
                    </Typography>
                    <Typography variant="h5">
                      {Math.round((metrics?.minDuration || 0) / 60)}m
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Max Duration
                    </Typography>
                    <Typography variant="h5">
                      {Math.round((metrics?.maxDuration || 0) / 60)}m
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Median Duration
                    </Typography>
                    <Typography variant="h5">
                      {Math.round((metrics?.medianDuration || 0) / 60)}m
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardHeader title="Performance by Cloud Provider" />
              <CardContent>
                {metrics?.byCloudProvider && Object.keys(metrics.byCloudProvider).length > 0 ? (
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Provider</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Count</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Success %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(metrics.byCloudProvider).map(([provider, data]) => (
                          <tr key={provider} style={{ borderBottom: '1px solid rgba(238, 238, 238, 1)' }}>
                            <td style={{ padding: '8px' }}>
                              <Chip
                                label={provider.toUpperCase()}
                                size="small"
                              />
                            </td>
                            <td style={{ padding: '8px' }}>{data.count}</td>
                            <td style={{ padding: '8px' }}>
                              {data.count > 0
                                ? ((data.successful / data.count) * 100).toFixed(0)
                                : 0}
                              %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                ) : (
                  <Alert severity="info">No performance data available</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 3 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Cost Analysis" />
              <CardContent>
                {costData ? (
                  <Box>
                    <Box sx={{ mb: 3, p: 2, backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)', borderRadius: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        Estimated Total Cost
                      </Typography>
                      <Typography variant="h4" sx={{ color: 'primary.main' }}>
                        ${costData.estimatedTotalCost}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Based on node count and deployment duration
                      </Typography>
                    </Box>

                    {costData.byProvider && Object.keys(costData.byProvider).length > 0 && (
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          Cost by Provider
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={Object.entries(costData.byProvider).map(
                              ([provider, data]) => ({
                                provider: provider.charAt(0).toUpperCase() + provider.slice(1),
                                cost: parseFloat(data.estimatedCost.toFixed(2)),
                                count: data.count,
                              })
                            )}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="provider" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="cost" fill="#8884d8" name="Est. Cost ($)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Alert severity="info">No cost data available</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default AnalyticsDashboard;
