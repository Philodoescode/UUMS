const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Material = sequelize.define('Material', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    courseId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'courses',
            key: 'id',
        },
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Title is required' },
        },
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    fileUrl: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'File URL is required' },
        },
    },
    version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false,
    },
    isLatest: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    groupId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Common ID linking all versions of the same file',
    }
}, {
    tableName: 'materials',
    timestamps: true,
});

module.exports = Material;
