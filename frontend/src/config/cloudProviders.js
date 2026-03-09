/**
 * Cloud Provider Configuration
 * 
 * Centralized configuration for all supported cloud providers including
 * commercial and government regions for each provider.
 */

export const CLOUD_PROVIDERS = {
  aws: {
    name: 'Amazon Web Services',
    icon: '🌩️',
    color: '#FF9900',
    commercialRegions: [
      { value: 'us-east-1', label: 'US East (N. Virginia)' },
      { value: 'us-east-2', label: 'US East (Ohio)' },
      { value: 'us-west-1', label: 'US West (N. California)' },
      { value: 'us-west-2', label: 'US West (Oregon)' },
      { value: 'ca-central-1', label: 'Canada (Central)' },
      { value: 'eu-west-1', label: 'Europe (Ireland)' },
      { value: 'eu-west-2', label: 'Europe (London)' },
      { value: 'eu-west-3', label: 'Europe (Paris)' },
      { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
      { value: 'eu-north-1', label: 'Europe (Stockholm)' },
      { value: 'eu-south-1', label: 'Europe (Milan)' },
      { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
      { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
      { value: 'ap-northeast-3', label: 'Asia Pacific (Osaka)' },
      { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
      { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
      { value: 'ap-southeast-3', label: 'Asia Pacific (Jakarta)' },
      { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
      { value: 'sa-east-1', label: 'South America (São Paulo)' },
      { value: 'me-south-1', label: 'Middle East (Bahrain)' },
      { value: 'af-south-1', label: 'Africa (Cape Town)' },
    ],
    governmentRegions: [
      { value: 'us-gov-west-1', label: 'AWS GovCloud (US-West)' },
      { value: 'us-gov-east-1', label: 'AWS GovCloud (US-East)' },
    ],
    chinaRegions: [
      { value: 'cn-north-1', label: 'China (Beijing)' },
      { value: 'cn-northwest-1', label: 'China (Ningxia)' },
    ],
  },
  azure: {
    name: 'Microsoft Azure',
    icon: '☁️',
    color: '#0089D6',
    commercialRegions: [
      { value: 'eastus', label: 'East US' },
      { value: 'eastus2', label: 'East US 2' },
      { value: 'westus', label: 'West US' },
      { value: 'westus2', label: 'West US 2' },
      { value: 'westus3', label: 'West US 3' },
      { value: 'centralus', label: 'Central US' },
      { value: 'northcentralus', label: 'North Central US' },
      { value: 'southcentralus', label: 'South Central US' },
      { value: 'westeurope', label: 'West Europe' },
      { value: 'northeurope', label: 'North Europe' },
      { value: 'uksouth', label: 'UK South' },
      { value: 'ukwest', label: 'UK West' },
      { value: 'francecentral', label: 'France Central' },
      { value: 'germanywestcentral', label: 'Germany West Central' },
      { value: 'norwayeast', label: 'Norway East' },
      { value: 'swedencentral', label: 'Sweden Central' },
      { value: 'switzerlandnorth', label: 'Switzerland North' },
      { value: 'eastasia', label: 'East Asia' },
      { value: 'southeastasia', label: 'Southeast Asia' },
      { value: 'japaneast', label: 'Japan East' },
      { value: 'japanwest', label: 'Japan West' },
      { value: 'koreacentral', label: 'Korea Central' },
      { value: 'australiaeast', label: 'Australia East' },
      { value: 'australiasoutheast', label: 'Australia Southeast' },
      { value: 'centralindia', label: 'Central India' },
      { value: 'southindia', label: 'South India' },
      { value: 'brazilsouth', label: 'Brazil South' },
      { value: 'canadacentral', label: 'Canada Central' },
      { value: 'canadaeast', label: 'Canada East' },
    ],
    governmentRegions: [
      { value: 'usgovvirginia', label: 'US Gov Virginia' },
      { value: 'usgovtexas', label: 'US Gov Texas' },
      { value: 'usgovarizona', label: 'US Gov Arizona' },
      { value: 'usdodeast', label: 'US DoD East' },
      { value: 'usdodcentral', label: 'US DoD Central' },
    ],
  },
  gcp: {
    name: 'Google Cloud Platform',
    icon: '🔷',
    color: '#4285F4',
    commercialRegions: [
      { value: 'us-central1', label: 'US Central (Iowa)' },
      { value: 'us-east1', label: 'US East (South Carolina)' },
      { value: 'us-east4', label: 'US East (N. Virginia)' },
      { value: 'us-east5', label: 'US East (Columbus)' },
      { value: 'us-west1', label: 'US West (Oregon)' },
      { value: 'us-west2', label: 'US West (Los Angeles)' },
      { value: 'us-west3', label: 'US West (Salt Lake City)' },
      { value: 'us-west4', label: 'US West (Las Vegas)' },
      { value: 'us-south1', label: 'US South (Dallas)' },
      { value: 'northamerica-northeast1', label: 'Canada (Montréal)' },
      { value: 'northamerica-northeast2', label: 'Canada (Toronto)' },
      { value: 'southamerica-east1', label: 'South America (São Paulo)' },
      { value: 'europe-west1', label: 'Europe (Belgium)' },
      { value: 'europe-west2', label: 'Europe (London)' },
      { value: 'europe-west3', label: 'Europe (Frankfurt)' },
      { value: 'europe-west4', label: 'Europe (Netherlands)' },
      { value: 'europe-west6', label: 'Europe (Zurich)' },
      { value: 'europe-north1', label: 'Europe (Finland)' },
      { value: 'europe-central2', label: 'Europe (Warsaw)' },
      { value: 'asia-east1', label: 'Asia (Taiwan)' },
      { value: 'asia-east2', label: 'Asia (Hong Kong)' },
      { value: 'asia-northeast1', label: 'Asia (Tokyo)' },
      { value: 'asia-northeast2', label: 'Asia (Osaka)' },
      { value: 'asia-northeast3', label: 'Asia (Seoul)' },
      { value: 'asia-southeast1', label: 'Asia (Singapore)' },
      { value: 'asia-southeast2', label: 'Asia (Jakarta)' },
      { value: 'asia-south1', label: 'Asia (Mumbai)' },
      { value: 'asia-south2', label: 'Asia (Delhi)' },
      { value: 'australia-southeast1', label: 'Australia (Sydney)' },
      { value: 'australia-southeast2', label: 'Australia (Melbourne)' },
      { value: 'me-west1', label: 'Middle East (Tel Aviv)' },
    ],
    governmentRegions: [], // GCP does not have separate government regions in same account structure
  },
  digitalocean: {
    name: 'DigitalOcean',
    icon: '🌊',
    color: '#0080FF',
    commercialRegions: [
      { value: 'nyc1', label: 'New York 1' },
      { value: 'nyc3', label: 'New York 3' },
      { value: 'sfo2', label: 'San Francisco 2' },
      { value: 'sfo3', label: 'San Francisco 3' },
      { value: 'tor1', label: 'Toronto 1' },
      { value: 'ams3', label: 'Amsterdam 3' },
      { value: 'lon1', label: 'London 1' },
      { value: 'fra1', label: 'Frankfurt 1' },
      { value: 'sgp1', label: 'Singapore 1' },
      { value: 'blr1', label: 'Bangalore 1' },
      { value: 'syd1', label: 'Sydney 1' },
    ],
    governmentRegions: [], // DigitalOcean does not have government regions
  },
  linode: {
    name: 'Linode (Akamai)',
    icon: '🟢',
    color: '#00A95C',
    commercialRegions: [
      { value: 'us-east', label: 'Newark, NJ' },
      { value: 'us-central', label: 'Dallas, TX' },
      { value: 'us-west', label: 'Fremont, CA' },
      { value: 'us-southeast', label: 'Atlanta, GA' },
      { value: 'us-iad', label: 'Washington, DC' },
      { value: 'us-ord', label: 'Chicago, IL' },
      { value: 'us-sea', label: 'Seattle, WA' },
      { value: 'us-lax', label: 'Los Angeles, CA' },
      { value: 'us-mia', label: 'Miami, FL' },
      { value: 'ca-central', label: 'Toronto, Canada' },
      { value: 'eu-west', label: 'London, UK' },
      { value: 'eu-central', label: 'Frankfurt, Germany' },
      { value: 'ap-west', label: 'Mumbai, India' },
      { value: 'ap-south', label: 'Singapore' },
      { value: 'ap-southeast', label: 'Sydney, Australia' },
      { value: 'ap-northeast', label: 'Tokyo, Japan' },
      { value: 'ap-northeast-2', label: 'Osaka, Japan' },
      { value: 'br-gru', label: 'São Paulo, Brazil' },
      { value: 'nl-ams', label: 'Amsterdam, Netherlands' },
      { value: 'se-sto', label: 'Stockholm, Sweden' },
      { value: 'es-mad', label: 'Madrid, Spain' },
      { value: 'it-mil', label: 'Milan, Italy' },
      { value: 'fr-par', label: 'Paris, France' },
      { value: 'id-cgk', label: 'Jakarta, Indonesia' },
      { value: 'in-maa', label: 'Chennai, India' },
    ],
    governmentRegions: [], // Linode does not have government regions
  },
};

/**
 * Get regions for a specific cloud provider
 * @param {string} provider - Cloud provider key (aws, azure, gcp, digitalocean, linode)
 * @param {string} accountType - Account type: 'commercial', 'government', or 'all'
 * @returns {Array} Array of region objects with value and label
 */
export function getRegionsForProvider(provider, accountType = 'all') {
  const providerConfig = CLOUD_PROVIDERS[provider?.toLowerCase()];
  if (!providerConfig) {
    return [];
  }

  const commercial = providerConfig.commercialRegions || [];
  const government = providerConfig.governmentRegions || [];
  const china = providerConfig.chinaRegions || [];

  switch (accountType) {
    case 'commercial':
      return commercial;
    case 'government':
      return government;
    case 'china':
      return china;
    case 'all':
    default:
      // Return all regions with grouping labels if government regions exist
      if (government.length > 0) {
        return [
          { value: '__commercial__', label: '── Commercial Regions ──', disabled: true },
          ...commercial,
          { value: '__government__', label: '── Government Regions ──', disabled: true },
          ...government,
          ...(china.length > 0 ? [
            { value: '__china__', label: '── China Regions ──', disabled: true },
            ...china,
          ] : []),
        ];
      }
      return commercial;
  }
}

/**
 * Get provider info (name, icon, color)
 * @param {string} provider - Cloud provider key
 * @returns {object} Provider info object
 */
export function getProviderInfo(provider) {
  const config = CLOUD_PROVIDERS[provider?.toLowerCase()];
  if (!config) {
    return {
      name: provider || 'Unknown',
      icon: '☁️',
      color: '#666666',
    };
  }
  return {
    name: config.name,
    icon: config.icon,
    color: config.color,
  };
}

/**
 * Get default region for a provider
 * @param {string} provider - Cloud provider key
 * @returns {string} Default region value
 */
export function getDefaultRegion(provider) {
  const defaults = {
    aws: 'us-east-1',
    azure: 'eastus',
    gcp: 'us-central1',
    digitalocean: 'nyc1',
    linode: 'us-east',
  };
  return defaults[provider?.toLowerCase()] || 'us-east-1';
}

/**
 * Get all supported cloud providers
 * @returns {Array} Array of provider keys
 */
export function getSupportedProviders() {
  return Object.keys(CLOUD_PROVIDERS);
}

/**
 * Get cloud-specific terminology for UI display
 * @param {string} cloudProvider - Cloud provider key (aws, azure, gcp, digitalocean, linode)
 * @returns {object} Terminology object with cloud-specific terms
 */
export function getCloudTerminology(cloudProvider) {
  const terminology = {
    aws: {
      providerName: 'AWS',
      cluster: 'EKS Cluster',
      clusterService: 'Amazon EKS',
      nodeGroup: 'Node Group',
      region: 'AWS Region',
      vpc: 'VPC',
      subnet: 'Subnet',
      gateway: 'NAT Gateway',
      lb: 'Application Load Balancer',
      blockStorage: 'EBS Volume',
      fileStorage: 'Amazon EFS',
      objectStorage: 'S3 Bucket',
      containerRegistry: 'Amazon ECR',
      database: 'Amazon RDS',
      resourceGroup: 'Resource Tags',
      vm: 'EC2 Instance',
      availabilityZone: 'Availability Zone',
      multiAZ: 'Multi-AZ',
      multiAZDesc: 'Automatically replicates data to a standby instance in a different Availability Zone.',
      iamRole: 'IAM Role',
      clusterRole: 'EKS Cluster Role',
      nodeRole: 'EKS Node Role',
      networkingRole: 'Load Balancer Controller',
      clusterPlaceholder: 'my-eks-cluster',
      resourcePrefix: 'AWS resources (IAM roles, VPC, etc.)',
      controlPlane: 'EKS control plane',
      workerNodes: 'EKS worker nodes',
      securityGroup: 'Security Group',
      clusterSecurityGroup: 'EKS Cluster Security Group',
      nodeSecurityGroup: 'EKS Node Security Group',
    },
    azure: {
      providerName: 'Azure',
      cluster: 'AKS Cluster',
      clusterService: 'Azure Kubernetes Service',
      nodeGroup: 'Node Pool',
      region: 'Azure Region',
      vpc: 'Virtual Network',
      subnet: 'Subnet',
      gateway: 'NAT Gateway',
      lb: 'Azure Load Balancer',
      blockStorage: 'Managed Disk',
      fileStorage: 'Azure Files',
      objectStorage: 'Blob Container',
      containerRegistry: 'Azure Container Registry',
      database: 'Azure Database',
      resourceGroup: 'Resource Group',
      vm: 'Virtual Machine',
      availabilityZone: 'Availability Zone',
      multiAZ: 'Zone Redundant',
      multiAZDesc: 'Automatically replicates data across Azure Availability Zones for high availability.',
      iamRole: 'Service Principal',
      clusterRole: 'AKS Cluster Identity',
      nodeRole: 'Managed Identity',
      networkingRole: 'Network Contributor',
      clusterPlaceholder: 'my-aks-cluster',
      resourcePrefix: 'Azure resources (Resource Group, VNet, etc.)',
      controlPlane: 'AKS control plane',
      workerNodes: 'AKS node pools',
      securityGroup: 'Network Security Group',
      clusterSecurityGroup: 'AKS Cluster NSG',
      nodeSecurityGroup: 'AKS Node NSG',
    },
    gcp: {
      providerName: 'Google Cloud',
      cluster: 'GKE Cluster',
      clusterService: 'Google Kubernetes Engine',
      nodeGroup: 'Node Pool',
      region: 'GCP Region',
      vpc: 'VPC Network',
      subnet: 'Subnet',
      gateway: 'Cloud NAT',
      lb: 'Cloud Load Balancer',
      blockStorage: 'Persistent Disk',
      fileStorage: 'Filestore',
      objectStorage: 'Cloud Storage Bucket',
      containerRegistry: 'Artifact Registry',
      database: 'Cloud SQL',
      resourceGroup: 'Project Labels',
      vm: 'Compute Engine VM',
      availabilityZone: 'Zone',
      multiAZ: 'High Availability',
      multiAZDesc: 'Automatically replicates data across multiple zones within the region.',
      iamRole: 'Service Account',
      clusterRole: 'GKE Cluster Service Account',
      nodeRole: 'GKE Node Service Account',
      networkingRole: 'Network Admin',
      clusterPlaceholder: 'my-gke-cluster',
      resourcePrefix: 'GCP resources (VPC, Service Account, etc.)',
      controlPlane: 'GKE control plane',
      workerNodes: 'GKE node pools',
      securityGroup: 'Firewall Rule',
      clusterSecurityGroup: 'GKE Cluster Firewall',
      nodeSecurityGroup: 'GKE Node Firewall',
    },
    digitalocean: {
      providerName: 'DigitalOcean',
      cluster: 'DOKS Cluster',
      clusterService: 'DigitalOcean Kubernetes',
      nodeGroup: 'Node Pool',
      region: 'Datacenter Region',
      vpc: 'VPC',
      subnet: 'Subnet',
      gateway: 'NAT Gateway',
      lb: 'Load Balancer',
      blockStorage: 'Block Storage Volume',
      fileStorage: 'Spaces',
      objectStorage: 'Spaces Bucket',
      containerRegistry: 'Container Registry',
      database: 'Managed Database',
      resourceGroup: 'Project',
      vm: 'Droplet',
      availabilityZone: 'Datacenter',
      multiAZ: 'Standby Node',
      multiAZDesc: 'Adds a standby node for automatic failover and high availability.',
      iamRole: 'API Token',
      clusterRole: 'DOKS Cluster Token',
      nodeRole: 'Node Token',
      networkingRole: 'Load Balancer Access',
      clusterPlaceholder: 'my-doks-cluster',
      resourcePrefix: 'DigitalOcean resources (VPC, Load Balancer, etc.)',
      controlPlane: 'DOKS control plane',
      workerNodes: 'DOKS node pools',
      securityGroup: 'Firewall',
      clusterSecurityGroup: 'DOKS Cluster Firewall',
      nodeSecurityGroup: 'DOKS Node Firewall',
    },
    linode: {
      providerName: 'Linode (Akamai)',
      cluster: 'LKE Cluster',
      clusterService: 'Linode Kubernetes Engine',
      nodeGroup: 'Node Pool',
      region: 'Linode Region',
      vpc: 'VPC',
      subnet: 'Subnet',
      gateway: 'NAT',
      lb: 'NodeBalancer',
      blockStorage: 'Block Storage Volume',
      fileStorage: 'Object Storage',
      objectStorage: 'Object Storage Bucket',
      containerRegistry: 'Container Registry',
      database: 'Managed Database',
      resourceGroup: 'Tags',
      vm: 'Linode',
      availabilityZone: 'Datacenter',
      multiAZ: 'High Availability',
      multiAZDesc: 'Enables high availability mode for automatic failover.',
      iamRole: 'API Token',
      clusterRole: 'LKE Cluster Token',
      nodeRole: 'Node Token',
      networkingRole: 'NodeBalancer Access',
      clusterPlaceholder: 'my-lke-cluster',
      resourcePrefix: 'Linode resources (VPC, NodeBalancer, etc.)',
      controlPlane: 'LKE control plane',
      workerNodes: 'LKE node pools',
      securityGroup: 'Cloud Firewall',
      clusterSecurityGroup: 'LKE Cluster Firewall',
      nodeSecurityGroup: 'LKE Node Firewall',
    },
  };
  return terminology[cloudProvider?.toLowerCase()] || terminology.aws;
}

export default CLOUD_PROVIDERS;
