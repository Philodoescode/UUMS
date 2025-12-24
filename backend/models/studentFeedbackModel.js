const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StudentFeedback = sequelize.define('StudentFeedback', {
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
    targetUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        comment: 'The user ID of the Instructor or TA receiving feedback',
    },
    targetRole: {
        type: DataTypes.ENUM('Instructor', 'TA'),
        allowNull: false,
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5,
        },
    },
    comments: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    studentHash: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Anonymized hash to prevent duplicate submissions from the same student',
    },
    semester: {
        type: DataTypes.ENUM('Fall', 'Spring', 'Summer'),
        allowNull: false,
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'student_feedback',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['courseId', 'targetUserId', 'studentHash'],
            name: 'unique_student_feedback_per_target',
        },
    ],
});

module.exports = StudentFeedback;
