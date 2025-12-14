const { sequelize, Course, Department, Instructor } = require('./models');

const seedCourses = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Get Departments
        const csDept = await Department.findOne({ where: { code: 'CS' } });
        const mathDept = await Department.findOne({ where: { code: 'MATH' } });

        if (!csDept || !mathDept) {
            console.error('Departments not found. Run the main seeder first (`node backend/utils/seeder.js` imports usually handle this via server startup, or checking manually).');
            // If server.js runs seedDatabase(), depts should exist.
            // Assuming they exist from previous steps.
        }

        const courses = [
            {
                courseCode: 'CS101',
                name: 'Introduction to Computer Science',
                description: 'Fundamental concepts of computing and programming.',
                credits: 3,
                departmentId: csDept ? csDept.id : null,
                semester: 'Fall',
                year: 2024,
                capacity: 50,
                courseType: 'Core',
                isActive: true
            },
            {
                courseCode: 'MATH101',
                name: 'Calculus I',
                description: 'Limits, derivatives, and integrals.',
                credits: 4,
                departmentId: mathDept ? mathDept.id : null,
                semester: 'Fall',
                year: 2024,
                capacity: 40,
                courseType: 'Core',
                isActive: true
            }
        ];

        for (const courseData of courses) {
            if (!courseData.departmentId) {
                console.warn(`Skipping ${courseData.courseCode} because department is missing.`);
                continue;
            }

            const [course, created] = await Course.findOrCreate({
                where: { courseCode: courseData.courseCode },
                defaults: courseData
            });

            if (created) {
                console.log(`Created course: ${course.name}`);
            } else {
                console.log(`Course already exists: ${course.name}`);
            }
        }

        console.log('Course seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding courses:', error);
        process.exit(1);
    }
};

seedCourses();
