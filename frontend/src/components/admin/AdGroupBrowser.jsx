import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  CircularProgress,
  InputAdornment,
  Paper,
  Chip,
} from '@mui/material';
import {
  Group as GroupIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import api from '../../services/api';

/**
 * Reusable AD group browser / picker.
 *
 * Props:
 *   configId   – AD configuration id (required)
 *   onSelect   – callback(group) when a group is clicked
 *   selected   – currently selected group DN (for highlighting)
 *   sx         – optional sx override for root Box
 */
const AdGroupBrowser = ({ configId, onSelect, selected, sx }) => {
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = useCallback(
    async (query) => {
      if (!configId) return;
      if (!query || query.length < 2) {
        setGroups([]);
        setSearched(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await api.adConfig.searchGroups(configId, { search: query });
        setGroups(res.data?.data?.groups || []);
        setSearched(true);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to search groups');
        setGroups([]);
      } finally {
        setLoading(false);
      }
    },
    [configId],
  );

  const handleChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  return (
    <Box sx={{ ...sx }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search AD groups…"
        value={search}
        onChange={handleChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      {!loading && searched && groups.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No groups found
        </Typography>
      )}

      {groups.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 1, maxHeight: 260, overflow: 'auto' }}>
          <List dense disablePadding>
            {groups.map((g) => {
              const isSelected = selected === g.dn;
              return (
                <ListItem
                  button
                  key={g.dn}
                  selected={isSelected}
                  onClick={() => onSelect?.(g)}
                  sx={{ '&.Mui-selected': { bgcolor: 'action.selected' } }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <GroupIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={g.name || g.cn || g.dn}
                    secondary={g.dn}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: isSelected ? 600 : 400 }}
                    secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                  />
                  {g.memberCount != null && (
                    <Chip label={`${g.memberCount}`} size="small" variant="outlined" sx={{ ml: 1 }} />
                  )}
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default AdGroupBrowser;
