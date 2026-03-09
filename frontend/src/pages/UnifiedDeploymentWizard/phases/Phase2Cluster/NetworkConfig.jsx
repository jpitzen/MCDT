import React, { useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Chip,
  FormControlLabel,
  Switch,
  Button,
  IconButton,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import ComputerIcon from '@mui/icons-material/Computer';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useWizard } from '../../WizardContext';
import { useNetworkConfig } from '../../hooks';

// Default CIDR blocks
const DEFAULT_VPC_CIDR = '10.0.0.0/16';
const DEFAULT_SUBNETS = [
  { name: 'public-1', cidr: '10.0.1.0/24', type: 'public', az: 'a' },
  { name: 'public-2', cidr: '10.0.2.0/24', type: 'public', az: 'b' },
  { name: 'private-1', cidr: '10.0.10.0/24', type: 'private', az: 'a' },
  { name: 'private-2', cidr: '10.0.11.0/24', type: 'private', az: 'b' },
];

// Provider-aware terminology
const NETWORK_TERMS = {
  aws: {
    vpcLabel: 'VPC',
    vpcFull: 'Virtual Private Cloud',
    securityGroupLabel: 'Security Groups',
    securityGroupDesc: 'Creates control plane and worker node security groups with recommended rules',
    natLabel: 'NAT Gateway',
    natDesc: 'NAT Gateway allows private subnets to access the internet',
    natCostWarning: 'NAT Gateway costs ~$32/month per gateway plus data processing charges.',
    cidrLabel: 'VPC CIDR Block',
    nameLabel: 'VPC Name',
  },
  azure: {
    vpcLabel: 'VNet',
    vpcFull: 'Virtual Network',
    securityGroupLabel: 'Network Security Groups',
    securityGroupDesc: 'Creates NSGs for AKS subnet and database subnet with recommended rules',
    natLabel: 'NAT Gateway',
    natDesc: 'NAT Gateway provides outbound internet for private subnets',
    natCostWarning: 'NAT Gateway costs ~$32/month plus data processing charges.',
    cidrLabel: 'VNet Address Space',
    nameLabel: 'VNet Name',
  },
  gcp: {
    vpcLabel: 'VPC Network',
    vpcFull: 'VPC Network',
    securityGroupLabel: 'Firewall Rules',
    securityGroupDesc: 'Creates firewall rules for internal traffic, health checks, and ingress control',
    natLabel: 'Cloud NAT',
    natDesc: 'Cloud NAT provides outbound internet access for private GKE nodes',
    natCostWarning: 'Cloud NAT costs ~$0.044/hr per gateway plus data processing charges.',
    cidrLabel: 'Subnet CIDR',
    nameLabel: 'Network Name',
  },
  digitalocean: {
    vpcLabel: 'VPC',
    vpcFull: 'Virtual Private Cloud',
    securityGroupLabel: 'Firewalls',
    securityGroupDesc: 'Creates cloud firewalls with recommended inbound/outbound rules',
    natLabel: 'NAT Gateway',
    natDesc: 'DigitalOcean provides NAT through the VPC gateway',
    natCostWarning: 'VPC NAT is included at no additional cost.',
    cidrLabel: 'VPC IP Range',
    nameLabel: 'VPC Name',
  },
  linode: {
    vpcLabel: 'VPC',
    vpcFull: 'Virtual Private Cloud',
    securityGroupLabel: 'Cloud Firewalls',
    securityGroupDesc: 'Creates Linode cloud firewalls for cluster network security',
    natLabel: 'NAT',
    natDesc: 'Linode VPC includes built-in NAT for outbound internet access',
    natCostWarning: 'VPC NAT is included at no additional cost.',
    cidrLabel: 'VPC Subnet CIDR',
    nameLabel: 'VPC Label',
  },
};

export default function NetworkConfig() {
  const { state, updateNetworkConfig } = useWizard();
  const { vpcs, subnets: existingSubnets, ec2Instances, fetchVPCs, fetchSubnets, fetchEC2Instances, loading } = useNetworkConfig();
  const { networkConfig = {}, selectedCredential, clusterConfig = {}, securityGroups = [], cloudProvider = 'aws' } = state;

  const terms = NETWORK_TERMS[cloudProvider] || NETWORK_TERMS.aws;
  const region = selectedCredential?.awsRegion || state.clusterConfig?.region || 'us-west-2';
  const credentialId = selectedCredential?.id;
  const isExistingCluster = clusterConfig.useExistingCluster;

  // Load VPCs when using existing VPC mode
  useEffect(() => {
    if (networkConfig.vpcOption === 'existing' && credentialId && vpcs.length === 0) {
      fetchVPCs(credentialId, region);
    }
  }, [networkConfig.vpcOption, credentialId, region, vpcs.length, fetchVPCs]);

  // Load EC2 instances when SSM is selected
  useEffect(() => {
    const accessMethod = networkConfig.privateAccessMethod || 'ssm';
    if (accessMethod === 'ssm' && credentialId && ec2Instances.length === 0) {
      fetchEC2Instances(credentialId, region, { vpcId: networkConfig.existingVpcId });
    }
  }, [networkConfig.privateAccessMethod, credentialId, region, networkConfig.existingVpcId, ec2Instances.length, fetchEC2Instances]);

  // Load subnets when VPC is selected
  useEffect(() => {
    if (networkConfig.existingVpcId && credentialId) {
      fetchSubnets(credentialId, region, { vpcId: networkConfig.existingVpcId });
    }
  }, [networkConfig.existingVpcId, credentialId, region, fetchSubnets]);

  const handleChange = (field) => (event) => {
    updateNetworkConfig({ [field]: event.target.value });
  };

  const handleSwitchChange = (field) => (event) => {
    updateNetworkConfig({ [field]: event.target.checked });
  };

  const handleSubnetChange = (index, field, value) => {
    const subnets = [...(networkConfig.subnets || DEFAULT_SUBNETS)];
    subnets[index] = { ...subnets[index], [field]: value };
    updateNetworkConfig({ subnets });
  };

  const addSubnet = () => {
    const subnets = [...(networkConfig.subnets || DEFAULT_SUBNETS)];
    const newIndex = subnets.length + 1;
    subnets.push({
      name: `subnet-${newIndex}`,
      cidr: `10.0.${newIndex + 20}.0/24`,
      type: 'private',
      az: 'a',
    });
    updateNetworkConfig({ subnets });
  };

  const removeSubnet = (index) => {
    const subnets = [...(networkConfig.subnets || DEFAULT_SUBNETS)];
    subnets.splice(index, 1);
    updateNetworkConfig({ subnets });
  };

  const subnets = networkConfig.subnets || DEFAULT_SUBNETS;
  
  // Use existing subnets from API when using existing VPC
  const displaySubnets = networkConfig.vpcOption === 'existing' && existingSubnets.length > 0
    ? existingSubnets
    : subnets;

  // Validate VPC value - only use it if it exists in the options list
  const validatedVpcId = vpcs.length > 0 && networkConfig.existingVpcId
    && vpcs.some(vpc => (vpc.vpcId || vpc.id) === networkConfig.existingVpcId)
    ? networkConfig.existingVpcId
    : '';

  // Validate EC2 instance value - only use it if it exists in the options list  
  const validatedSsmInstance = ec2Instances.length > 0 && networkConfig.ssmTargetInstance
    && ec2Instances.some(instance => instance.instanceId === networkConfig.ssmTargetInstance)
    ? networkConfig.ssmTargetInstance
    : '';

  return (
    <Box>
      {/* Network Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {terms.vpcLabel} Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure the {terms.vpcFull} for your Kubernetes cluster
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{terms.vpcLabel} Option</InputLabel>
                <Select
                  value={networkConfig.vpcOption || 'new'}
                  onChange={handleChange('vpcOption')}
                  label={`${terms.vpcLabel} Option`}
                >
                  <MenuItem value="new">Create New {terms.vpcLabel}</MenuItem>
                  <MenuItem value="existing">Use Existing {terms.vpcLabel}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {networkConfig.vpcOption === 'existing' ? (
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>Existing VPC</InputLabel>
                    <Select
                      value={validatedVpcId}
                      onChange={handleChange('existingVpcId')}
                      label="Existing VPC"
                      disabled={loading.vpcs}
                    >
                      {vpcs.map((vpc) => (
                        <MenuItem key={vpc.vpcId || vpc.id} value={vpc.vpcId || vpc.id}>
                          {vpc.name || vpc.vpcId || vpc.id} - {vpc.cidrBlock || vpc.cidr}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <IconButton 
                    onClick={() => credentialId && fetchVPCs(credentialId, region)}
                    disabled={loading.vpcs || !credentialId}
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    {loading.vpcs ? <CircularProgress size={20} /> : <RefreshIcon />}
                  </IconButton>
                </Box>
              </Grid>
            ) : (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={terms.cidrLabel}
                    value={networkConfig.vpcCidr || DEFAULT_VPC_CIDR}
                    onChange={handleChange('vpcCidr')}
                    helperText="IPv4 CIDR block for the VPC (e.g., 10.0.0.0/16)"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={terms.nameLabel}
                    value={networkConfig.vpcName || ''}
                    onChange={handleChange('vpcName')}
                    placeholder={`${state.clusterConfig?.clusterName || 'cluster'}-vpc`}
                    helperText="Name tag for the VPC"
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={networkConfig.enableDnsHostnames !== false}
                    onChange={handleSwitchChange('enableDnsHostnames')}
                  />
                }
                label="Enable DNS Hostnames"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={networkConfig.enableDnsSupport !== false}
                    onChange={handleSwitchChange('enableDnsSupport')}
                  />
                }
                label="Enable DNS Support"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Subnet Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Subnets
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure public and private subnets across availability zones
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addSubnet}
              size="small"
            >
              Add Subnet
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Kubernetes requires at least 2 subnets in different availability zones.
              Public subnets are used for load balancers, private subnets for worker nodes.
            </Typography>
          </Alert>

          {displaySubnets.map((subnet, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Subnet Name"
                    value={subnet.name || subnet.subnetId || ''}
                    onChange={(e) => handleSubnetChange(index, 'name', e.target.value)}
                    disabled={networkConfig.vpcOption === 'existing'}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="CIDR Block"
                    value={subnet.cidr || subnet.cidrBlock || ''}
                    onChange={(e) => handleSubnetChange(index, 'cidr', e.target.value)}
                    disabled={networkConfig.vpcOption === 'existing'}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={subnet.type || (subnet.mapPublicIpOnLaunch ? 'public' : 'private')}
                      onChange={(e) => handleSubnetChange(index, 'type', e.target.value)}
                      label="Type"
                      disabled={networkConfig.vpcOption === 'existing'}
                    >
                      <MenuItem value="public">Public</MenuItem>
                      <MenuItem value="private">Private</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>AZ</InputLabel>
                    <Select
                      value={subnet.az || subnet.availabilityZone?.slice(-1) || 'a'}
                      onChange={(e) => handleSubnetChange(index, 'az', e.target.value)}
                      label="AZ"
                      disabled={networkConfig.vpcOption === 'existing'}
                    >
                      <MenuItem value="a">{region}a</MenuItem>
                      <MenuItem value="b">{region}b</MenuItem>
                      <MenuItem value="c">{region}c</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={2} sx={{ textAlign: 'right' }}>
                  <Chip
                    label={subnet.type || (subnet.mapPublicIpOnLaunch ? 'public' : 'private')}
                    color={(subnet.type === 'public' || subnet.mapPublicIpOnLaunch) ? 'warning' : 'success'}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  {networkConfig.vpcOption !== 'existing' && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeSubnet(index)}
                      disabled={displaySubnets.length <= 2}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Grid>
              </Grid>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Security / Firewall Rules */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {terms.securityGroupLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {isExistingCluster 
              ? `${terms.securityGroupLabel} detected from your existing cluster (validated in Phase 1)`
              : 'Configure network security rules for the cluster'}
          </Typography>

          {isExistingCluster ? (
            // Show detected security groups for existing cluster (read-only)
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Security groups were validated in Phase 1: Prerequisites
              </Alert>
              {securityGroups.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {securityGroups.map((sg, index) => (
                    <Chip
                      key={sg.id || sg.groupId || index}
                      label={`${sg.name || sg.groupName || 'Security Group'} ${sg.status === 'exists' ? '✓' : ''}`}
                      color={sg.status === 'exists' ? 'success' : 'default'}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Security groups from Phase 1 will be used for deployment.
                </Typography>
              )}
            </Box>
          ) : (
            // Show configuration options for new cluster
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={networkConfig.createSecurityGroups !== false}
                      onChange={handleSwitchChange('createSecurityGroups')}
                    />
                  }
                  label={`Create Default ${terms.securityGroupLabel}`}
                />
                <Typography variant="caption" display="block" color="text.secondary">
                  {terms.securityGroupDesc}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Allowed SSH CIDR"
                  value={networkConfig.sshCidr || '0.0.0.0/0'}
                  onChange={handleChange('sshCidr')}
                  helperText="CIDR block for SSH access (restrict in production)"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Allowed API Server CIDR"
                  value={networkConfig.apiServerCidr || '0.0.0.0/0'}
                  onChange={handleChange('apiServerCidr')}
                  helperText="CIDR block for Kubernetes API access"
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* NAT / Outbound Internet */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {terms.natLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {terms.natDesc}
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={networkConfig.enableNatGateway !== false}
                    onChange={handleSwitchChange('enableNatGateway')}
                  />
                }
                label={`Enable ${terms.natLabel}`}
              />
            </Grid>

            {networkConfig.enableNatGateway !== false && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>{terms.natLabel} Mode</InputLabel>
                  <Select
                    value={networkConfig.natGatewayMode || 'single'}
                    onChange={handleChange('natGatewayMode')}
                    label={`${terms.natLabel} Mode`}
                  >
                    <MenuItem value="single">Single NAT Gateway (Cost Effective)</MenuItem>
                    <MenuItem value="multi-az">One per AZ (High Availability)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>

          {networkConfig.enableNatGateway !== false && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {terms.natCostWarning}
                {networkConfig.natGatewayMode === 'multi-az' && ' Multi-AZ mode will create multiple gateways.'}
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Private Cluster Access — provider-aware */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Private Cluster Access
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure how to access the private cluster and internal resources (database, K8s API)
          </Typography>

          {/* Provider-specific recommendation */}
          <Alert severity="success" sx={{ mb: 3 }}>
            {cloudProvider === 'aws' && (
              <>
                <Typography variant="subtitle2">Recommended: AWS Systems Manager (SSM)</Typography>
                <Typography variant="body2" component="div">
                  SSM Session Manager provides secure access without bastion hosts. Benefits:
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>No EC2 bastion cost (~$30+/month saved)</li>
                    <li>No inbound security group rules needed</li>
                    <li>IAM-based access control</li>
                    <li>Full audit logging in CloudTrail</li>
                    <li>Port forwarding for DB access, K8s API, etc.</li>
                  </ul>
                </Typography>
              </>
            )}
            {cloudProvider === 'azure' && (
              <>
                <Typography variant="subtitle2">Recommended: Azure Bastion</Typography>
                <Typography variant="body2" component="div">
                  Azure Bastion provides secure RDP/SSH connectivity without public IPs. Benefits:
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>No public IP on target VMs</li>
                    <li>Azure AD integrated authentication</li>
                    <li>Protection against port scanning</li>
                    <li>Centralized audit logging in Azure Monitor</li>
                    <li>Built-in tunneling for DB access, K8s API, etc.</li>
                  </ul>
                </Typography>
              </>
            )}
            {cloudProvider === 'gcp' && (
              <>
                <Typography variant="subtitle2">Recommended: Identity-Aware Proxy (IAP)</Typography>
                <Typography variant="body2" component="div">
                  IAP TCP forwarding provides secure tunnel access. Benefits:
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>No bastion host needed</li>
                    <li>Google identity-based access control</li>
                    <li>Full audit logging in Cloud Audit Logs</li>
                    <li>TCP forwarding for DB access, K8s API, etc.</li>
                  </ul>
                </Typography>
              </>
            )}
            {(cloudProvider === 'digitalocean' || cloudProvider === 'linode') && (
              <>
                <Typography variant="subtitle2">Recommended: VPN or kubectl proxy</Typography>
                <Typography variant="body2" component="div">
                  Use a VPN connection or kubectl proxy for private cluster access. Benefits:
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Encrypted traffic over VPN tunnel</li>
                    <li>kubectl proxy for API access without VPN</li>
                    <li>Port forwarding for DB and service access</li>
                  </ul>
                </Typography>
              </>
            )}
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Access Method</InputLabel>
                <Select
                  value={networkConfig.privateAccessMethod || (cloudProvider === 'aws' ? 'ssm' : cloudProvider === 'azure' ? 'azure-bastion' : cloudProvider === 'gcp' ? 'iap' : 'vpn')}
                  onChange={handleChange('privateAccessMethod')}
                  label="Access Method"
                >
                  {cloudProvider === 'aws' && (
                    <MenuItem value="ssm">
                      <Box>
                        <Typography>SSM Session Manager (Recommended)</Typography>
                        <Typography variant="caption" color="text.secondary">
                          No bastion needed, IAM-based, full audit logging
                        </Typography>
                      </Box>
                    </MenuItem>
                  )}
                  {cloudProvider === 'azure' && (
                    <MenuItem value="azure-bastion">
                      <Box>
                        <Typography>Azure Bastion (Recommended)</Typography>
                        <Typography variant="caption" color="text.secondary">
                          No public IPs, Azure AD auth, centralized audit
                        </Typography>
                      </Box>
                    </MenuItem>
                  )}
                  {cloudProvider === 'gcp' && (
                    <MenuItem value="iap">
                      <Box>
                        <Typography>Identity-Aware Proxy (Recommended)</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Google identity-based, TCP forwarding, Cloud Audit Logs
                        </Typography>
                      </Box>
                    </MenuItem>
                  )}
                  <MenuItem value="bastion">
                    <Box>
                      <Typography>Bastion Host {cloudProvider === 'azure' ? '(Jump Box)' : '(Legacy)'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Requires a dedicated VM, security group management
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="vpn">
                    <Box>
                      <Typography>VPN Connection</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Site-to-site or point-to-site VPN tunnel
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* AWS SSM Options */}
            {cloudProvider === 'aws' && (networkConfig.privateAccessMethod || 'ssm') === 'ssm' && (
              <>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={networkConfig.enableVpcEndpoints !== false}
                        onChange={handleSwitchChange('enableVpcEndpoints')}
                      />
                    }
                    label="Create VPC Endpoints for SSM"
                  />
                  <Typography variant="caption" display="block" color="text.secondary">
                    Required for SSM in private subnets. Creates endpoints for: ssm, ssmmessages, ec2messages
                  </Typography>
                </Grid>

                {/* EC2 Instance Picker for SSM */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <FormControl fullWidth>
                      <InputLabel>SSM Target Instance</InputLabel>
                      <Select
                        value={validatedSsmInstance}
                        onChange={handleChange('ssmTargetInstance')}
                        label="SSM Target Instance"
                        disabled={loading.ec2Instances}
                        startAdornment={<ComputerIcon sx={{ mr: 1, color: 'action.active' }} />}
                      >
                        <MenuItem value="">
                          <em>Select an EC2 instance for port forwarding</em>
                        </MenuItem>
                        {ec2Instances.map((instance) => (
                          <MenuItem key={instance.instanceId} value={instance.instanceId}>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography variant="body2">
                                {instance.name || instance.instanceId}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {instance.instanceId} • {instance.instanceType} • {instance.privateIpAddress}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <IconButton 
                      onClick={() => credentialId && fetchEC2Instances(credentialId, region, { vpcId: networkConfig.existingVpcId })}
                      disabled={loading.ec2Instances || !credentialId}
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      {loading.ec2Instances ? <CircularProgress size={20} /> : <RefreshIcon />}
                    </IconButton>
                  </Box>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                    Select an existing EC2 instance to use as the SSM port forwarding target
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Port Forwarding Templates
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    After deployment, use SSM port forwarding to access these services locally:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    <Chip label="PostgreSQL → localhost:5433" size="small" variant="outlined" />
                    <Chip label="K8s API → localhost:6443" size="small" variant="outlined" />
                    <Chip label="Redis → localhost:6379" size="small" variant="outlined" />
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2" component="div">
                      <strong>Example SSM Port Forward Command:</strong>
                      <Box 
                        component="code" 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mt: 1, 
                          p: 1, 
                          bgcolor: 'action.hover', 
                          borderRadius: 1, 
                          fontFamily: 'monospace', 
                          fontSize: '0.85rem' 
                        }}
                      >
                        <span>
                          aws ssm start-session --target {networkConfig.ssmTargetInstance || 'i-xxxxx'} --document-name AWS-StartPortForwardingSession --parameters portNumber=5432,localPortNumber=5433
                        </span>
                        <Tooltip title="Copy to clipboard">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              const cmd = `aws ssm start-session --target ${networkConfig.ssmTargetInstance || 'i-xxxxx'} --document-name AWS-StartPortForwardingSession --parameters portNumber=5432,localPortNumber=5433`;
                              navigator.clipboard.writeText(cmd);
                            }}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Typography>
                  </Alert>
                </Grid>
              </>
            )}

            {/* Azure Private Link option */}
            {cloudProvider === 'azure' && networkConfig.privateAccessMethod === 'azure-bastion' && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={networkConfig.enablePrivateLink !== false}
                      onChange={handleSwitchChange('enablePrivateLink')}
                    />
                  }
                  label="Enable Azure Private Link Endpoints"
                />
                <Typography variant="caption" display="block" color="text.secondary">
                  Creates private endpoints for AKS API server, Azure SQL, and ACR within your VNet
                </Typography>
              </Grid>
            )}

            {/* GCP Private Service Connect option */}
            {cloudProvider === 'gcp' && networkConfig.privateAccessMethod === 'iap' && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={networkConfig.enablePrivateServiceConnect !== false}
                      onChange={handleSwitchChange('enablePrivateServiceConnect')}
                    />
                  }
                  label="Enable Private Service Connect"
                />
                <Typography variant="caption" display="block" color="text.secondary">
                  Creates private connectivity to GKE API, Cloud SQL, and GCR within your VPC
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
