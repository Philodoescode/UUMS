const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CourseTAAssignment = sequelize.define('CourseTAAssignment', {
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
    taUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    duties: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON array or free text describing TA responsibilities',
    },
}, {
    tableName: 'course_ta_assignments',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['courseId', 'taUserId'],
            name: 'unique_course_ta',
        },
    ],
});

module.exports = CourseTAAssignment;
