const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProfessionalDevelopment = sequelize.define('ProfessionalDevelopment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('Workshop', 'Seminar', 'Course', 'Certification'),
        allowNull: false,
    },
    provider: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    completionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    expiryDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Required for certifications with validity periods',
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    credentialUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true
        }
    },
    verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'HR created records are automatically verified',
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'HR User ID who created this record'
    }
}, {
    tableName: 'professional_development',
    timestamps: true,
});

module.exports = ProfessionalDevelopment;
