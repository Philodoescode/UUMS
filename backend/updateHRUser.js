const { User, Role, UserRole } = require('./models');
const bcrypt = require('bcryptjs');

const updateHRUser = async () => {
    try {
        let hrRole = await Role.findOne({ where: { name: 'hr' } });

        if (!hrRole) {
            console.log('HR role not found. Creating...');
            hrRole = await Role.create({ name: 'hr' });
            console.log('HR role created');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        // Find or create HR user (without roleId - using multi-role pattern)
        const [hrUser, created] = await User.findOrCreate({
            where: { email: 'hr@example.com' },
            defaults: {
                fullName: 'HR Administrator',
                email: 'hr@example.com',
                password: hashedPassword,
                isActive: true
            }
        });

        if (created) {
            console.log('HR user created');
            // Assign HR role through UserRole join table
            await UserRole.create({
                userId: hrUser.id,
                roleId: hrRole.id
            });
            console.log('  - Assigned HR role via UserRole');
        } else {
            // Update existing user
            await hrUser.update({
                fullName: 'HR Administrator',
                isActive: true
            });
            console.log('HR user updated');
            
            // Ensure role is assigned
            await UserRole.findOrCreate({
                where: { userId: hrUser.id, roleId: hrRole.id },
                defaults: { userId: hrUser.id, roleId: hrRole.id }
            });
        }

        // Verify
        const verifyUser = await User.findOne({
            where: { email: 'hr@example.com' },
            include: [{ model: Role, as: 'roles', through: { attributes: [] } }]
        });

        console.log('\nHR User Details:');
        console.log('- Email:', verifyUser.email);
        console.log('- Name:', verifyUser.fullName);
        console.log('- Roles:', verifyUser.roles.map(r => r.name).join(', '));
        console.log('- Active:', verifyUser.isActive);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

updateHRUser();
