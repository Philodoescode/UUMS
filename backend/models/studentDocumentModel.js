const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StudentDocument = sequelize.define('StudentDocument', {
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
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        // You can restrict categories if needed, or leave it open
        // validate: { isIn: [['Admission', 'Medical', 'Disciplinary', 'Other']] }
    },
    fileUrl: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    uploadedById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
}, {
    tableName: 'student_documents',
    timestamps: true,
});

module.exports = StudentDocument;
