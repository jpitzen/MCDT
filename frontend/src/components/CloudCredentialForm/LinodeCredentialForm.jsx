import React from 'react';
import { Box, TextField, FormHelperText, Link, Typography, Alert } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const LinodeCredentialForm = ({ onSubmit, initialValues = {} }) => {
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
          'us-east', 'us-southeast', 'us-south', 'us-central', 'us-west',
          'eu-west', 'eu-central', 'ap-south', 'ap-southeast', 'ca-central',
        ],
        'Invalid Linode region'
      ),
    description: Yup.string().max(500, 'Description must not exceed 500 characters'),
  });

  const formik = useFormik({
    initialValues: {
      name: initialValues.name || '',
      apiToken: initialValues.apiToken || '',
      region: initialValues.region || 'us-east',
      description: initialValues.description || '',
    },
    validationSchema,
    onSubmit,
  });

  return (
    <Box component="form" onSubmit={formik.handleSubmit} sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
        Linode Credentials
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Your API token will be securely stored and never displayed again. Use it for automated deployments.
      </Alert>

      <TextField
        fullWidth
        label="Credential Name"
        name="name"
        placeholder="e.g., Production Linode Account"
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
        placeholder="Your Linode API Token"
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
        <option value="us-east">US East (Newark, NJ)</option>
        <option value="us-southeast">US Southeast (Atlanta, GA)</option>
        <option value="us-south">US South (Dallas, TX)</option>
        <option value="us-central">US Central (Fremont, CA)</option>
        <option value="us-west">US West (Fremont, CA)</option>
        <option value="eu-west">EU West (London, UK)</option>
        <option value="eu-central">EU Central (Frankfurt, DE)</option>
        <option value="ap-south">AP South (Singapore)</option>
        <option value="ap-southeast">AP Southeast (Tokyo, JP)</option>
        <option value="ca-central">CA Central (Toronto, CA)</option>
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
        <Link href="https://www.linode.com/docs/products/tools/api/get-started/" target="_blank" rel="noopener noreferrer">
          create a Linode API Token
        </Link>
      </FormHelperText>

      {formik.errors.submit && (
        <FormHelperText error sx={{ mt: 2 }}>
          {formik.errors.submit}
        </FormHelperText>
      )}

      <input type="hidden" name="cloudProvider" value="linode" />
    </Box>
  );
};

export default LinodeCredentialForm;
