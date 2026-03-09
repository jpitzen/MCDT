/**
 * LogViewer Component
 * Real-time log display with auto-scroll, filtering, and export
 * 
 * Features:
 * - Color-coded log levels (info, warn, error, debug)
 * - Auto-scroll to latest (with pause/resume)
 * - Search/filter logs
 * - Export logs to file
 * - Timestamp formatting
 * - Virtual scrolling for performance
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  Chip,
  Toolbar,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Download as DownloadIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

const LogViewer = memo(({ logs, isLive, onClear, maxHeight = 500 }) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [showTerraformOutput, setShowTerraformOutput] = useState(true);
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Filter logs based on search and level
  const filteredLogs = logs.filter((log) => {
    // Hide terraform output lines when toggle is off
    if (!showTerraformOutput && ['terraform-output', 'terraform-stderr'].includes(log.level)) {
      return false;
    }

    // Level filter
    if (levelFilter !== 'all' && log.level !== levelFilter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const messageMatch = log.message?.toLowerCase().includes(searchLower);
      const levelMatch = log.level?.toLowerCase().includes(searchLower);
      return messageMatch || levelMatch;
    }

    return true;
  });

  // Get color for log level
  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return '#f44336'; // red
      case 'warn':
      case 'warning':
        return '#ff9800'; // orange
      case 'info':
        return '#2196f3'; // blue
      case 'debug':
        return '#9e9e9e'; // gray
      case 'success':
        return '#4caf50'; // green
      case 'terraform-output':
        return '#81c784'; // light green (terraform stdout)
      case 'terraform-stderr':
        return '#ffb74d'; // light orange (terraform stderr)
      default:
        return '#757575'; // default gray
    }
  };

  // Get background color for log level
  const getLevelBgColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return 'rgba(244, 67, 54, 0.1)';
      case 'warn':
      case 'warning':
        return 'rgba(255, 152, 0, 0.1)';
      case 'info':
        return 'rgba(33, 150, 243, 0.05)';
      case 'debug':
        return 'rgba(158, 158, 158, 0.05)';
      case 'success':
        return 'rgba(76, 175, 80, 0.1)';
      case 'terraform-output':
        return 'rgba(129, 199, 132, 0.08)';
      case 'terraform-stderr':
        return 'rgba(255, 183, 77, 0.08)';
      default:
        return 'transparent';
    }
  };

  // Export logs to file
  const handleExport = () => {
    const logText = filteredLogs
      .map((log) => {
        const timestamp = log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : '';
        const level = (log.level || 'INFO').toUpperCase().padEnd(7);
        return `[${timestamp}] ${level} ${log.message || ''}`;
      })
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Toggle auto-scroll
  const toggleAutoScroll = () => {
    setAutoScroll(!autoScroll);
  };

  return (
    <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Toolbar variant="dense" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Deployment Logs
          </Typography>
          {isLive && (
            <Chip
              label="LIVE"
              size="small"
              color="success"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.6 },
                },
              }}
            />
          )}
          <Typography variant="caption" color="text.secondary">
            ({filteredLogs.length} entries)
          </Typography>
        </Box>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />,
          }}
          sx={{ width: 200, mr: 1 }}
        />

        {/* Level Filter */}
        <FormControl size="small" sx={{ minWidth: 100, mr: 1 }}>
          <Select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            displayEmpty
          >
            <MenuItem value="all">All Levels</MenuItem>
            <MenuItem value="error">Errors</MenuItem>
            <MenuItem value="warn">Warnings</MenuItem>
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="debug">Debug</MenuItem>
            <MenuItem value="terraform-output">Terraform Output</MenuItem>
            <MenuItem value="terraform-stderr">Terraform Stderr</MenuItem>
          </Select>
        </FormControl>

        {/* Terraform Output Toggle */}
        <Tooltip title={showTerraformOutput ? 'Hide terraform output' : 'Show terraform output'}>
          <Chip
            label="TF"
            size="small"
            color={showTerraformOutput ? 'success' : 'default'}
            onClick={() => setShowTerraformOutput(!showTerraformOutput)}
            sx={{ mr: 1, cursor: 'pointer', height: 24 }}
          />
        </Tooltip>

        {/* Auto-scroll Toggle */}
        <Tooltip title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}>
          <IconButton size="small" onClick={toggleAutoScroll} color={autoScroll ? 'primary' : 'default'}>
            {autoScroll ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* Export */}
        <Tooltip title="Export logs">
          <IconButton size="small" onClick={handleExport} disabled={filteredLogs.length === 0}>
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Clear */}
        <Tooltip title="Clear logs">
          <IconButton size="small" onClick={onClear} disabled={logs.length === 0}>
            <ClearIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>

      {/* Log Display */}
      <Box
        ref={logsContainerRef}
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          maxHeight: maxHeight,
          bgcolor: 'grey.900',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          p: 1,
        }}
      >
        {filteredLogs.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">
              {logs.length === 0 ? 'No logs yet. Waiting for deployment...' : 'No logs match your filters.'}
            </Typography>
          </Box>
        ) : (
          <Box>
            {filteredLogs.map((log, index) => {
              const timestamp = log.timestamp
                ? format(new Date(log.timestamp), 'HH:mm:ss.SSS')
                : '';
              const level = (log.level || 'info').toUpperCase();
              const levelColor = getLevelColor(log.level);
              const bgColor = getLevelBgColor(log.level);

              return (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    gap: 1,
                    py: 0.5,
                    px: 1,
                    borderRadius: 0.5,
                    bgcolor: bgColor,
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                    },
                  }}
                >
                  {/* Timestamp */}
                  <Typography
                    component="span"
                    sx={{
                      color: '#666',
                      minWidth: 90,
                      fontSize: '0.8rem',
                    }}
                  >
                    {timestamp}
                  </Typography>

                  {/* Level Badge */}
                  <Typography
                    component="span"
                    sx={{
                      color: levelColor,
                      fontWeight: 600,
                      minWidth: 60,
                      fontSize: '0.8rem',
                    }}
                  >
                    [{level}]
                  </Typography>

                  {/* Message */}
                  <Typography
                    component="span"
                    sx={{
                      color: '#e0e0e0',
                      flexGrow: 1,
                      fontSize: '0.85rem',
                      wordBreak: 'break-word',
                    }}
                  >
                    {log.message || ''}
                  </Typography>
                </Box>
              );
            })}
            <div ref={logsEndRef} />
          </Box>
        )}
      </Box>
    </Paper>
  );
});

export default LogViewer;
