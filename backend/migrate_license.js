const { sequelize } = require('./config/db');

const migrateLicense = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Alter license_assignments table
        try {
            await sequelize.query('ALTER TABLE "license_assignments" ADD COLUMN "departmentId" UUID REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE;');
            console.log('Added departmentId column.');
        } catch (e) {
            console.log('departmentId column might already exist:', e.message);
        }

        try {
            await sequelize.query('ALTER TABLE "license_assignments" ALTER COLUMN "userId" DROP NOT NULL;');
            console.log('Made userId nullable.');
        } catch (e) {
            console.log('userId alteration failed:', e.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateLicense();
