const { User, Role } = require('./models');
const bcrypt = require('bcryptjs');

const updateHRUser = async () => {
    try {
        const hrRole = await Role.findOne({ where: { name: 'hr' } });

        if (!hrRole) {
            console.log('HR role not found. Creating...');
            const newRole = await Role.create({ name: 'hr' });
            console.log('HR role created');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const hrRoleId = hrRole ? hrRole.id : (await Role.findOne({ where: { name: 'hr' } })).id;

        const [hrUser, created] = await User.findOrCreate({
            where: { email: 'hr@example.com' },
            defaults: {
                fullName: 'HR Administrator',
                email: 'hr@example.com',
                password: hashedPassword,
                roleId: hrRoleId,
                isActive: true
            }
        });

        if (!created) {
            // Update existing user
            await hrUser.update({
                fullName: 'HR Administrator',
                roleId: hrRoleId,
                isActive: true
            });
            console.log('HR user updated');
        } else {
            console.log('HR user created');
        }

        // Verify
        const verifyUser = await User.findOne({
            where: { email: 'hr@example.com' },
            include: [{ model: Role, as: 'role' }]
        });

        console.log('\nHR User Details:');
        console.log('- Email:', verifyUser.email);
        console.log('- Name:', verifyUser.fullName);
        console.log('- Role:', verifyUser.role.name);
        console.log('- Active:', verifyUser.isActive);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

updateHRUser();
