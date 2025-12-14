const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ElectiveRequest = sequelize.define('ElectiveRequest', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
        allowNull: true, // Initially null until picked up or assigned? Or maybe we don't assign to specific advisor yet?
        // Requirement says "Advisor sees pending requests".
        // Usually advisors are assigned to students.
        // For this MVP, let's assume any advisor can see requests OR we track who approved it.
        references: {
            model: 'users',
            key: 'id',
        },
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
    },
    advisorComments: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    requestDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'elective_requests',
    timestamps: true,
});

module.exports = ElectiveRequest;
