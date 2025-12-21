const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CompensationAuditLog = sequelize.define('CompensationAuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    compensationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'compensations',
            key: 'id',
        },
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    changedById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    fieldChanged: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Field changed is required' },
        },
    },
    oldValue: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    newValue: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    changeReason: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'compensation_audit_logs',
    timestamps: true,
    updatedAt: false, // Only track creation time for audit logs
});

module.exports = CompensationAuditLog;
