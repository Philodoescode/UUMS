const { sequelize, User, Role, Enrollment, Course, UserRole } = require('./models');
const bcrypt = require('bcryptjs');

const seedParents = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Create or Find Parent Role
        let parentRole = await Role.findOne({ where: { name: 'parent' } });
        if (!parentRole) {
            parentRole = await Role.create({ name: 'parent' });
            console.log('Created parent role');
        }

        // 2. Create Parent User (without roleId - using multi-role pattern)
        const hashedPassword = await bcrypt.hash('password123', 10);
        const [parentUser, created] = await User.findOrCreate({
            where: { email: 'parent@example.com' },
            defaults: {
                fullName: 'John Parent',
                email: 'parent@example.com',
                password: hashedPassword,
            }
        });

        if (created) {
            console.log('Created parent user: parent@example.com');
            // Assign parent role through UserRole join table
            await UserRole.create({
                userId: parentUser.id,
                roleId: parentRole.id
            });
            console.log('  - Assigned parent role via UserRole');
        } else {
            console.log('Parent user already exists');
            // Ensure role is assigned
            await UserRole.findOrCreate({
                where: { userId: parentUser.id, roleId: parentRole.id },
                defaults: { userId: parentUser.id, roleId: parentRole.id }
            });
        }

        // 3. Find a Student to Link
        // Look for a user with student role through UserRole table
        const studentRole = await Role.findOne({ where: { name: 'student' } });
        if (!studentRole) {
            console.log('Student role not found, skipping linking');
            return;
        }

        // Find users with student role via UserRole join table
        const studentUserRoles = await UserRole.findAll({ 
            where: { roleId: studentRole.id },
            include: [{ model: User, as: 'user' }]
        });
        
        const students = studentUserRoles.map(ur => ur.user).filter(Boolean);
        
        if (students.length === 0) {
            console.log('No students found to link.');
            // Create one?
            // Not for now, assume main seeder ran.
        } else {
            const student = students[0];
            console.log(`Linking parent to student: ${student.fullName}`);

            // Link Parent to Student
            await parentUser.addChild(student);

            // 4. Update Enrollments for this student to have grades/attendance
            let enrollments = await Enrollment.findAll({ where: { userId: student.id } });
            console.log(`Found ${enrollments.length} enrollments for student.`);

            if (enrollments.length === 0) {
                console.log('No enrollments found. Creating dummy enrollments...');
                const courses = await Course.findAll({ limit: 3 });
                if (courses.length > 0) {
                    for (const course of courses) {
                        const [enrollment] = await Enrollment.findOrCreate({
                            where: { userId: student.id, courseId: course.id },
                            defaults: {
                                status: 'completed'
                            }
                        });
                        enrollments.push(enrollment);
                    }
                } else {
                    console.log('No courses found to enroll in.');
                }
            }

            for (const enrollment of enrollments) {
                await enrollment.update({
                    grade: ['A', 'B', 'B+', 'A-'].at(Math.floor(Math.random() * 4)),
                    attendancePercentage: 85 + Math.floor(Math.random() * 15), // 85-100%
                    status: 'completed'
                });
                console.log(`Updated enrollment for course ${enrollment.courseId} with grade and attendance.`);
            }
        }

        console.log('Parent seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding parents:', error);
        process.exit(1);
    }
};

seedParents();
