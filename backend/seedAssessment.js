const { sequelize, Assessment, Course } = require('./models');

const seedAssessment = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Find a course (e.g., the first one)
        const course = await Course.findOne();
        if (!course) {
            console.error('No courses found. Please seed courses first.');
            process.exit(1);
        }

        console.log(`Creating assessment for course: ${course.name} (${course.courseCode})`);

        const assessment = await Assessment.create({
            courseId: course.id,
            title: 'Midterm Exam',
            description: 'This serves as the midterm exam. Please answer all questions carefully.',
            accessCode: 'SECURE123',
            timeLimit: 30, // 30 minutes
            attemptsAllowed: 1,
            isActive: true,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Due in 7 days
        });

        console.log('Assessment created successfully!');
        console.log('ID:', assessment.id);
        console.log('Access Code:', assessment.accessCode);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding assessment:', error);
        process.exit(1);
    }
};

seedAssessment();
