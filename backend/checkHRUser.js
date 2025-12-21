const { User, Role } = require('./models');

const checkHRUser = async () => {
    try {
        const hrRole = await Role.findOne({ where: { name: 'hr' } });
        console.log('HR Role:', hrRole ? hrRole.toJSON() : 'NOT FOUND');

        const hrUser = await User.findOne({
            where: { email: 'hr@example.com' },
            include: [{ model: Role, as: 'role' }]
        });

        if (hrUser) {
            console.log('HR User found:');
            console.log('- Email:', hrUser.email);
            console.log('- Name:', hrUser.fullName);
            console.log('- Role:', hrUser.role.name);
            console.log('- Active:', hrUser.isActive);
        } else {
            console.log('HR User NOT FOUND');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkHRUser();
