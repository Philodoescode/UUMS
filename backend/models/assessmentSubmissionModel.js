const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AssessmentSubmission = sequelize.define('AssessmentSubmission', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    assessmentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'assessments',
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
    startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('in-progress', 'submitted', 'time-expired'),
        defaultValue: 'in-progress',
        allowNull: false,
    },
    score: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    grade: {
        type: DataTypes.STRING(5), // A, B, C, F etc.
        allowNull: true,
    },
    gradingStatus: {
        type: DataTypes.ENUM('pending', 'graded'),
        defaultValue: 'pending',
    },
    content: {
        type: DataTypes.JSON, // Stores student answers
        allowNull: true,
    },
    isLate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    fileUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL for assignment file submission',
    },
}, {
    tableName: 'assessment_submissions',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['assessmentId', 'studentId'], // Assuming 1 attempt per assessment for now, or use 'attemptsAllowed' logic with composite key if multiple
            // For now, let's enforce uniqueness here to keep it simple as per spec "assessments protected by secure tokens" usually implies a single sitting.
            // Actually, if attemptsAllowed > 1, this index would be wrong. 
            // But the spec didn't explicitly ask for multiple attempts. I'll remove unique constraint for now to be safe, or just rely on logic.
            // Let's keep it unique for MVP to prevent duplicate active sessions.
        }
    ]
});

module.exports = AssessmentSubmission;
