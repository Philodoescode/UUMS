const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GradeAuditLog = sequelize.define('GradeAuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    enrollmentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'enrollments',
            key: 'id',
        },
    },
    studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    courseId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'courses',
            key: 'id',
        },
    },
    advisorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    previousGrade: {
        type: DataTypes.STRING(5),
        allowNull: true,
        comment: 'Grade before the change',
    },
    newGrade: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: 'Grade after the change',
    },
    previousFeedback: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    newFeedback: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    action: {
        type: DataTypes.ENUM('assigned', 'updated'),
        allowNull: false,
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Reason for grade change (optional)',
    },
}, {
    tableName: 'grade_audit_logs',
    timestamps: true,
    updatedAt: false, // Only track creation time, logs are immutable
});

module.exports = GradeAuditLog;
