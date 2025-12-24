const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StaffBenefits = sequelize.define('StaffBenefits', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    planType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Basic',
    },
    coverageDetails: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    coverageDocumentUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    validityStartDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    validityEndDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    dentalCoverage: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    visionCoverage: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    dependentsCovered: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    additionalBenefits: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('active', 'expired', 'pending'),
        allowNull: false,
        defaultValue: 'pending',
    },
}, {
    tableName: 'staff_benefits',
    timestamps: true,
});

module.exports = StaffBenefits;

