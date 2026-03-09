const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('admin', 'approver', 'operator', 'viewer'),
      defaultValue: 'viewer',
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    mfaEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    mfaSecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    themePreferences: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      field: 'theme_preferences',
    },
    authProvider: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'local',
      field: 'auth_provider',
      validate: {
        isIn: [['local', 'ldap', 'ad']],
      },
    },
    externalId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'external_id',
    },
    distinguishedName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'distinguished_name',
    },
    adGroups: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      field: 'ad_groups',
    },
    lastAdSync: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_ad_sync',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.authProvider === 'local' && user.passwordHash) {
          user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.authProvider === 'local' && user.changed('passwordHash') && user.passwordHash) {
          user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
        }
      },
    },
  }
);

// Instance method to verify password (local auth only)
User.prototype.verifyPassword = async function (password) {
  if (this.authProvider !== 'local') return false;
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

// Instance method to get safe user data (without sensitive info)
User.prototype.toSafeJSON = function () {
  const user = this.toJSON();
  delete user.passwordHash;
  delete user.mfaSecret;
  delete user.externalId;
  delete user.distinguishedName;
  return user;
};

// Class method — look up a user by their AD/LDAP external ID
User.findByExternalId = async function (externalId) {
  return User.findOne({ where: { externalId } });
};

// Valid theme preference keys and values
User.VALID_THEME_PRESETS = [
  'castle-red', 'ocean-blue', 'forest-green', 'royal-purple',
  'midnight', 'sunset-orange', 'teal-wave', 'neon-red', 'custom'
];
User.VALID_THEME_MODES = ['dark', 'light', 'system'];

module.exports = User;
