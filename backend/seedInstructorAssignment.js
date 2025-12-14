const { sequelize, User, Course, Instructor, CourseInstructor } = require('./models');

const seedInstructorAssignment = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Find User by email to get Instructor ID
        const user = await User.findOne({
            where: { email: 'instructor@example.com' },
            include: [{ model: Instructor, as: 'instructorProfile' }]
        });

        if (!user || !user.instructorProfile) {
            console.error('Instructor user not found or has no profile. Run main seeder first.');
            process.exit(1);
        }

        const instructorId = user.instructorProfile.id;
        console.log(`Found Instructor: ${user.fullName} (${instructorId})`);

        // 2. Find Courses
        const courses = await Course.findAll();
        if (courses.length === 0) {
            console.error('No courses found. Run seedCourses.js first.');
            process.exit(1);
        }

        // 3. Assign Instructor to all courses
        for (const course of courses) {
            const [assignment, created] = await CourseInstructor.findOrCreate({
                where: {
                    courseId: course.id,
                    instructorId: instructorId
                },
                defaults: {
                    isPrimary: true
                }
            });

            if (created) {
                console.log(`Assigned instructor to course: ${course.name} (${course.courseCode})`);
            } else {
                console.log(`Instructor already assigned to: ${course.name}`);
            }
        }

        console.log('Instructor assignments complete.');
        process.exit(0);

    } catch (error) {
        console.error('Error assigning instructor:', error);
        process.exit(1);
    }
};

seedInstructorAssignment();
