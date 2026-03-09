const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdRoleMapping = sequelize.define(
  'AdRoleMapping',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    adConfigId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ad_config_id',
    },
    adGroupDn: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'ad_group_dn',
    },
    adGroupName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'ad_group_name',
    },
    mappedRole: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['admin', 'approver', 'operator', 'viewer']],
      },
      field: 'mapped_role',
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    modelName: 'AdRoleMapping',
    tableName: 'ad_role_mappings',
    timestamps: true,
    underscored: true,
  }
);

module.exports = AdRoleMapping;
