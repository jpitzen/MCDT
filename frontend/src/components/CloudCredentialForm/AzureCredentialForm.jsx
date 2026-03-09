import React from 'react';
import { Box, TextField, FormHelperText, Link, Typography } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const AzureCredentialForm = ({ onSubmit, initialValues = {} }) => {
  const validationSchema = Yup.object({
    name: Yup.string()
      .required('Credential name is required')
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name must not exceed 100 characters'),
    subscriptionId: Yup.string()
      .required('Subscription ID is required')
      .matches(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, 'Invalid Subscription ID format (UUID)'),
    clientId: Yup.string()
      .required('Client ID is required')
      .matches(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, 'Invalid Client ID format (UUID)'),
    clientSecret: Yup.string()
      .required('Client Secret is required')
      .min(20, 'Client Secret appears to be invalid'),
    tenantId: Yup.string()
      .required('Tenant ID is required')
      .matches(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, 'Invalid Tenant ID format (UUID)'),
    vaultName: Yup.string()
      .required('Key Vault name is required')
      .matches(/^[a-zA-Z0-9-]{3,24}$/, 'Vault name must be 3-24 alphanumeric characters or hyphens'),
    region: Yup.string()
      .required('Region is required')
      .oneOf(
        [
          'eastus', 'eastus2', 'westus', 'westus2',
          'northeurope', 'westeurope', 'southeastasia', 'southcentralus',
        ],
        'Invalid Azure region'
      ),
    description: Yup.string().max(500, 'Description must not exceed 500 characters'),
  });

  const formik = useFormik({
    initialValues: {
      name: initialValues.name || '',
      subscriptionId: initialValues.subscriptionId || '',
      clientId: initialValues.clientId || '',
      clientSecret: initialValues.clientSecret || '',
      tenantId: initialValues.tenantId || '',
      vaultName: initialValues.vaultName || '',
      region: initialValues.region || 'eastus',
      description: initialValues.description || '',
    },
    validationSchema,
    onSubmit,
  });

  return (
    <Box component="form" onSubmit={formik.handleSubmit} sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
        Azure Credentials
      </Typography>

      <TextField
        fullWidth
        label="Credential Name"
        name="name"
        placeholder="e.g., Production Azure Account"
        value={formik.values.name}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.name && Boolean(formik.errors.name)}
        helperText={formik.touched.name && formik.errors.name}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Subscription ID"
        name="subscriptionId"
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        value={formik.values.subscriptionId}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.subscriptionId && Boolean(formik.errors.subscriptionId)}
        helperText={formik.touched.subscriptionId && formik.errors.subscriptionId}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Client ID (Application ID)"
        name="clientId"
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        value={formik.values.clientId}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.clientId && Boolean(formik.errors.clientId)}
        helperText={formik.touched.clientId && formik.errors.clientId}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Client Secret"
        name="clientSecret"
        type="password"
        value={formik.values.clientSecret}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.clientSecret && Boolean(formik.errors.clientSecret)}
        helperText={formik.touched.clientSecret && formik.errors.clientSecret}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Tenant ID (Directory ID)"
        name="tenantId"
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        value={formik.values.tenantId}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.tenantId && Boolean(formik.errors.tenantId)}
        helperText={formik.touched.tenantId && formik.errors.tenantId}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Key Vault Name"
        name="vaultName"
        placeholder="my-vault-name"
        value={formik.values.vaultName}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.vaultName && Boolean(formik.errors.vaultName)}
        helperText={formik.touched.vaultName && formik.errors.vaultName}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        select
        label="Azure Region"
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
        <option value="eastus">East US</option>
        <option value="eastus2">East US 2</option>
        <option value="westus">West US</option>
        <option value="westus2">West US 2</option>
        <option value="northeurope">North Europe</option>
        <option value="westeurope">West Europe</option>
        <option value="southeastasia">Southeast Asia</option>
        <option value="southcentralus">South Central US</option>
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
        <Link href="https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app" target="_blank" rel="noopener noreferrer">
          create Azure App Registration
        </Link>
      </FormHelperText>

      {formik.errors.submit && (
        <FormHelperText error sx={{ mt: 2 }}>
          {formik.errors.submit}
        </FormHelperText>
      )}

      <input type="hidden" name="cloudProvider" value="azure" />
    </Box>
  );
};

export default AzureCredentialForm;
