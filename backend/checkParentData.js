const { sequelize, User } = require('./models');

const checkData = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const parent = await User.findOne({
            where: { email: 'parent@example.com' },
            include: [{ model: User, as: 'children' }]
        });

        if (!parent) {
            console.log('Parent user not found!');
        } else {
            console.log(`Parent: ${parent.fullName}`);
            console.log(`Children found: ${parent.children.length}`);
            parent.children.forEach(c => console.log(` - ${c.fullName}`));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkData();
