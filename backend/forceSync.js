const { sequelize } = require('./models');

const fixTable = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');
        await sequelize.sync({ alter: true });
        console.log("Sync complete");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fixTable();
