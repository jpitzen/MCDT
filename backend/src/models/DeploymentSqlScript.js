const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeploymentSqlScript = sequelize.define(
    'DeploymentSqlScript',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      deploymentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'deployment_id',
      },
      scriptName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'script_name',
      },
      scriptContent: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'script_content',
      },
      executionOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'execution_order',
      },
      status: {
        type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'skipped'),
        defaultValue: 'pending',
      },
      executedAt: {
        type: DataTypes.DATE,
        field: 'executed_at',
      },
      executionDurationMs: {
        type: DataTypes.INTEGER,
        field: 'execution_duration_ms',
      },
      rowsAffected: {
        type: DataTypes.INTEGER,
        field: 'rows_affected',
      },
      errorMessage: {
        type: DataTypes.TEXT,
        field: 'error_message',
      },
      errorStack: {
        type: DataTypes.TEXT,
        field: 'error_stack',
      },
      haltOnError: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'halt_on_error',
      },
      runInTransaction: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'run_in_transaction',
      },
      timeoutSeconds: {
        type: DataTypes.INTEGER,
        defaultValue: 300,
        field: 'timeout_seconds',
      },
      uploadedBy: {
        type: DataTypes.UUID,
        field: 'uploaded_by',
      },
    },
    {
      tableName: 'deployment_sql_scripts',
      underscored: true,
      timestamps: true,
    }
  );

  DeploymentSqlScript.associate = (models) => {
    DeploymentSqlScript.belongsTo(models.Deployment, {
      foreignKey: 'deploymentId',
      as: 'deployment',
    });
    DeploymentSqlScript.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader',
    });
  };

  return DeploymentSqlScript;
};
