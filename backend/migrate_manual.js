const { sequelize } = require('./config/db');

const migrate = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Alter assets table
        try {
            await sequelize.query('ALTER TABLE "assets" ADD COLUMN "totalSeats" INTEGER DEFAULT 1 NOT NULL;');
            console.log('Added totalSeats column.');
        } catch (e) {
            console.log('totalSeats column might already exist:', e.message);
        }

        try {
            await sequelize.query('ALTER TABLE "assets" ADD COLUMN "seatsAvailable" INTEGER DEFAULT 1 NOT NULL;');
            console.log('Added seatsAvailable column.');
        } catch (e) {
            console.log('seatsAvailable column might already exist:', e.message);
        }

        // Create license_assignments table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS "license_assignments" (
                "id" UUID PRIMARY KEY,
                "assetId" UUID NOT NULL REFERENCES "assets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "userId" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "assignedDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "status" VARCHAR(255) DEFAULT 'Active',
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
            );
        `;
        await sequelize.query(createTableQuery);
        console.log('Created license_assignments table.');

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
