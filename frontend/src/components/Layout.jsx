import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  CloudUpload as DeployIcon,
  Save as SaveIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Cloud as CloudIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  BrightnessAuto as AutoModeIcon,
  Terminal as TerminalIcon,
  BarChart as AnalyticsIcon,
  Monitor as MonitorIcon,
  ViewInAr as ContainerIcon,
  Rocket as K8sIcon,
  Business as AdIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemePreferences } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import useIdleTimeout from '../hooks/useIdleTimeout';
import { darkenHex, hexToRgba } from '../utils/colorHelpers';

const DRAWER_WIDTH = 250;
const CONTENT_MARGIN = 25;

const allMenuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/', roles: ['admin', 'approver', 'operator', 'viewer'] },
  { text: 'Credentials', icon: <SecurityIcon />, path: '/credentials', roles: ['admin', 'operator'] },
  { text: 'New Deployment', icon: <DeployIcon />, path: '/unified-wizard', roles: ['admin', 'operator'] },
  { text: 'Saved Deployments', icon: <SaveIcon />, path: '/deployment-drafts', roles: ['admin', 'approver', 'operator', 'viewer'] },
  { text: 'Clusters', icon: <StorageIcon />, path: '/clusters', roles: ['admin', 'approver', 'operator', 'viewer'] },
  { text: 'Containers', icon: <ContainerIcon />, path: '/containers', roles: ['admin', 'approver', 'operator', 'viewer'] },
  { text: 'Cloud Toolkit', icon: <K8sIcon />, path: '/cloud-toolkit', roles: ['admin', 'operator'] },
  { text: 'Monitor', icon: <MonitorIcon />, path: '/monitor', roles: ['admin', 'approver', 'operator', 'viewer'] },
  { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics', roles: ['admin', 'approver', 'operator', 'viewer'] },
  { text: 'SQL Interface', icon: <TerminalIcon />, path: '/sql-interface', roles: ['admin', 'operator'] },
];

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences, setPreferences, colors, effectiveMode } = useThemePreferences();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  // Idle session timeout (30 min, warning at 5 min remaining)
  const { showWarning, remainingSeconds, staySignedIn } = useIdleTimeout({
    timeoutMinutes: 30,
    warningMinutes: 5,
  });

  const userRole = user?.role || 'viewer';
  const menuItems = allMenuItems.filter((item) => item.roles.includes(userRole));
  const showSettings = userRole === 'admin';

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User';
  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    const modes = ['system', 'dark', 'light'];
    const currentIdx = modes.indexOf(preferences.mode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    setPreferences({ mode: nextMode });
  };

  const getThemeIcon = () => {
    if (preferences.mode === 'system') return <AutoModeIcon />;
    return effectiveMode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />;
  };

  const getThemeLabel = () => {
    if (preferences.mode === 'system') return `System (${effectiveMode})`;
    return effectiveMode === 'dark' ? 'Dark' : 'Light';
  };

  const isActivePath = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: 1201, bgcolor: colors.primary }}>
        <Toolbar>
          <CloudIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Cloud Deployment Platform
          </Typography>
          <Chip 
            label="Multi-Cloud" 
            size="small" 
            sx={{ mr: 2, bgcolor: colors.secondary, color: '#fff' }}
          />
          <Tooltip title={`Theme: ${getThemeLabel()} (click to cycle)`}>
            <IconButton color="inherit" size="small" sx={{ mr: 2 }} onClick={toggleTheme}>
              {getThemeIcon()}
            </IconButton>
          </Tooltip>
          <Avatar
            onClick={handleMenuOpen}
            sx={{ cursor: 'pointer', bgcolor: colors.secondary }}
          >
            {initials}
          </Avatar>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem disabled sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="body2" fontWeight="bold">{displayName}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                <Chip label={userRole.toUpperCase()} size="small" color="primary" variant="outlined" />
                {user?.authProvider && user.authProvider !== 'local' && (
                  <Chip
                    icon={<AdIcon sx={{ fontSize: 14 }} />}
                    label={user.authProvider.toUpperCase()}
                    size="small"
                    variant="outlined"
                    color="secondary"
                  />
                )}
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            mt: 8
          }
        }}
      >
        <Box
          sx={{
            p: 2,
            background: `linear-gradient(135deg, ${colors.headerBg}, ${darkenHex(colors.headerBg, 20)})`,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: '#fff', opacity: 0.9 }}>
            Navigation
          </Typography>
        </Box>
        <Divider />
        <List>
          {menuItems.map((item) => {
            const active = isActivePath(item.path);
            return (
              <ListItem
                button
                key={item.text}
                onClick={() => navigate(item.path)}
                sx={{
                  bgcolor: active ? hexToRgba(colors.primary, 0.15) : 'transparent',
                  borderRight: active ? `3px solid ${colors.primary}` : '3px solid transparent',
                  '&:hover': {
                    bgcolor: hexToRgba(colors.primary, 0.08),
                  },
                }}
              >
                <ListItemIcon sx={{ color: active ? colors.primary : undefined }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: active ? 600 : 400,
                    color: active ? colors.primary : undefined,
                  }}
                />
              {item.badge && (
                <Box
                  sx={{
                    ml: 1,
                    px: 1,
                    py: 0.25,
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    borderRadius: 1,
                    backgroundColor: colors.primary,
                    color: '#fff',
                  }}
                >
                  {item.badge}
                </Box>
              )}
            </ListItem>
            );
          })}
        </List>
        {showSettings && (
          <>
            <Divider sx={{ my: 2 }} />
            <List>
              {(() => {
                const settingsActive = isActivePath('/settings');
                return (
                  <ListItem
                    button
                    onClick={() => navigate('/settings')}
                    sx={{
                      bgcolor: settingsActive ? hexToRgba(colors.primary, 0.15) : 'transparent',
                      borderRight: settingsActive ? `3px solid ${colors.primary}` : '3px solid transparent',
                      '&:hover': {
                        bgcolor: hexToRgba(colors.primary, 0.08),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: settingsActive ? colors.primary : undefined }}>
                      <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="System Admin"
                      primaryTypographyProps={{
                        fontWeight: settingsActive ? 600 : 400,
                        color: settingsActive ? colors.primary : undefined,
                      }}
                    />
                  </ListItem>
                );
              })()}
            </List>
          </>
        )}
      </Drawer>

      {/* Main Content */}
      <Box
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          ml: `${CONTENT_MARGIN}px`,
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        {children}
      </Box>

      {/* Idle Session Warning Dialog */}
      <Dialog open={showWarning} disableEscapeKeyDown>
        <DialogTitle>Session Expiring</DialogTitle>
        <DialogContent>
          <Typography>
            Your session will expire in{' '}
            <strong>
              {remainingSeconds >= 60
                ? `${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s`
                : `${remainingSeconds}s`}
            </strong>{' '}
            due to inactivity.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { logout(); navigate('/login?reason=idle'); }}>
            Logout
          </Button>
          <Button variant="contained" onClick={staySignedIn}>
            Stay Signed In
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Layout;
