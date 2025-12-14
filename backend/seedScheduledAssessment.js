const { sequelize, Assessment, Course } = require('./models');

const seedScheduledAssessment = async () => {
    try {
        await sequelize.authenticate();

        // Find Introduction to Computer Science
        const course = await Course.findOne({ where: { courseCode: 'CS101' } });
        if (!course) {
            console.error('Course CS101 not found');
            process.exit(1);
        }

        // Create assessment starting tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        await Assessment.create({
            courseId: course.id,
            title: 'Future Final Exam',
            description: 'This exam is scheduled for tomorrow.',
            accessCode: 'FUTURE123',
            timeLimit: 120,
            attemptsAllowed: 1,
            startDate: tomorrow,
            dueDate: new Date(tomorrow.getTime() + 7 * 24 * 60 * 60 * 1000) // Due 1 week after start
        });

        console.log(`Created scheduled assessment "Future Final Exam" for ${course.name} starts on ${tomorrow.toLocaleString()}`);
        process.exit(0);

    } catch (error) {
        console.error('Error seeding scheduled assessment:', error);
        process.exit(1);
    }
};

seedScheduledAssessment();
