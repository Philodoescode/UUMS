const { sequelize } = require('./models');

const fixSchema = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        console.log('Dropping assets table with CASCADE...');
        await sequelize.getQueryInterface().dropTable('assets', { cascade: true });
        console.log('Assets table dropped successfully. Server restart should recreate it correctly.');

        process.exit(0);
    } catch (error) {
        console.error('Error fixing schema:', error);
        process.exit(1);
    }
};

fixSchema();
