/**
 * useNetworkConfig Hook
 * 
 * Handles VPC and network configuration including:
 * - VPC discovery and management
 * - Subnet configuration
 * - Security groups
 * - NAT Gateway and endpoints
 * - Load balancer configuration
 * 
 * Migrated from CloudDeploymentToolkit.jsx
 */

import { useState, useCallback } from 'react';
import api from '../../../services/api';

export function useNetworkConfig() {
  const [vpcs, setVpcs] = useState([]);
  const [subnets, setSubnets] = useState([]);
  const [securityGroups, setSecurityGroups] = useState([]);
  const [loadBalancers, setLoadBalancers] = useState([]);
  const [ec2Instances, setEc2Instances] = useState([]);
  const [vpcDetails, setVpcDetails] = useState(null);
  const [internalLbTemplates, setInternalLbTemplates] = useState({});
  const [loading, setLoading] = useState({
    vpcs: false,
    subnets: false,
    securityGroups: false,
    loadBalancers: false,
    ec2Instances: false,
  });
  const [error, setError] = useState(null);

  /**
   * Fetch VPCs for a credential/region
   */
  const fetchVPCs = useCallback(async (credentialId, region) => {
    if (!credentialId) return [];
    
    setLoading(prev => ({ ...prev, vpcs: true }));
    setError(null);
    
    try {
      const response = await api.get(`/container-deployments/vpc/${credentialId}/list`, {
        params: { region }
      });
      const vpcList = response.data.data?.vpcs || [];
      setVpcs(vpcList);
      return vpcList;
    } catch (err) {
      console.error('Failed to fetch VPCs:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, vpcs: false }));
    }
  }, []);

  /**
   * Fetch subnets for a VPC or credential
   */
  const fetchSubnets = useCallback(async (credentialId, region, options = {}) => {
    if (!credentialId) return [];
    
    setLoading(prev => ({ ...prev, subnets: true }));
    
    try {
      const params = { region };
      if (options.vpcId) params.vpcId = options.vpcId;
      if (options.subnetIds) params.subnetIds = options.subnetIds.join(',');
      
      const response = await api.get(`/container-deployments/vpc/${credentialId}/subnets`, { params });
      const subnetList = response.data.data?.subnets || [];
      setSubnets(subnetList);
      return subnetList;
    } catch (err) {
      console.error('Failed to fetch subnets:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, subnets: false }));
    }
  }, []);

  /**
   * Fetch security groups
   */
  const fetchSecurityGroups = useCallback(async (credentialId, region, options = {}) => {
    if (!credentialId) return [];
    
    setLoading(prev => ({ ...prev, securityGroups: true }));
    
    try {
      const params = { region };
      if (options.vpcId) params.vpcId = options.vpcId;
      if (options.securityGroupIds) {
        params.securityGroupIds = options.securityGroupIds.filter(Boolean).join(',');
      }
      
      const response = await api.get(`/container-deployments/vpc/${credentialId}/security-groups`, { params });
      const sgList = response.data.data?.securityGroups || [];
      setSecurityGroups(sgList);
      return sgList;
    } catch (err) {
      console.error('Failed to fetch security groups:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, securityGroups: false }));
    }
  }, []);

  /**
   * Fetch EC2 instances (for SSM target selection)
   */
  const fetchEC2Instances = useCallback(async (credentialId, region, options = {}) => {
    if (!credentialId) return [];
    
    setLoading(prev => ({ ...prev, ec2Instances: true }));
    
    try {
      const params = { region };
      if (options.vpcId) params.vpcId = options.vpcId;
      // Only get running instances that support SSM
      params.filters = 'running,ssm-enabled';
      
      const response = await api.get(`/container-deployments/ec2/${credentialId}/instances`, { params });
      const instanceList = response.data.data?.instances || [];
      setEc2Instances(instanceList);
      return instanceList;
    } catch (err) {
      console.error('Failed to fetch EC2 instances:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, ec2Instances: false }));
    }
  }, []);

  /**
   * Fetch load balancers
   */
  const fetchLoadBalancers = useCallback(async (credentialId, region, vpcId = null) => {
    if (!credentialId) return [];
    
    setLoading(prev => ({ ...prev, loadBalancers: true }));
    
    try {
      const params = { region };
      if (vpcId) params.vpcId = vpcId;
      
      const response = await api.get(`/container-deployments/vpc/${credentialId}/load-balancers`, { params });
      const lbList = response.data.data?.loadBalancers || [];
      setLoadBalancers(lbList);
      return lbList;
    } catch (err) {
      console.error('Failed to fetch load balancers:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, loadBalancers: false }));
    }
  }, []);

  /**
   * Get VPC details
   */
  const fetchVpcDetails = useCallback(async (credentialId, region, vpcId) => {
    if (!credentialId || !vpcId) return null;
    
    try {
      const response = await api.get(`/container-deployments/vpc/${credentialId}/details`, {
        params: { region, vpcId }
      });
      const details = response.data.data;
      setVpcDetails(details);
      return details;
    } catch (err) {
      console.error('Failed to fetch VPC details:', err);
      return null;
    }
  }, []);

  /**
   * Fetch internal load balancer templates
   */
  const fetchInternalLbTemplates = useCallback(async () => {
    try {
      const response = await api.get('/container-deployments/templates/internal-lb');
      const templates = response.data.data?.templates || {};
      setInternalLbTemplates(templates);
      return templates;
    } catch (err) {
      console.error('Failed to fetch internal LB templates:', err);
      return {};
    }
  }, []);

  /**
   * Create a new security group
   */
  const createSecurityGroup = useCallback(async (credentialId, config) => {
    try {
      const response = await api.post(`/container-deployments/vpc/${credentialId}/security-groups`, config);
      return {
        success: true,
        data: response.data.data,
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to create security group',
      };
    }
  }, []);

  /**
   * Add rule to security group
   */
  const addSecurityGroupRule = useCallback(async (credentialId, securityGroupId, rule) => {
    try {
      const response = await api.post(`/container-deployments/vpc/${credentialId}/security-groups/${securityGroupId}/rules`, rule);
      return {
        success: true,
        data: response.data.data,
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to add rule',
      };
    }
  }, []);

  /**
   * Categorize subnets by type (public/private)
   */
  const categorizeSubnets = useCallback(() => {
    const publicSubnets = subnets.filter(s => 
      s.mapPublicIpOnLaunch || 
      s.tags?.some(t => t.Key === 'Type' && t.Value === 'public') ||
      s.name?.toLowerCase().includes('public')
    );
    
    const privateSubnets = subnets.filter(s => 
      !s.mapPublicIpOnLaunch && 
      !s.tags?.some(t => t.Key === 'Type' && t.Value === 'public') &&
      !s.name?.toLowerCase().includes('public')
    );
    
    return { publicSubnets, privateSubnets };
  }, [subnets]);

  /**
   * Get subnets by availability zone
   */
  const getSubnetsByAZ = useCallback(() => {
    const byAZ = {};
    subnets.forEach(subnet => {
      const az = subnet.availabilityZone || 'unknown';
      if (!byAZ[az]) byAZ[az] = [];
      byAZ[az].push(subnet);
    });
    return byAZ;
  }, [subnets]);

  return {
    // State
    vpcs,
    subnets,
    securityGroups,
    loadBalancers,
    ec2Instances,
    vpcDetails,
    internalLbTemplates,
    loading,
    error,
    
    // Actions
    fetchVPCs,
    fetchSubnets,
    fetchSecurityGroups,
    fetchEC2Instances,
    fetchLoadBalancers,
    fetchVpcDetails,
    fetchInternalLbTemplates,
    createSecurityGroup,
    addSecurityGroupRule,
    
    // Helpers
    categorizeSubnets,
    getSubnetsByAZ,
  };
}

export default useNetworkConfig;
