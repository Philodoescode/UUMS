const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AdmissionApplication = sequelize.define('AdmissionApplication', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: { msg: 'Please provide a valid email address' },
        },
    },
    previousEducation: {
        type: DataTypes.TEXT, // Storing as text, could be JSON if detailed structure is needed
        allowNull: false,
    },
    intendedMajor: {
        type: DataTypes.STRING, // Storing department name or ID
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('Submitted', 'Under Review', 'Accepted', 'Rejected'),
        defaultValue: 'Submitted',
    },
}, {
    tableName: 'admission_applications',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
});

module.exports = AdmissionApplication;
