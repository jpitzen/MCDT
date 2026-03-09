import React from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Typography,
} from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import SpeedIcon from '@mui/icons-material/Speed';
import { useWizard } from '../WizardContext';

/**
 * ModeToggle - Switches between Guided and Expert modes
 * 
 * Guided Mode: Step-by-step wizard with validation at each step
 * Expert Mode: Tab-based navigation for experienced users
 */
export default function ModeToggle({ size = 'medium' }) {
  const { state, setMode } = useWizard();
  const { mode } = state;

  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleModeChange}
        size={size}
        sx={{
          '& .MuiToggleButton-root': {
            textTransform: 'none',
            px: 2,
          },
        }}
      >
        <ToggleButton value="guided">
          <Tooltip title="Step-by-step wizard with guided validation" arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ExploreIcon fontSize="small" />
              <Typography variant="body2">Guided</Typography>
            </Box>
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="expert">
          <Tooltip title="Tab-based navigation for experienced users" arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon fontSize="small" />
              <Typography variant="body2">Expert</Typography>
            </Box>
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
