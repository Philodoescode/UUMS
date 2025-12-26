const bcrypt = require('bcryptjs');
const { sequelize, User, Role, Department, Instructor, UserRole } = require('./models');

const seedSecondInstructor = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Get Instructor Role
        const instructorRole = await Role.findOne({ where: { name: 'instructor' } });
        if (!instructorRole) {
            console.error('Instructor role not found.');
            process.exit(1);
        }

        // 2. Get a Department (e.g., Math)
        const mathDept = await Department.findOne({ where: { code: 'MATH' } });
        if (!mathDept) {
            console.error('Math department not found.');
            process.exit(1);
        }

        // 3. Create User (without roleId - using multi-role pattern)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const [user, created] = await User.findOrCreate({
            where: { email: 'turing@example.com' },
            defaults: {
                fullName: 'Alan Turing',
                email: 'turing@example.com',
                password: hashedPassword,
            }
        });

        if (created) {
            console.log(`Created Second Instructor User: ${user.fullName}`);
            // Assign instructor role through UserRole join table
            await UserRole.create({
                userId: user.id,
                roleId: instructorRole.id
            });
            console.log(`  - Assigned instructor role via UserRole`);
        } else {
            console.log(`User already exists: ${user.fullName}`);
            // Ensure role is assigned
            await UserRole.findOrCreate({
                where: { userId: user.id, roleId: instructorRole.id },
                defaults: { userId: user.id, roleId: instructorRole.id }
            });
        }

        // 4. Create Instructor Profile
        const [profile, profileCreated] = await Instructor.findOrCreate({
            where: { userId: user.id },
            defaults: {
                userId: user.id,
                departmentId: mathDept.id,
                title: 'Distinguished Professor',
                officeLocation: 'Room 404'
            }
        });

        if (profileCreated) {
            console.log(`Created Instructor Profile for: ${user.fullName}`);
        } else {
            console.log(`Profile already exists for: ${user.fullName}`);
        }

        console.log('Second instructor seeding complete.');
        process.exit(0);

    } catch (error) {
        console.error('Error seeding second instructor:', error);
        process.exit(1);
    }
};

seedSecondInstructor();
