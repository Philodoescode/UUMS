const { sequelize, User, Role, Enrollment, Course } = require('./models');
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

        // 2. Create Parent User
        const hashedPassword = await bcrypt.hash('password123', 10);
        const [parentUser, created] = await User.findOrCreate({
            where: { email: 'parent@example.com' },
            defaults: {
                fullName: 'John Parent',
                email: 'parent@example.com',
                password: hashedPassword,
                roleId: parentRole.id
            }
        });

        if (created) console.log('Created parent user: parent@example.com');
        else console.log('Parent user already exists');

        // 3. Find a Student to Link
        // Look for a user with student role
        const studentRole = await Role.findOne({ where: { name: 'student' } });
        if (!studentRole) {
            console.log('Student role not found, skipping linking');
            return;
        }

        const students = await User.findAll({ where: { roleId: studentRole.id } });
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
