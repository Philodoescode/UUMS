const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ResearchPublication = sequelize.define('ResearchPublication', {
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
    abstract: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    publicationDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    journalConferenceName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    link: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true
        }
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
        defaultValue: 'Pending',
    },
    citationCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    }
}, {
    tableName: 'research_publications',
    timestamps: true,
});

module.exports = ResearchPublication;
