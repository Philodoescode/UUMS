const { sequelize } = require('./config/db');

const fixDb = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        await sequelize.query('DROP TABLE IF EXISTS "license_assignments" CASCADE;');
        console.log('Dropped license_assignments table.');

        // Also drop the enum type if it exists to be clean
        try {
            await sequelize.query('DROP TYPE IF EXISTS "enum_license_assignments_status";');
            console.log('Dropped enum type.');
        } catch (e) {
            console.log('Enum type did not exist or could not be dropped.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixDb();
