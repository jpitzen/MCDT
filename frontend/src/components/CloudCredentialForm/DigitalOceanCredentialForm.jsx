import React from 'react';
import { Box, TextField, FormHelperText, Link, Typography, Alert } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const DigitalOceanCredentialForm = ({ onSubmit, initialValues = {} }) => {
  const validationSchema = Yup.object({
    name: Yup.string()
      .required('Credential name is required')
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name must not exceed 100 characters'),
    apiToken: Yup.string()
      .required('API Token is required')
      .min(40, 'API Token appears to be invalid'),
    region: Yup.string()
      .required('Region is required')
      .oneOf(
        [
          'nyc1', 'nyc3', 'sfo1', 'sfo2', 'sfo3',
          'ams3', 'lon1', 'fra1', 'sgp1', 'blr1', 'tor1',
        ],
        'Invalid DigitalOcean region'
      ),
    description: Yup.string().max(500, 'Description must not exceed 500 characters'),
  });

  const formik = useFormik({
    initialValues: {
      name: initialValues.name || '',
      apiToken: initialValues.apiToken || '',
      region: initialValues.region || 'nyc3',
      description: initialValues.description || '',
    },
    validationSchema,
    onSubmit,
  });

  return (
    <Box component="form" onSubmit={formik.handleSubmit} sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
        DigitalOcean Credentials
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Your API token will be securely stored and never displayed again. Use it for automated deployments.
      </Alert>

      <TextField
        fullWidth
        label="Credential Name"
        name="name"
        placeholder="e.g., Production DigitalOcean Account"
        value={formik.values.name}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.name && Boolean(formik.errors.name)}
        helperText={formik.touched.name && formik.errors.name}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="API Token"
        name="apiToken"
        type="password"
        placeholder="dop_v1_..."
        value={formik.values.apiToken}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.apiToken && Boolean(formik.errors.apiToken)}
        helperText={formik.touched.apiToken && formik.errors.apiToken}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        select
        label="Default Region"
        name="region"
        value={formik.values.region}
        onChange={formik.handleChange}
        error={formik.touched.region && Boolean(formik.errors.region)}
        helperText={formik.touched.region && formik.errors.region}
        sx={{ mb: 2 }}
        SelectProps={{
          native: true,
        }}
      >
        <option value="nyc1">New York 1</option>
        <option value="nyc3">New York 3</option>
        <option value="sfo1">San Francisco 1</option>
        <option value="sfo2">San Francisco 2</option>
        <option value="sfo3">San Francisco 3</option>
        <option value="ams3">Amsterdam 3</option>
        <option value="lon1">London 1</option>
        <option value="fra1">Frankfurt 1</option>
        <option value="sgp1">Singapore 1</option>
        <option value="blr1">Bangalore 1</option>
        <option value="tor1">Toronto 1</option>
      </TextField>

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Description (Optional)"
        name="description"
        placeholder="Add notes about this credential..."
        value={formik.values.description}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.description && Boolean(formik.errors.description)}
        helperText={formik.touched.description && formik.errors.description}
        sx={{ mb: 2 }}
      />

      <FormHelperText>
        💡 Learn how to{' '}
        <Link href="https://docs.digitalocean.com/reference/api/create-personal-access-token/" target="_blank" rel="noopener noreferrer">
          create a DigitalOcean API Token
        </Link>
      </FormHelperText>

      {formik.errors.submit && (
        <FormHelperText error sx={{ mt: 2 }}>
          {formik.errors.submit}
        </FormHelperText>
      )}

      <input type="hidden" name="cloudProvider" value="digitalocean" />
    </Box>
  );
};

export default DigitalOceanCredentialForm;
