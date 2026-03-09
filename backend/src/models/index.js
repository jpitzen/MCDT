const sequelize = require('../config/database');
const User = require('./User');
const Credential = require('./Credential');
const Deployment = require('./Deployment');
const DeploymentDraft = require('./deploymentDraft');
const AuditLog = require('./AuditLog');
const DeploymentLog = require('./DeploymentLog');
const AlertChannelConfig = require('./AlertChannelConfig');
const Team = require('./Team');
const TeamMember = require('./TeamMember');
const SharedResource = require('./SharedResource');
const DeploymentSqlScript = require('./DeploymentSqlScript');
const DatabaseCredential = require('./DatabaseCredential');
const ContainerDeployment = require('./ContainerDeployment');
const AdConfiguration = require('./AdConfiguration');
const AdRoleMapping = require('./AdRoleMapping');

// Initialize models
const DeploymentLogModel = DeploymentLog(sequelize);
const TeamModel = Team(sequelize);
const TeamMemberModel = TeamMember(sequelize);
const SharedResourceModel = SharedResource(sequelize);
const DeploymentSqlScriptModel = DeploymentSqlScript(sequelize);

// Define associations
User.hasMany(Credential, {
  foreignKey: 'userId',
  as: 'credentials',
  onDelete: 'CASCADE',
});
Credential.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(Deployment, {
  foreignKey: 'userId',
  as: 'deployments',
  onDelete: 'CASCADE',
});
Deployment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Credential.hasMany(Deployment, {
  foreignKey: 'credentialId',
  as: 'deployments',
  onDelete: 'CASCADE',
});
Deployment.belongsTo(Credential, {
  foreignKey: 'credentialId',
  as: 'credential',
});

// DeploymentDraft associations
User.hasMany(DeploymentDraft, {
  foreignKey: 'userId',
  as: 'deploymentDrafts',
  onDelete: 'CASCADE',
});
DeploymentDraft.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Credential.hasMany(DeploymentDraft, {
  foreignKey: 'credentialId',
  as: 'deploymentDrafts',
  onDelete: 'CASCADE',
});
DeploymentDraft.belongsTo(Credential, {
  foreignKey: 'credentialId',
  as: 'credential',
});

User.hasMany(DeploymentDraft, {
  foreignKey: 'approvedBy',
  as: 'approvedDrafts',
  onDelete: 'SET NULL',
});
DeploymentDraft.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approver',
});

DeploymentDraft.belongsTo(Deployment, {
  foreignKey: 'deploymentId',
  as: 'deployment',
});
Deployment.hasOne(DeploymentDraft, {
  foreignKey: 'deploymentId',
  as: 'draft',
});

Deployment.hasMany(DeploymentLogModel, {
  foreignKey: 'deploymentId',
  as: 'logs',
  onDelete: 'CASCADE',
});
DeploymentLogModel.belongsTo(Deployment, {
  foreignKey: 'deploymentId',
  as: 'deployment',
});

User.hasMany(AuditLog, {
  foreignKey: 'userId',
  as: 'auditLogs',
  onDelete: 'SET NULL',
});
AuditLog.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(AlertChannelConfig, {
  foreignKey: 'userId',
  as: 'alertChannels',
  onDelete: 'CASCADE',
});
AlertChannelConfig.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Team associations
User.hasMany(TeamModel, {
  foreignKey: 'ownerId',
  as: 'ownedTeams',
  onDelete: 'CASCADE',
});
TeamModel.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner',
});

User.hasMany(TeamMemberModel, {
  foreignKey: 'userId',
  as: 'teamMemberships',
  onDelete: 'CASCADE',
});
TeamMemberModel.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

TeamModel.hasMany(TeamMemberModel, {
  foreignKey: 'teamId',
  as: 'members',
  onDelete: 'CASCADE',
});
TeamMemberModel.belongsTo(TeamModel, {
  foreignKey: 'teamId',
  as: 'team',
});

TeamModel.hasMany(SharedResourceModel, {
  foreignKey: 'teamId',
  as: 'sharedResources',
  onDelete: 'CASCADE',
});
SharedResourceModel.belongsTo(TeamModel, {
  foreignKey: 'teamId',
  as: 'team',
});

// DeploymentSqlScript associations
Deployment.hasMany(DeploymentSqlScriptModel, {
  foreignKey: 'deploymentId',
  as: 'sqlScripts',
  onDelete: 'CASCADE',
});
DeploymentSqlScriptModel.belongsTo(Deployment, {
  foreignKey: 'deploymentId',
  as: 'deployment',
});

User.hasMany(DeploymentSqlScriptModel, {
  foreignKey: 'uploadedBy',
  as: 'uploadedSqlScripts',
  onDelete: 'SET NULL',
});
DeploymentSqlScriptModel.belongsTo(User, {
  foreignKey: 'uploadedBy',
  as: 'uploader',
});

// DatabaseCredential associations
User.hasMany(DatabaseCredential, {
  foreignKey: 'userId',
  as: 'databaseCredentials',
  onDelete: 'CASCADE',
});
DatabaseCredential.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// ContainerDeployment associations
User.hasMany(ContainerDeployment, {
  foreignKey: 'userId',
  as: 'containerDeployments',
  onDelete: 'CASCADE',
});
ContainerDeployment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Credential.hasMany(ContainerDeployment, {
  foreignKey: 'credentialId',
  as: 'containerDeployments',
  onDelete: 'SET NULL',
});
ContainerDeployment.belongsTo(Credential, {
  foreignKey: 'credentialId',
  as: 'credential',
});

Deployment.hasMany(ContainerDeployment, {
  foreignKey: 'deploymentId',
  as: 'containerDeployments',
  onDelete: 'SET NULL',
});
ContainerDeployment.belongsTo(Deployment, {
  foreignKey: 'deploymentId',
  as: 'clusterDeployment',
});

// AdConfiguration associations
User.hasMany(AdConfiguration, {
  foreignKey: 'createdBy',
  as: 'adConfigs',
  onDelete: 'SET NULL',
});
AdConfiguration.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

AdConfiguration.hasMany(AdRoleMapping, {
  foreignKey: 'adConfigId',
  as: 'roleMappings',
  onDelete: 'CASCADE',
});
AdRoleMapping.belongsTo(AdConfiguration, {
  foreignKey: 'adConfigId',
  as: 'adConfiguration',
});

module.exports = {
  sequelize,
  User,
  Credential,
  Deployment,
  DeploymentDraft,
  AuditLog,
  DeploymentLog: DeploymentLogModel,
  AlertChannelConfig,
  Team: TeamModel,
  TeamMember: TeamMemberModel,
  SharedResource: SharedResourceModel,
  DeploymentSqlScript: DeploymentSqlScriptModel,
  DatabaseCredential,
  ContainerDeployment,
  AdConfiguration,
  AdRoleMapping,
};
