const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Announcement = sequelize.define('Announcement', {
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
    instructorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'instructors',
            key: 'id',
        },
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Announcement title is required' },
        },
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Announcement content is required' },
        },
    },
}, {
    tableName: 'announcements',
    timestamps: true,
});

module.exports = Announcement;
