const { sequelize, User } = require('./models');

const checkUsers = async () => {
    try {
        await sequelize.authenticate();
        const users = await User.findAll({ attributes: ['email', 'roleId', 'isActive'] });
        console.log('Users found:', JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error checking users:', error);
        process.exit(1);
    }
};

checkUsers();
