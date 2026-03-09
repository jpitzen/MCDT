#!/usr/bin/env node
/**
 * Cleanup Script for Phase 1 Prerequisites Resources
 * 
 * This script removes IAM roles and security groups that were created by the
 * Phase 1 Prerequisites UI before this functionality was removed.
 * 
 * These resources conflict with Terraform which should manage them instead.
 * 
 * Usage:
 *   node scripts/cleanup-phase1-resources.js --cluster-name <name> --region <region> [--vpc-id <vpc-id>] [--dry-run]
 * 
 * Options:
 *   --cluster-name  The cluster name prefix used when creating resources (required)
 *   --region        AWS region where resources were created (required)
 *   --vpc-id        VPC ID for security groups (optional, required to delete SGs)
 *   --dry-run       Show what would be deleted without actually deleting
 *   --force         Skip confirmation prompts
 */

const { execSync } = require('child_process');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  clusterName: null,
  region: null,
  vpcId: null,
  dryRun: false,
  force: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--cluster-name':
      options.clusterName = args[++i];
      break;
    case '--region':
      options.region = args[++i];
      break;
    case '--vpc-id':
      options.vpcId = args[++i];
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--force':
      options.force = true;
      break;
    case '--help':
    case '-h':
      printUsage();
      process.exit(0);
  }
}

function printUsage() {
  console.log(`
Cleanup Phase 1 Prerequisites Resources

This script removes IAM roles and security groups that were created by the
Phase 1 Prerequisites UI before this functionality was removed.

Usage:
  node scripts/cleanup-phase1-resources.js --cluster-name <name> --region <region> [options]

Required:
  --cluster-name  The cluster name prefix used when creating resources
  --region        AWS region where resources were created

Options:
  --vpc-id        VPC ID for security groups (required to delete SGs)
  --dry-run       Show what would be deleted without actually deleting
  --force         Skip confirmation prompts
  --help, -h      Show this help message

Example:
  node scripts/cleanup-phase1-resources.js --cluster-name usw1-zlps-k8s-01 --region us-east-1 --vpc-id vpc-abc123 --dry-run
`);
}

// Validate required options
if (!options.clusterName || !options.region) {
  console.error('Error: --cluster-name and --region are required');
  printUsage();
  process.exit(1);
}

// Define resources created by Phase 1
const IAM_ROLES = [
  `${options.clusterName}-cluster-role`,
  `${options.clusterName}-node-role`,
  `${options.clusterName}-ebs-csi-driver-role`,
  `${options.clusterName}-efs-csi-driver-role`,
  `${options.clusterName}-aws-lb-controller-role`,
  `${options.clusterName}-cluster-autoscaler-role`,
  `${options.clusterName}-external-dns-role`,
];

const SECURITY_GROUPS = [
  `${options.clusterName}-ssm-endpoints-sg`,
  `${options.clusterName}-cluster-additional-sg`,
  `${options.clusterName}-efs-mount-target-sg`,
  `${options.clusterName}-node-to-efs-sg`,
  `${options.clusterName}-internal-alb-sg`,
  `${options.clusterName}-external-alb-sg`,
];

function exec(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', ...options }).trim();
  } catch (error) {
    if (options.ignoreError) {
      return null;
    }
    throw error;
  }
}

async function confirm(message) {
  if (options.force) return true;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function deleteIamRole(roleName) {
  console.log(`\n  Processing IAM role: ${roleName}`);
  
  // Check if role exists
  const checkCmd = `aws iam get-role --role-name ${roleName} --region ${options.region} 2>&1`;
  const roleExists = exec(checkCmd, { ignoreError: true });
  
  if (!roleExists || roleExists.includes('NoSuchEntity')) {
    console.log(`    ⏭️  Role does not exist, skipping`);
    return { skipped: true };
  }
  
  if (options.dryRun) {
    console.log(`    🔍 [DRY RUN] Would delete role: ${roleName}`);
    return { wouldDelete: true };
  }
  
  try {
    // First, detach all managed policies
    console.log(`    Detaching managed policies...`);
    const policiesJson = exec(
      `aws iam list-attached-role-policies --role-name ${roleName} --region ${options.region} --output json`,
      { ignoreError: true }
    );
    
    if (policiesJson) {
      const policies = JSON.parse(policiesJson);
      for (const policy of policies.AttachedPolicies || []) {
        console.log(`      Detaching: ${policy.PolicyArn}`);
        exec(`aws iam detach-role-policy --role-name ${roleName} --policy-arn ${policy.PolicyArn} --region ${options.region}`);
      }
    }
    
    // Delete inline policies
    console.log(`    Deleting inline policies...`);
    const inlinePoliciesJson = exec(
      `aws iam list-role-policies --role-name ${roleName} --region ${options.region} --output json`,
      { ignoreError: true }
    );
    
    if (inlinePoliciesJson) {
      const inlinePolicies = JSON.parse(inlinePoliciesJson);
      for (const policyName of inlinePolicies.PolicyNames || []) {
        console.log(`      Deleting: ${policyName}`);
        exec(`aws iam delete-role-policy --role-name ${roleName} --policy-name ${policyName} --region ${options.region}`);
      }
    }
    
    // Delete instance profiles associated with the role
    console.log(`    Removing from instance profiles...`);
    const instanceProfilesJson = exec(
      `aws iam list-instance-profiles-for-role --role-name ${roleName} --region ${options.region} --output json`,
      { ignoreError: true }
    );
    
    if (instanceProfilesJson) {
      const instanceProfiles = JSON.parse(instanceProfilesJson);
      for (const profile of instanceProfiles.InstanceProfiles || []) {
        console.log(`      Removing from: ${profile.InstanceProfileName}`);
        exec(`aws iam remove-role-from-instance-profile --role-name ${roleName} --instance-profile-name ${profile.InstanceProfileName} --region ${options.region}`);
      }
    }
    
    // Delete the role
    console.log(`    Deleting role...`);
    exec(`aws iam delete-role --role-name ${roleName} --region ${options.region}`);
    console.log(`    ✅ Deleted role: ${roleName}`);
    return { deleted: true };
    
  } catch (error) {
    console.error(`    ❌ Failed to delete role: ${error.message}`);
    return { error: error.message };
  }
}

async function deleteSecurityGroup(sgName) {
  console.log(`\n  Processing security group: ${sgName}`);
  
  if (!options.vpcId) {
    console.log(`    ⏭️  No VPC ID provided, skipping security groups`);
    return { skipped: true, reason: 'no-vpc' };
  }
  
  // Find security group by name in the VPC
  const findCmd = `aws ec2 describe-security-groups --filters "Name=group-name,Values=${sgName}" "Name=vpc-id,Values=${options.vpcId}" --region ${options.region} --output json`;
  const sgJson = exec(findCmd, { ignoreError: true });
  
  if (!sgJson) {
    console.log(`    ⏭️  Security group not found, skipping`);
    return { skipped: true };
  }
  
  const sgData = JSON.parse(sgJson);
  if (!sgData.SecurityGroups || sgData.SecurityGroups.length === 0) {
    console.log(`    ⏭️  Security group not found, skipping`);
    return { skipped: true };
  }
  
  const sg = sgData.SecurityGroups[0];
  const sgId = sg.GroupId;
  
  if (options.dryRun) {
    console.log(`    🔍 [DRY RUN] Would delete security group: ${sgName} (${sgId})`);
    return { wouldDelete: true, groupId: sgId };
  }
  
  try {
    // Remove all ingress rules first
    if (sg.IpPermissions && sg.IpPermissions.length > 0) {
      console.log(`    Removing ingress rules...`);
      exec(`aws ec2 revoke-security-group-ingress --group-id ${sgId} --ip-permissions '${JSON.stringify(sg.IpPermissions)}' --region ${options.region}`, { ignoreError: true });
    }
    
    // Remove all egress rules (except default)
    if (sg.IpPermissionsEgress && sg.IpPermissionsEgress.length > 0) {
      console.log(`    Removing egress rules...`);
      exec(`aws ec2 revoke-security-group-egress --group-id ${sgId} --ip-permissions '${JSON.stringify(sg.IpPermissionsEgress)}' --region ${options.region}`, { ignoreError: true });
    }
    
    // Delete the security group
    console.log(`    Deleting security group...`);
    exec(`aws ec2 delete-security-group --group-id ${sgId} --region ${options.region}`);
    console.log(`    ✅ Deleted security group: ${sgName} (${sgId})`);
    return { deleted: true, groupId: sgId };
    
  } catch (error) {
    console.error(`    ❌ Failed to delete security group: ${error.message}`);
    return { error: error.message };
  }
}

async function main() {
  console.log('============================================');
  console.log('Phase 1 Prerequisites Resource Cleanup');
  console.log('============================================');
  console.log(`\nCluster Name: ${options.clusterName}`);
  console.log(`Region: ${options.region}`);
  console.log(`VPC ID: ${options.vpcId || '(not provided - security groups will be skipped)'}`);
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  
  console.log('\n--- IAM Roles to process ---');
  IAM_ROLES.forEach(r => console.log(`  • ${r}`));
  
  console.log('\n--- Security Groups to process ---');
  SECURITY_GROUPS.forEach(sg => console.log(`  • ${sg}`));
  
  if (!options.dryRun && !options.force) {
    const confirmed = await confirm('\n⚠️  This will permanently delete these AWS resources. Continue?');
    if (!confirmed) {
      console.log('Aborted.');
      process.exit(0);
    }
  }
  
  const results = {
    iamRoles: { deleted: 0, skipped: 0, errors: 0, wouldDelete: 0 },
    securityGroups: { deleted: 0, skipped: 0, errors: 0, wouldDelete: 0 },
  };
  
  // Process IAM Roles
  console.log('\n\n=== Processing IAM Roles ===');
  for (const roleName of IAM_ROLES) {
    const result = await deleteIamRole(roleName);
    if (result.deleted) results.iamRoles.deleted++;
    else if (result.skipped) results.iamRoles.skipped++;
    else if (result.wouldDelete) results.iamRoles.wouldDelete++;
    else if (result.error) results.iamRoles.errors++;
  }
  
  // Process Security Groups
  console.log('\n\n=== Processing Security Groups ===');
  for (const sgName of SECURITY_GROUPS) {
    const result = await deleteSecurityGroup(sgName);
    if (result.deleted) results.securityGroups.deleted++;
    else if (result.skipped) results.securityGroups.skipped++;
    else if (result.wouldDelete) results.securityGroups.wouldDelete++;
    else if (result.error) results.securityGroups.errors++;
  }
  
  // Summary
  console.log('\n\n============================================');
  console.log('Summary');
  console.log('============================================');
  
  if (options.dryRun) {
    console.log('\n[DRY RUN MODE - No changes were made]');
    console.log(`\nIAM Roles:`);
    console.log(`  Would delete: ${results.iamRoles.wouldDelete}`);
    console.log(`  Already gone: ${results.iamRoles.skipped}`);
    console.log(`\nSecurity Groups:`);
    console.log(`  Would delete: ${results.securityGroups.wouldDelete}`);
    console.log(`  Already gone: ${results.securityGroups.skipped}`);
  } else {
    console.log(`\nIAM Roles:`);
    console.log(`  ✅ Deleted: ${results.iamRoles.deleted}`);
    console.log(`  ⏭️  Skipped: ${results.iamRoles.skipped}`);
    console.log(`  ❌ Errors: ${results.iamRoles.errors}`);
    console.log(`\nSecurity Groups:`);
    console.log(`  ✅ Deleted: ${results.securityGroups.deleted}`);
    console.log(`  ⏭️  Skipped: ${results.securityGroups.skipped}`);
    console.log(`  ❌ Errors: ${results.securityGroups.errors}`);
  }
  
  if (results.iamRoles.errors > 0 || results.securityGroups.errors > 0) {
    console.log('\n⚠️  Some resources could not be deleted. They may be in use or you may lack permissions.');
    process.exit(1);
  }
  
  console.log('\n✅ Cleanup complete!');
  console.log('\nYou can now run Terraform which will create these resources with proper state management.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
