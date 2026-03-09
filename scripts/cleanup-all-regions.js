#!/usr/bin/env node

/**
 * Comprehensive Multi-Region AWS Cleanup Script
 * 
 * This script cleans up AWS resources from all regions:
 * - US-EAST-1: All VPCs and security groups (Phase 1 created resources)
 * - US-EAST-2: Nothing (only default VPC exists)
 * - US-WEST-1: IAM roles and security groups ONLY (keeps VPCs, ECR, RDS)
 * 
 * Usage: node cleanup-all-regions.js [--dry-run] [--force]
 */

const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runAwsCommand(cmd, ignoreErrors = false) {
  try {
    const result = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return result.trim();
  } catch (error) {
    if (!ignoreErrors) {
      console.error(`Command failed: ${cmd}`);
      console.error(error.stderr || error.message);
    }
    return null;
  }
}

function runAwsCommandJson(cmd, ignoreErrors = false) {
  const result = runAwsCommand(cmd, ignoreErrors);
  if (result) {
    try {
      return JSON.parse(result);
    } catch {
      return null;
    }
  }
  return null;
}

// ============================================================================
// IAM ROLE CLEANUP (Global - not region-specific)
// ============================================================================

async function cleanupIamRoles() {
  log('\n========================================', 'cyan');
  log('  IAM ROLES CLEANUP', 'cyan');
  log('========================================', 'cyan');
  
  const rolesToDelete = [
    'usw1-zlps-k8s-01-aws-lb-controller-role',
    'usw1-zlps-k8s-01-cluster-autoscaler-role',
    'usw1-zlps-k8s-01-cluster-role',
    'usw1-zlps-k8s-01-ebs-csi-driver-role',
    'usw1-zlps-k8s-01-efs-csi-driver-role',
    'usw1-zlps-k8s-01-node-group-role',
    'usw1-zlps-k8s-01-node-role'
  ];
  
  for (const roleName of rolesToDelete) {
    log(`\nProcessing role: ${roleName}`, 'yellow');
    
    // Check if role exists
    const roleExists = runAwsCommand(`aws iam get-role --role-name ${roleName} --query "Role.RoleName" --output text`, true);
    if (!roleExists) {
      log(`  Role does not exist - skipping`, 'green');
      continue;
    }
    
    if (dryRun) {
      log(`  [DRY RUN] Would delete role: ${roleName}`, 'magenta');
      
      // List attached policies
      const attachedPolicies = runAwsCommandJson(`aws iam list-attached-role-policies --role-name ${roleName}`, true);
      if (attachedPolicies?.AttachedPolicies?.length) {
        log(`  [DRY RUN] Would detach ${attachedPolicies.AttachedPolicies.length} policies`, 'magenta');
      }
      
      // List inline policies
      const inlinePolicies = runAwsCommandJson(`aws iam list-role-policies --role-name ${roleName}`, true);
      if (inlinePolicies?.PolicyNames?.length) {
        log(`  [DRY RUN] Would delete ${inlinePolicies.PolicyNames.length} inline policies`, 'magenta');
      }
      continue;
    }
    
    // Detach all managed policies
    log(`  Detaching managed policies...`, 'blue');
    const attachedPolicies = runAwsCommandJson(`aws iam list-attached-role-policies --role-name ${roleName}`, true);
    if (attachedPolicies?.AttachedPolicies) {
      for (const policy of attachedPolicies.AttachedPolicies) {
        log(`    Detaching: ${policy.PolicyName}`, 'blue');
        runAwsCommand(`aws iam detach-role-policy --role-name ${roleName} --policy-arn ${policy.PolicyArn}`, true);
      }
    }
    
    // Delete inline policies
    log(`  Deleting inline policies...`, 'blue');
    const inlinePolicies = runAwsCommandJson(`aws iam list-role-policies --role-name ${roleName}`, true);
    if (inlinePolicies?.PolicyNames) {
      for (const policyName of inlinePolicies.PolicyNames) {
        log(`    Deleting: ${policyName}`, 'blue');
        runAwsCommand(`aws iam delete-role-policy --role-name ${roleName} --policy-name ${policyName}`, true);
      }
    }
    
    // Delete instance profiles
    log(`  Removing from instance profiles...`, 'blue');
    const instanceProfiles = runAwsCommandJson(`aws iam list-instance-profiles-for-role --role-name ${roleName}`, true);
    if (instanceProfiles?.InstanceProfiles) {
      for (const profile of instanceProfiles.InstanceProfiles) {
        log(`    Removing from profile: ${profile.InstanceProfileName}`, 'blue');
        runAwsCommand(`aws iam remove-role-from-instance-profile --instance-profile-name ${profile.InstanceProfileName} --role-name ${roleName}`, true);
      }
    }
    
    // Delete the role
    log(`  Deleting role...`, 'blue');
    const deleteResult = runAwsCommand(`aws iam delete-role --role-name ${roleName}`, true);
    if (deleteResult !== null) {
      log(`  ✓ Deleted role: ${roleName}`, 'green');
    } else {
      log(`  ✗ Failed to delete role: ${roleName}`, 'red');
    }
  }
}

// ============================================================================
// SECURITY GROUP CLEANUP
// ============================================================================

async function cleanupSecurityGroups(region, vpcId = null, filterPattern = null) {
  log(`\n  Security Groups in ${region}${vpcId ? ` (VPC: ${vpcId})` : ''}:`, 'yellow');
  
  let query = `SecurityGroups[?GroupName!='default'`;
  if (vpcId) {
    query += ` && VpcId=='${vpcId}'`;
  }
  if (filterPattern) {
    query += ` && contains(GroupName, '${filterPattern}')`;
  }
  query += `].{GroupId:GroupId,GroupName:GroupName,VpcId:VpcId}`;
  
  const securityGroups = runAwsCommandJson(
    `aws ec2 describe-security-groups --region ${region} --query "${query}"`, true
  );
  
  if (!securityGroups || securityGroups.length === 0) {
    log(`    No security groups to delete`, 'green');
    return;
  }
  
  log(`    Found ${securityGroups.length} security groups to delete`, 'yellow');
  
  for (const sg of securityGroups) {
    if (dryRun) {
      log(`    [DRY RUN] Would delete: ${sg.GroupName} (${sg.GroupId})`, 'magenta');
      continue;
    }
    
    // Remove all ingress rules first
    const ingressRules = runAwsCommandJson(
      `aws ec2 describe-security-groups --region ${region} --group-ids ${sg.GroupId} --query "SecurityGroups[0].IpPermissions"`, true
    );
    if (ingressRules && ingressRules.length > 0) {
      log(`    Removing ingress rules from ${sg.GroupName}...`, 'blue');
      runAwsCommand(
        `aws ec2 revoke-security-group-ingress --region ${region} --group-id ${sg.GroupId} --ip-permissions '${JSON.stringify(ingressRules)}'`, true
      );
    }
    
    // Remove all egress rules
    const egressRules = runAwsCommandJson(
      `aws ec2 describe-security-groups --region ${region} --group-ids ${sg.GroupId} --query "SecurityGroups[0].IpPermissionsEgress"`, true
    );
    if (egressRules && egressRules.length > 0) {
      log(`    Removing egress rules from ${sg.GroupName}...`, 'blue');
      runAwsCommand(
        `aws ec2 revoke-security-group-egress --region ${region} --group-id ${sg.GroupId} --ip-permissions '${JSON.stringify(egressRules)}'`, true
      );
    }
    
    // Delete the security group
    log(`    Deleting ${sg.GroupName}...`, 'blue');
    const result = runAwsCommand(
      `aws ec2 delete-security-group --region ${region} --group-id ${sg.GroupId}`, true
    );
    if (result !== null) {
      log(`    ✓ Deleted: ${sg.GroupName}`, 'green');
    } else {
      log(`    ✗ Failed to delete: ${sg.GroupName} (may have dependencies)`, 'red');
    }
  }
}

// ============================================================================
// VPC CLEANUP (Only for US-EAST-1)
// ============================================================================

async function cleanupVpc(region, vpcId, vpcName) {
  log(`\n  Cleaning up VPC: ${vpcName} (${vpcId})`, 'yellow');
  
  if (dryRun) {
    log(`    [DRY RUN] Would delete VPC and all associated resources`, 'magenta');
    return;
  }
  
  // 1. Delete NAT Gateways
  log(`    Deleting NAT Gateways...`, 'blue');
  const natGateways = runAwsCommandJson(
    `aws ec2 describe-nat-gateways --region ${region} --filter "Name=vpc-id,Values=${vpcId}" "Name=state,Values=available,pending" --query "NatGateways[*].NatGatewayId"`, true
  );
  if (natGateways) {
    for (const natId of natGateways) {
      log(`      Deleting NAT Gateway: ${natId}`, 'blue');
      runAwsCommand(`aws ec2 delete-nat-gateway --region ${region} --nat-gateway-id ${natId}`, true);
    }
    // Wait for NAT gateways to be deleted
    if (natGateways.length > 0) {
      log(`      Waiting for NAT Gateways to be deleted (this may take a few minutes)...`, 'blue');
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds
    }
  }
  
  // 2. Delete Internet Gateway
  log(`    Deleting Internet Gateways...`, 'blue');
  const igws = runAwsCommandJson(
    `aws ec2 describe-internet-gateways --region ${region} --filters "Name=attachment.vpc-id,Values=${vpcId}" --query "InternetGateways[*].InternetGatewayId"`, true
  );
  if (igws) {
    for (const igwId of igws) {
      log(`      Detaching IGW: ${igwId}`, 'blue');
      runAwsCommand(`aws ec2 detach-internet-gateway --region ${region} --internet-gateway-id ${igwId} --vpc-id ${vpcId}`, true);
      log(`      Deleting IGW: ${igwId}`, 'blue');
      runAwsCommand(`aws ec2 delete-internet-gateway --region ${region} --internet-gateway-id ${igwId}`, true);
    }
  }
  
  // 3. Delete Subnets
  log(`    Deleting Subnets...`, 'blue');
  const subnets = runAwsCommandJson(
    `aws ec2 describe-subnets --region ${region} --filters "Name=vpc-id,Values=${vpcId}" --query "Subnets[*].SubnetId"`, true
  );
  if (subnets) {
    for (const subnetId of subnets) {
      log(`      Deleting subnet: ${subnetId}`, 'blue');
      runAwsCommand(`aws ec2 delete-subnet --region ${region} --subnet-id ${subnetId}`, true);
    }
  }
  
  // 4. Delete Route Tables (except main)
  log(`    Deleting Route Tables...`, 'blue');
  const routeTables = runAwsCommandJson(
    `aws ec2 describe-route-tables --region ${region} --filters "Name=vpc-id,Values=${vpcId}" --query "RouteTables[?Associations[0].Main!=\`true\`].RouteTableId"`, true
  );
  if (routeTables) {
    for (const rtId of routeTables) {
      // First disassociate any associations
      const associations = runAwsCommandJson(
        `aws ec2 describe-route-tables --region ${region} --route-table-ids ${rtId} --query "RouteTables[0].Associations[?!Main].RouteTableAssociationId"`, true
      );
      if (associations) {
        for (const assocId of associations) {
          runAwsCommand(`aws ec2 disassociate-route-table --region ${region} --association-id ${assocId}`, true);
        }
      }
      log(`      Deleting route table: ${rtId}`, 'blue');
      runAwsCommand(`aws ec2 delete-route-table --region ${region} --route-table-id ${rtId}`, true);
    }
  }
  
  // 5. Delete Network ACLs (except default)
  log(`    Deleting Network ACLs...`, 'blue');
  const nacls = runAwsCommandJson(
    `aws ec2 describe-network-acls --region ${region} --filters "Name=vpc-id,Values=${vpcId}" "Name=default,Values=false" --query "NetworkAcls[*].NetworkAclId"`, true
  );
  if (nacls) {
    for (const naclId of nacls) {
      log(`      Deleting NACL: ${naclId}`, 'blue');
      runAwsCommand(`aws ec2 delete-network-acl --region ${region} --network-acl-id ${naclId}`, true);
    }
  }
  
  // 6. Release Elastic IPs associated with VPC
  log(`    Releasing Elastic IPs...`, 'blue');
  const eips = runAwsCommandJson(
    `aws ec2 describe-addresses --region ${region} --filters "Name=domain,Values=vpc" --query "Addresses[?AssociationId==null].AllocationId"`, true
  );
  if (eips) {
    for (const eipId of eips) {
      log(`      Releasing EIP: ${eipId}`, 'blue');
      runAwsCommand(`aws ec2 release-address --region ${region} --allocation-id ${eipId}`, true);
    }
  }
  
  // 7. Delete Security Groups
  await cleanupSecurityGroups(region, vpcId);
  
  // 8. Finally delete the VPC
  log(`    Deleting VPC...`, 'blue');
  const result = runAwsCommand(`aws ec2 delete-vpc --region ${region} --vpc-id ${vpcId}`, true);
  if (result !== null) {
    log(`    ✓ Deleted VPC: ${vpcName} (${vpcId})`, 'green');
  } else {
    log(`    ✗ Failed to delete VPC: ${vpcName} - may have remaining dependencies`, 'red');
  }
}

// ============================================================================
// REGION-SPECIFIC CLEANUP
// ============================================================================

async function cleanupUsEast1() {
  log('\n========================================', 'cyan');
  log('  US-EAST-1 CLEANUP (ALL RESOURCES)', 'cyan');
  log('========================================', 'cyan');
  
  const vpcsToDelete = [
    { id: 'vpc-0fb614666870d6f07', name: 'usw1-zlps-k8s-01-vpc' },
    { id: 'vpc-07e8126c472de0aa7', name: 'zlps-va-k8s-01-vpc' },
    { id: 'vpc-0ab37f0946754519a', name: 'usw1-zlps-k8s-01-vpc' },
    { id: 'vpc-0dca9827e01c66efb', name: 'usw1-zlps-k8s-01-vpc' }
  ];
  
  for (const vpc of vpcsToDelete) {
    await cleanupVpc('us-east-1', vpc.id, vpc.name);
  }
}

async function cleanupUsWest1() {
  log('\n========================================', 'cyan');
  log('  US-WEST-1 CLEANUP (IAM + SGs ONLY)', 'cyan');
  log('  Keeping: VPCs, ECR, RDS', 'cyan');
  log('========================================', 'cyan');
  
  // Security groups in us-west-1 VPC (not deleting the VPC itself)
  // These are Phase 1 created security groups
  const securityGroupsToDelete = [
    'sg-037e23ded78ae3f45', // usw1-zlps-k8s-01-efs-mount-target-sg
    'sg-0f08343609ceb23a9', // usw1-zlps-k8s-cluster-additional-sg
    'sg-05ee2a22aae78ab6e', // usw1-zlps-cluster-additional-sg
    'sg-0e158ba1ba07f1afd', // usw1-zlps-k8s-internal-alb-sg
    'sg-0e3e7c1c32d56d2d0', // usw1-zlps-k8s-external-alb-sg
    'sg-07523fafba84fe40b', // usw1-zlps-ssm-endpoints-sg
    'sg-02699c1ced3c440e0', // us1-zlps-k8s-01-ssm-endpoints-sg
    'sg-01d559dd6d18bc6dc', // SSM-EC2-SG
    'sg-088967489e9a1784c', // usw1-zlps-node-to-efs-sg
    'sg-0f6c881b41c24ac0c', // usw1-zlps-k8s-ssm-endpoints-sg
    'sg-069a9f4ba55bcef49', // usw1-zlps-k8s-01-external-alb-sg
    // 'sg-0d567cba1381f8698', // eks-cluster-sg - KEEP (EKS managed)
    'sg-08ea77d0f05f95399', // usw1-zlps-internal-alb-sg
    'sg-0ac228b457142476d', // usw1-zlps-k8s-01-cluster-additional-sg
    'sg-04ec83a0432449176', // usw1-zlps-efs-mount-target-sg
    'sg-0f649ae5f7b52462c', // us1-zlps-k8s-01-internal-alb-sg
    'sg-04c0be28175d0f4a7', // usw1-zlps-k8s-efs-mount-target-sg
    'sg-01401294591c71867', // usw1-zlps-k8s-node-to-efs-sg
    'sg-0af41e57f2c4b11eb', // us1-zlps-k8s-01-node-to-efs-sg
    'sg-001598acaf03daa2e', // usw1-zlps-k8s-01-internal-alb-sg
    // 'sg-07c845e341656d305', // eksctl ClusterSharedNodeSecurityGroup - KEEP (EKS managed)
    // 'sg-006eddd7c87e940eb', // eksctl ControlPlaneSecurityGroup - KEEP (EKS managed)
    'sg-0e19db5b88d5917ed', // us1-zlps-k8s-01-efs-mount-target-sg
    'sg-056f0b003ea4b2fb6', // usw1-zlps-k8s-01-ssm-endpoints-sg
    'sg-0b6c7d004aca9082b', // usw1-zlps-external-alb-sg
    'sg-042e425c94e06e18c', // us1-zlps-k8s-01-external-alb-sg
    'sg-0d1fd38d5abbf91f7', // usw1-zlps-k8s-01-node-to-efs-sg
    'sg-0b2434e5bbdc254ed', // us1-zlps-k8s-01-cluster-additional-sg
  ];
  
  log(`\n  Security Groups (${securityGroupsToDelete.length} to delete):`, 'yellow');
  
  for (const sgId of securityGroupsToDelete) {
    // Get security group name
    const sgInfo = runAwsCommandJson(
      `aws ec2 describe-security-groups --region us-west-1 --group-ids ${sgId} --query "SecurityGroups[0].{GroupName:GroupName,GroupId:GroupId}"`, true
    );
    
    if (!sgInfo) {
      log(`    Security group ${sgId} does not exist - skipping`, 'green');
      continue;
    }
    
    if (dryRun) {
      log(`    [DRY RUN] Would delete: ${sgInfo.GroupName} (${sgId})`, 'magenta');
      continue;
    }
    
    // Remove all rules first to handle circular dependencies
    const ingressRules = runAwsCommandJson(
      `aws ec2 describe-security-groups --region us-west-1 --group-ids ${sgId} --query "SecurityGroups[0].IpPermissions"`, true
    );
    if (ingressRules && ingressRules.length > 0) {
      runAwsCommand(
        `aws ec2 revoke-security-group-ingress --region us-west-1 --group-id ${sgId} --ip-permissions '${JSON.stringify(ingressRules)}'`, true
      );
    }
    
    const egressRules = runAwsCommandJson(
      `aws ec2 describe-security-groups --region us-west-1 --group-ids ${sgId} --query "SecurityGroups[0].IpPermissionsEgress"`, true
    );
    if (egressRules && egressRules.length > 0) {
      runAwsCommand(
        `aws ec2 revoke-security-group-egress --region us-west-1 --group-id ${sgId} --ip-permissions '${JSON.stringify(egressRules)}'`, true
      );
    }
  }
  
  // Now delete security groups (after all rules are removed)
  for (const sgId of securityGroupsToDelete) {
    const sgInfo = runAwsCommandJson(
      `aws ec2 describe-security-groups --region us-west-1 --group-ids ${sgId} --query "SecurityGroups[0].GroupName" --output text`, true
    );
    
    if (!sgInfo) continue;
    
    if (dryRun) continue;
    
    log(`    Deleting: ${sgId}...`, 'blue');
    const result = runAwsCommand(`aws ec2 delete-security-group --region us-west-1 --group-id ${sgId}`, true);
    if (result !== null) {
      log(`    ✓ Deleted: ${sgId}`, 'green');
    } else {
      log(`    ✗ Failed to delete: ${sgId}`, 'red');
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'bold');
  log('║     MULTI-REGION AWS CLEANUP SCRIPT                        ║', 'bold');
  log('╠════════════════════════════════════════════════════════════╣', 'bold');
  log('║  This script will clean up the following:                  ║', 'bold');
  log('║                                                            ║', 'bold');
  log('║  US-EAST-1: ALL VPCs and resources                         ║', 'bold');
  log('║  US-WEST-1: IAM roles + Security Groups only               ║', 'bold');
  log('║             (Keeps: VPCs, ECR, RDS)                        ║', 'bold');
  log('║  US-EAST-2: Nothing to clean                               ║', 'bold');
  log('╚════════════════════════════════════════════════════════════╝', 'bold');
  
  if (dryRun) {
    log('\n🔍 DRY RUN MODE - No resources will be deleted\n', 'magenta');
  } else if (!force) {
    log('\n⚠️  WARNING: This will DELETE AWS resources!', 'red');
    log('    Run with --dry-run first to see what will be deleted.', 'yellow');
    log('    Run with --force to proceed without this warning.\n', 'yellow');
    process.exit(1);
  }
  
  try {
    // 1. Clean up IAM roles (global)
    await cleanupIamRoles();
    
    // 2. Clean up us-east-1 (delete everything)
    await cleanupUsEast1();
    
    // 3. Clean up us-west-1 (SGs only, keep VPCs/ECR/RDS)
    await cleanupUsWest1();
    
    log('\n========================================', 'green');
    log('  CLEANUP COMPLETE', 'green');
    log('========================================', 'green');
    
    if (dryRun) {
      log('\nTo execute the cleanup, run:', 'yellow');
      log('  node cleanup-all-regions.js --force', 'cyan');
    }
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
