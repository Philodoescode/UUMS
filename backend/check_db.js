const { sequelize } = require('./config/db');
const { QueryTypes } = require('sequelize');

const checkColumns = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        const columns = await sequelize.query(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'assets';",
            { type: QueryTypes.SELECT }
        );

        console.log('ASSETS TABLE COLUMNS:', columns);

        const logColumns = await sequelize.query(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'asset_allocation_logs';",
            { type: QueryTypes.SELECT }
        );

        console.log('LOG TABLE COLUMNS:', logColumns);

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkColumns();
