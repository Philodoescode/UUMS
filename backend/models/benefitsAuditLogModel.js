const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BenefitsAuditLog = sequelize.define('BenefitsAuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    benefitsId: {
        type: DataTypes.UUID,
        allowNull: false,
        // Foreign key managed by Sequelize associations, not database constraint
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    changedById: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    fieldChanged: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    oldValue: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    newValue: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    changeReason: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'benefits_audit_logs',
    timestamps: true,
    updatedAt: false, // Audit logs are immutable
});

module.exports = BenefitsAuditLog;

