import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  Tooltip,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import api from '../../../../services/api';
import { useWizard } from '../../WizardContext';

const SEVERITY_COLORS = {
  Critical: 'error',
  High: 'error',
  Medium: 'warning',
  Low: 'info',
  Negligible: 'default',
};

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Negligible'];

function SeveritySummary({ summary }) {
  if (!summary) return null;

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
      {SEVERITY_ORDER.map((sev) => {
        const count = summary[sev.toLowerCase()] || 0;
        if (count === 0) return null;
        return (
          <Chip
            key={sev}
            label={`${sev}: ${count}`}
            color={SEVERITY_COLORS[sev]}
            size="small"
            variant="outlined"
          />
        );
      })}
      <Chip
        label={`Total: ${summary.total || 0}`}
        size="small"
        sx={{ fontWeight: 'bold' }}
      />
    </Box>
  );
}

export default function ScanResultsPanel() {
  const { state } = useWizard();
  const deploymentId = state.deploymentId || state.activeDeploymentId;
  const [scanResults, setScanResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runScan = useCallback(async () => {
    if (!deploymentId) {
      setError('No active deployment to scan.');
      return;
    }

    setLoading(true);
    setError(null);
    setScanResults(null);

    try {
      const response = await api.post(`/deployments/${deploymentId}/scan`);
      setScanResults(response.data?.data || response.data);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Scan failed. Ensure Grype is installed on the backend server.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [deploymentId]);

  const overallIcon = scanResults
    ? scanResults.summary?.critical > 0 || scanResults.summary?.high > 0
      ? <ErrorOutlineIcon color="error" />
      : scanResults.summary?.total > 0
        ? <WarningAmberIcon color="warning" />
        : <CheckCircleOutlineIcon color="success" />
    : <SecurityIcon color="action" />;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {overallIcon}
        <Typography variant="h6">Container Security Scan</Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Run vulnerability scan on deployed container images">
          <span>
            <Button
              variant="outlined"
              startIcon={loading ? null : <RefreshIcon />}
              onClick={runScan}
              disabled={loading || !deploymentId}
              size="small"
            >
              {loading ? 'Scanning…' : scanResults ? 'Re-scan' : 'Run Scan'}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Scanning container images for known vulnerabilities…
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {scanResults && !loading && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Image: {scanResults.imageTag || 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Scanned: {scanResults.scanTime ? new Date(scanResults.scanTime).toLocaleString() : '—'}
              </Typography>
            </Box>

            <SeveritySummary summary={scanResults.summary} />

            {scanResults.summary?.total === 0 && (
              <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
                No vulnerabilities found — image is clean!
              </Alert>
            )}

            {scanResults.vulnerabilities?.length > 0 && (
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>CVE</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Package</TableCell>
                      <TableCell>Version</TableCell>
                      <TableCell>Fix Available</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scanResults.vulnerabilities.map((v, idx) => (
                      <TableRow key={`${v.id}-${idx}`} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {v.id || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={v.severity}
                            color={SEVERITY_COLORS[v.severity] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{v.package}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {v.version}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {v.fixedIn ? (
                            <Chip label={v.fixedIn} size="small" color="success" variant="outlined" />
                          ) : (
                            <Typography variant="caption" color="text.secondary">No fix</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {!scanResults && !loading && !error && (
        <Alert severity="info" icon={<SecurityIcon />}>
          Click <strong>Run Scan</strong> to check deployed container images for known vulnerabilities
          using Grype.
        </Alert>
      )}
    </Box>
  );
}
