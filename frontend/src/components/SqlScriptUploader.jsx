import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Switch,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Description as FileIcon,
} from '@mui/icons-material';

const SqlScriptUploader = ({ scripts = [], onChange, dbEngine = 'postgres' }) => {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  // Get engine-specific syntax notes
  const getSyntaxNotes = () => {
    const notes = {
      postgres: {
        name: 'PostgreSQL',
        notes: [
          'Supports transactions for DDL (CREATE, ALTER, DROP)',
          'Use $$ for function bodies to avoid quote escaping',
          'SERIAL type for auto-increment columns',
          'Remember to GRANT permissions after creating objects',
        ],
        example: 'CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100));',
      },
      mysql: {
        name: 'MySQL',
        notes: [
          'DDL statements auto-commit (no rollback for CREATE/ALTER/DROP)',
          'Use AUTO_INCREMENT for auto-increment columns',
          'Table names are case-sensitive on Linux',
          'Use backticks for reserved words: `order`, `user`',
        ],
        example: 'CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100));',
      },
      sqlserver: {
        name: 'SQL Server',
        notes: [
          'Supports transactions for DDL',
          'Use IDENTITY for auto-increment columns',
          'GO statements separate batches (optional in scripts)',
          'Use [brackets] for reserved words or spaces',
        ],
        example: 'CREATE TABLE users (id INT IDENTITY(1,1) PRIMARY KEY, name NVARCHAR(100));',
      },
      mssql: {
        name: 'SQL Server',
        notes: [
          'Supports transactions for DDL',
          'Use IDENTITY for auto-increment columns',
          'GO statements separate batches (optional in scripts)',
          'Use [brackets] for reserved words or spaces',
        ],
        example: 'CREATE TABLE users (id INT IDENTITY(1,1) PRIMARY KEY, name NVARCHAR(100));',
      },
    };
    return notes[dbEngine] || notes.postgres;
  };

  const validateSqlFile = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedExtensions = ['.sql', '.txt'];
    
    if (file.size > maxSize) {
      return 'File size exceeds 10MB limit';
    }
    
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return 'Only .sql and .txt files are allowed';
    }
    
    return null;
  };

  const handleFileSelect = useCallback(async (files) => {
    setError('');
    const fileArray = Array.from(files);
    const validFiles = [];
    
    for (const file of fileArray) {
      const validationError = validateSqlFile(file);
      if (validationError) {
        setError(`${file.name}: ${validationError}`);
        continue;
      }
      
      try {
        const content = await readFileContent(file);
        validFiles.push({
          id: `${Date.now()}-${Math.random()}`,
          name: file.name,
          content: content,
          executionOrder: scripts.length + validFiles.length,
          haltOnError: true,
          runInTransaction: dbEngine === 'postgres' || dbEngine === 'sqlserver' || dbEngine === 'mssql',
          timeoutSeconds: 300,
          size: file.size,
        });
      } catch (err) {
        setError(`Failed to read ${file.name}: ${err.message}`);
      }
    }
    
    if (validFiles.length > 0) {
      onChange([...scripts, ...validFiles]);
    }
  }, [scripts, onChange, dbEngine]);

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDeleteScript = (scriptId) => {
    const updatedScripts = scripts
      .filter(s => s.id !== scriptId)
      .map((s, index) => ({ ...s, executionOrder: index }));
    onChange(updatedScripts);
  };

  const handleMoveScript = (scriptId, direction) => {
    const index = scripts.findIndex(s => s.id === scriptId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === scripts.length - 1)
    ) {
      return;
    }

    const newScripts = [...scripts];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newScripts[index], newScripts[targetIndex]] = [newScripts[targetIndex], newScripts[index]];
    
    const reorderedScripts = newScripts.map((s, idx) => ({ ...s, executionOrder: idx }));
    onChange(reorderedScripts);
  };

  const handleScriptSettingChange = (scriptId, field, value) => {
    const updatedScripts = scripts.map(s =>
      s.id === scriptId ? { ...s, [field]: value } : s
    );
    onChange(updatedScripts);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const syntaxInfo = getSyntaxNotes();

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        Database Scripts
      </Typography>
      
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Upload SQL scripts to initialize your database after infrastructure deployment.
        Scripts execute in order after the database instance is validated as accessible.
      </Typography>

      {/* Syntax Information */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
          {syntaxInfo.name} Syntax Notes:
        </Typography>
        {syntaxInfo.notes.map((note, idx) => (
          <Typography key={idx} variant="caption" component="div">
            • {note}
          </Typography>
        ))}
        <Typography variant="caption" component="div" sx={{ mt: 1, fontFamily: 'monospace', bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
          Example: {syntaxInfo.example}
        </Typography>
      </Alert>

      {/* Upload Area */}
      <Paper
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        sx={{
          p: 4,
          mb: 3,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          bgcolor: dragOver ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.3s',
        }}
      >
        <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="body1" gutterBottom>
          Drag & drop SQL files here
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          or
        </Typography>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadIcon />}
        >
          Browse Files
          <input
            type="file"
            hidden
            multiple
            accept=".sql,.txt"
            onChange={handleFileInputChange}
          />
        </Button>
        <Typography variant="caption" display="block" sx={{ mt: 2 }} color="textSecondary">
          Accepts .sql and .txt files (max 10MB each)
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Scripts List */}
      {scripts.length > 0 ? (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
            Uploaded Scripts ({scripts.length})
          </Typography>
          
          <Box>
            {scripts.map((script, index) => (
              <Card key={script.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="flex-start">
                    {/* Script Info */}
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <FileIcon color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {script.name}
                        </Typography>
                        <Chip
                          label={`Order: ${script.executionOrder + 1}`}
                          size="small"
                          color="primary"
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Size: {formatFileSize(script.size)} | Lines: {script.content.split('\n').length}
                      </Typography>
                    </Grid>

                    {/* Controls */}
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
                        <Tooltip title="Move up">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleMoveScript(script.id, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUpIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        
                        <Tooltip title="Move down">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleMoveScript(script.id, 'down')}
                              disabled={index === scripts.length - 1}
                            >
                              <ArrowDownIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        
                        <Tooltip title="Delete script">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteScript(script.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Grid>

                    {/* Script Settings */}
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={script.haltOnError}
                              onChange={(e) => handleScriptSettingChange(script.id, 'haltOnError', e.target.checked)}
                              size="small"
                            />
                          }
                          label={<Typography variant="caption">Halt on error</Typography>}
                        />
                        
                        {(dbEngine === 'postgres' || dbEngine === 'sqlserver' || dbEngine === 'mssql') && (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={script.runInTransaction}
                                onChange={(e) => handleScriptSettingChange(script.id, 'runInTransaction', e.target.checked)}
                                size="small"
                              />
                            }
                            label={<Typography variant="caption">Run in transaction</Typography>}
                          />
                        )}
                        
                        <TextField
                          label="Timeout (seconds)"
                          type="number"
                          size="small"
                          value={script.timeoutSeconds}
                          onChange={(e) => handleScriptSettingChange(script.id, 'timeoutSeconds', parseInt(e.target.value) || 300)}
                          sx={{ width: 150 }}
                          inputProps={{ min: 30, max: 3600 }}
                        />
                      </Box>
                    </Grid>

                    {/* Script Preview */}
                    <Grid item xs={12}>
                      <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>
                        Preview (first 3 lines):
                      </Typography>
                      <Paper sx={{ p: 1, bgcolor: 'action.hover' }}>
                        <Typography
                          variant="caption"
                          component="pre"
                          sx={{
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            margin: 0,
                            maxHeight: 80,
                            overflow: 'hidden',
                          }}
                        >
                          {script.content.split('\n').slice(0, 3).join('\n')}
                          {script.content.split('\n').length > 3 && '\n...'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Execution Order:</strong> Scripts will execute sequentially in the order shown above.
              Use the arrow buttons to reorder. All scripts run after the database instance is validated as accessible.
            </Typography>
          </Alert>
        </Box>
      ) : (
        <Alert severity="info">
          <Typography variant="body2">
            No scripts uploaded yet. Database scripts are optional but recommended for initial schema setup.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default SqlScriptUploader;
