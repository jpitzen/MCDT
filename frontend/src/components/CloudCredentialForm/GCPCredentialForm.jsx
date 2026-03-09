import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormHelperText,
  Link,
  Typography,
  Alert,
  Button,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const GCPCredentialForm = ({ onSubmit, initialValues = {} }) => {
  const [showKeyInput, setShowKeyInput] = useState(false);

  const validationSchema = Yup.object({
    name: Yup.string()
      .required('Credential name is required')
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name must not exceed 100 characters'),
    projectId: Yup.string()
      .required('Project ID is required')
      .matches(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/, 'Invalid GCP Project ID format'),
    serviceAccountKey: Yup.string()
      .required('Service Account Key is required')
      .test('valid-json', 'Service Account Key must be valid JSON', (value) => {
        if (!value) return false;
        try {
          const parsed = JSON.parse(value);
          return parsed.type === 'service_account' && parsed.project_id && parsed.private_key;
        } catch {
          return false;
        }
      }),
    region: Yup.string()
      .required('Region is required')
      .oneOf(
        [
          'us-central1', 'us-east1', 'us-west1',
          'europe-west1', 'europe-west3', 'asia-east1', 'asia-southeast1',
        ],
        'Invalid GCP region'
      ),
    description: Yup.string().max(500, 'Description must not exceed 500 characters'),
  });

  const formik = useFormik({
    initialValues: {
      name: initialValues.name || '',
      projectId: initialValues.projectId || '',
      serviceAccountKey: initialValues.serviceAccountKey || '',
      region: initialValues.region || 'us-central1',
      description: initialValues.description || '',
    },
    validationSchema,
    onSubmit,
  });

  return (
    <Box component="form" onSubmit={formik.handleSubmit} sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
        Google Cloud Platform Credentials
      </Typography>

      <TextField
        fullWidth
        label="Credential Name"
        name="name"
        placeholder="e.g., Production GCP Account"
        value={formik.values.name}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.name && Boolean(formik.errors.name)}
        helperText={formik.touched.name && formik.errors.name}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Project ID"
        name="projectId"
        placeholder="my-project-12345"
        value={formik.values.projectId}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.projectId && Boolean(formik.errors.projectId)}
        helperText={formik.touched.projectId && formik.errors.projectId}
        sx={{ mb: 2 }}
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        Download your Service Account Key as JSON from GCP Console. Paste the entire JSON content below.
      </Alert>

      <TextField
        fullWidth
        multiline
        rows={8}
        label="Service Account Key (JSON)"
        name="serviceAccountKey"
        placeholder={`{
  "type": "service_account",
  "project_id": "my-project",
  "private_key_id": "...",
  ...
}`}
        value={formik.values.serviceAccountKey}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.serviceAccountKey && Boolean(formik.errors.serviceAccountKey)}
        helperText={formik.touched.serviceAccountKey && formik.errors.serviceAccountKey}
        sx={{ mb: 2, fontFamily: 'monospace', fontSize: '0.85rem' }}
      />

      <TextField
        fullWidth
        select
        label="GCP Region"
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
        <option value="us-central1">US Central 1</option>
        <option value="us-east1">US East 1</option>
        <option value="us-west1">US West 1</option>
        <option value="europe-west1">Europe West 1 (Belgium)</option>
        <option value="europe-west3">Europe West 3 (Frankfurt)</option>
        <option value="asia-east1">Asia East 1 (Taiwan)</option>
        <option value="asia-southeast1">Asia Southeast 1 (Singapore)</option>
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
        <Link href="https://cloud.google.com/docs/authentication/getting-started" target="_blank" rel="noopener noreferrer">
          create a GCP Service Account
        </Link>
      </FormHelperText>

      {formik.errors.submit && (
        <FormHelperText error sx={{ mt: 2 }}>
          {formik.errors.submit}
        </FormHelperText>
      )}

      <input type="hidden" name="cloudProvider" value="gcp" />
    </Box>
  );
};

export default GCPCredentialForm;
