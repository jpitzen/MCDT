import React from 'react';
import { Box, TextField, FormHelperText, Link, Typography } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const AWSCredentialForm = ({ onSubmit, initialValues = {} }) => {
  const validationSchema = Yup.object({
    name: Yup.string()
      .required('Credential name is required')
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name must not exceed 100 characters'),
    awsAccountId: Yup.string()
      .required('AWS Account ID is required')
      .matches(/^\d{12}$/, 'AWS Account ID must be exactly 12 digits'),
    accessKeyId: Yup.string()
      .required('Access Key ID is required')
      .matches(/^AKIA[0-9A-Z]{16}$/, 'Invalid AWS Access Key format'),
    secretAccessKey: Yup.string()
      .required('Secret Access Key is required')
      .min(40, 'Secret Access Key appears to be invalid'),
    awsRegion: Yup.string()
      .required('Region is required')
      .oneOf(
        [
          'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
          'eu-west-1', 'eu-central-1', 'eu-north-1',
          'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-south-1',
        ],
        'Invalid AWS region'
      ),
    description: Yup.string().max(500, 'Description must not exceed 500 characters'),
  });

  const formik = useFormik({
    initialValues: {
      name: initialValues.name || '',
      awsAccountId: initialValues.awsAccountId || '',
      accessKeyId: initialValues.accessKeyId || '',
      secretAccessKey: initialValues.secretAccessKey || '',
      awsRegion: initialValues.awsRegion || initialValues.region || 'us-east-1',
      description: initialValues.description || '',
    },
    validationSchema,
    onSubmit,
  });

  return (
    <Box component="form" onSubmit={formik.handleSubmit} sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
        AWS Credentials
      </Typography>

      <TextField
        fullWidth
        label="Credential Name"
        name="name"
        placeholder="e.g., Production AWS Account"
        value={formik.values.name}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.name && Boolean(formik.errors.name)}
        helperText={formik.touched.name && formik.errors.name}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="AWS Account ID"
        name="awsAccountId"
        placeholder="123456789012 (12 digits)"
        value={formik.values.awsAccountId}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.awsAccountId && Boolean(formik.errors.awsAccountId)}
        helperText={formik.touched.awsAccountId && formik.errors.awsAccountId}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Access Key ID"
        name="accessKeyId"
        type="password"
        placeholder="AKIA..."
        value={formik.values.accessKeyId}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.accessKeyId && Boolean(formik.errors.accessKeyId)}
        helperText={formik.touched.accessKeyId && formik.errors.accessKeyId}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Secret Access Key"
        name="secretAccessKey"
        type="password"
        value={formik.values.secretAccessKey}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.secretAccessKey && Boolean(formik.errors.secretAccessKey)}
        helperText={formik.touched.secretAccessKey && formik.errors.secretAccessKey}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        select
        label="AWS Region"
        name="awsRegion"
        value={formik.values.awsRegion}
        onChange={formik.handleChange}
        error={formik.touched.awsRegion && Boolean(formik.errors.awsRegion)}
        helperText={formik.touched.awsRegion && formik.errors.awsRegion}
        sx={{ mb: 2 }}
        SelectProps={{
          native: true,
        }}
      >
        <option value="us-east-1">US East (N. Virginia) - us-east-1</option>
        <option value="us-east-2">US East (Ohio) - us-east-2</option>
        <option value="us-west-1">US West (N. California) - us-west-1</option>
        <option value="us-west-2">US West (Oregon) - us-west-2</option>
        <option value="eu-west-1">Europe (Ireland) - eu-west-1</option>
        <option value="eu-central-1">Europe (Frankfurt) - eu-central-1</option>
        <option value="eu-north-1">Europe (Stockholm) - eu-north-1</option>
        <option value="ap-southeast-1">Asia Pacific (Singapore) - ap-southeast-1</option>
        <option value="ap-southeast-2">Asia Pacific (Sydney) - ap-southeast-2</option>
        <option value="ap-northeast-1">Asia Pacific (Tokyo) - ap-northeast-1</option>
        <option value="ap-south-1">Asia Pacific (Mumbai) - ap-south-1</option>
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
        <Link href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html" target="_blank" rel="noopener noreferrer">
          create AWS Access Keys
        </Link>
      </FormHelperText>

      {formik.errors.submit && (
        <FormHelperText error sx={{ mt: 2 }}>
          {formik.errors.submit}
        </FormHelperText>
      )}

      <input type="hidden" name="cloudProvider" value="aws" />
    </Box>
  );
};

export default AWSCredentialForm;
