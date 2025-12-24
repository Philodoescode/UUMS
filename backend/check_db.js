const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');

const checkDb = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const [results] = await sequelize.query(
            "SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'assets';"
        );
        console.log('Assets Table Columns:', results);

        const [assignments] = await sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'license_assignments';"
        );
        console.log('LicenseAssignments Table Columns:', assignments);

        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};

checkDb();
