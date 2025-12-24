const { sequelize } = require('./backend/config/db');
const { QueryTypes } = require('sequelize');

const checkDept = async () => {
    try {
        await sequelize.authenticate();
        const result = await sequelize.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments';",
            { type: QueryTypes.SELECT }
        );
        console.log('Departments Table Exists:', result.length > 0);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};
checkDept();
