import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip,
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useWizard } from '../../WizardContext';

/**
 * SqlScripts - Manage SQL initialization and migration scripts
 * Part of Phase 3: Database Configuration
 */
function SqlScripts() {
  const { state, dispatch } = useWizard();
  const { sqlScripts = [], databaseConfig = {} } = state;
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [currentScript, setCurrentScript] = useState(null);
  const [scriptContent, setScriptContent] = useState('');
  const [scriptName, setScriptName] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');

  // Handle file upload
  const handleFileUpload = useCallback((event) => {
    const files = Array.from(event.target.files);
    
    files.forEach((file) => {
      if (file.name.endsWith('.sql')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newScript = {
            id: Date.now() + Math.random(),
            name: file.name,
            description: `Uploaded from ${file.name}`,
            content: e.target.result,
            type: file.name.toLowerCase().includes('migration') ? 'migration' : 'init',
            createdAt: new Date().toISOString(),
            size: file.size,
          };
          
          dispatch({
            type: 'SET_SQL_SCRIPTS',
            payload: [...sqlScripts, newScript],
          });
        };
        reader.readAsText(file);
      }
    });
    
    // Reset the input
    event.target.value = '';
  }, [sqlScripts, dispatch]);

  // Open editor for new or existing script
  const openEditor = (script = null) => {
    if (script) {
      setCurrentScript(script);
      setScriptName(script.name);
      setScriptDescription(script.description);
      setScriptContent(script.content);
    } else {
      setCurrentScript(null);
      setScriptName('');
      setScriptDescription('');
      setScriptContent('-- Enter your SQL script here\n');
    }
    setEditorOpen(true);
  };

  // Save script from editor
  const saveScript = () => {
    if (!scriptName.trim()) return;
    
    const scriptData = {
      id: currentScript?.id || Date.now(),
      name: scriptName.endsWith('.sql') ? scriptName : `${scriptName}.sql`,
      description: scriptDescription,
      content: scriptContent,
      type: scriptName.toLowerCase().includes('migration') ? 'migration' : 'init',
      createdAt: currentScript?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      size: new Blob([scriptContent]).size,
    };

    if (currentScript) {
      // Update existing
      dispatch({
        type: 'SET_SQL_SCRIPTS',
        payload: sqlScripts.map(s => s.id === currentScript.id ? scriptData : s),
      });
    } else {
      // Add new
      dispatch({
        type: 'SET_SQL_SCRIPTS',
        payload: [...sqlScripts, scriptData],
      });
    }

    setEditorOpen(false);
    setCurrentScript(null);
  };

  // Delete script
  const deleteScript = (id) => {
    dispatch({
      type: 'SET_SQL_SCRIPTS',
      payload: sqlScripts.filter(s => s.id !== id),
    });
  };

  // Copy script content to clipboard
  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
  };

  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const initScripts = sqlScripts.filter(s => s.type === 'init');
  const migrationScripts = sqlScripts.filter(s => s.type === 'migration');

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CodeIcon color="primary" />
        SQL Scripts
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload or create SQL scripts for database initialization and migrations. 
        Scripts will be executed in order during deployment.
      </Typography>

      {/* Database Status */}
      {!databaseConfig.enabled && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Database is not enabled. SQL scripts can still be prepared for future use.
        </Alert>
      )}

      {/* Upload and Create Actions */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          component="label"
        >
          Upload SQL Files
          <input
            type="file"
            hidden
            multiple
            accept=".sql"
            onChange={handleFileUpload}
          />
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => openEditor()}
        >
          Create New Script
        </Button>
      </Box>

      {/* Scripts List */}
      {sqlScripts.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <DescriptionIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No SQL scripts added yet
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Upload .sql files or create scripts manually
          </Typography>
        </Card>
      ) : (
        <>
          {/* Initialization Scripts */}
          {initScripts.length > 0 && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ pb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Initialization Scripts ({initScripts.length})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Run once during initial database setup
                </Typography>
              </CardContent>
              <List dense>
                {initScripts.map((script, index) => (
                  <React.Fragment key={script.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemIcon>
                        <DescriptionIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={script.name}
                        secondary={
                          <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <span>{script.description || 'No description'}</span>
                            <Chip label={formatSize(script.size)} size="small" variant="outlined" />
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Copy content">
                          <IconButton edge="end" onClick={() => copyToClipboard(script.content)}>
                            <ContentCopyIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton edge="end" onClick={() => openEditor(script)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton edge="end" onClick={() => deleteScript(script.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Card>
          )}

          {/* Migration Scripts */}
          {migrationScripts.length > 0 && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ pb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Migration Scripts ({migrationScripts.length})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Run in sequence to update database schema
                </Typography>
              </CardContent>
              <List dense>
                {migrationScripts.map((script, index) => (
                  <React.Fragment key={script.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemIcon>
                        <PlayArrowIcon color="secondary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={index + 1} size="small" color="secondary" />
                            {script.name}
                          </Box>
                        }
                        secondary={
                          <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <span>{script.description || 'No description'}</span>
                            <Chip label={formatSize(script.size)} size="small" variant="outlined" />
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Copy content">
                          <IconButton edge="end" onClick={() => copyToClipboard(script.content)}>
                            <ContentCopyIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton edge="end" onClick={() => openEditor(script)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton edge="end" onClick={() => deleteScript(script.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Card>
          )}
        </>
      )}

      {/* Summary */}
      {sqlScripts.length > 0 && (
        <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            icon={<CheckCircleIcon />}
            label={`${sqlScripts.length} script${sqlScripts.length !== 1 ? 's' : ''} ready`}
            color="success"
            size="small"
          />
          {initScripts.length > 0 && (
            <Chip 
              label={`${initScripts.length} init`}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
          {migrationScripts.length > 0 && (
            <Chip 
              label={`${migrationScripts.length} migration${migrationScripts.length !== 1 ? 's' : ''}`}
              color="secondary"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
      )}

      {/* Script Editor Dialog */}
      <Dialog 
        open={editorOpen} 
        onClose={() => setEditorOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentScript ? 'Edit SQL Script' : 'Create SQL Script'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Script Name"
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              placeholder="001_create_tables.sql"
              helperText="Include 'migration' in the name for migration scripts"
            />
            <TextField
              fullWidth
              label="Description"
              value={scriptDescription}
              onChange={(e) => setScriptDescription(e.target.value)}
              placeholder="Creates initial database tables"
            />
            <TextField
              fullWidth
              multiline
              rows={15}
              label="SQL Content"
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              placeholder="-- Enter your SQL script here"
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={saveScript}
            disabled={!scriptName.trim()}
          >
            Save Script
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SqlScripts;
