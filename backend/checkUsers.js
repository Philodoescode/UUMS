const { sequelize, User, Role, UserRole } = require('./models');

const checkUsers = async () => {
    try {
        await sequelize.authenticate();
        // Query users with their roles via multi-role join table
        const users = await User.findAll({
            attributes: ['id', 'email', 'isActive'],
            include: [{
                model: Role,
                as: 'roles',
                attributes: ['id', 'name'],
                through: { attributes: [] }
            }]
        });
        // Format output with roles array
        const formattedUsers = users.map(u => ({
            email: u.email,
            isActive: u.isActive,
            roles: u.roles.map(r => r.name)
        }));
        console.log('Users found:', JSON.stringify(formattedUsers, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error checking users:', error);
        process.exit(1);
    }
};

checkUsers();
