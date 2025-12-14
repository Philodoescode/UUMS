const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GradeAppeal = sequelize.define('GradeAppeal', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    enrollmentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'enrollments',
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
    currentGrade: {
        type: DataTypes.STRING(5),
        allowNull: true,
        comment: 'The grade being appealed',
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Appeal reason is required' },
            len: {
                args: [10, 2000],
                msg: 'Appeal reason must be 10-2000 characters',
            },
        },
    },
    status: {
        type: DataTypes.ENUM('pending', 'reviewed', 'resolved'),
        allowNull: false,
        defaultValue: 'pending',
    },
    professorResponse: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Professor response to the appeal',
    },
    newGrade: {
        type: DataTypes.STRING(5),
        allowNull: true,
        comment: 'New grade if appeal is accepted',
    },
    resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    resolvedById: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
}, {
    tableName: 'grade_appeals',
    timestamps: true,
});

module.exports = GradeAppeal;
