const { sequelize, Assessment, Course } = require('./models');

const seedGradedAssessment = async () => {
    try {
        await sequelize.authenticate();

        // Find Introduction to Computer Science
        const course = await Course.findOne({ where: { courseCode: 'CS101' } });
        if (!course) {
            console.error('Course CS101 not found');
            process.exit(1);
        }

        const questions = [
            {
                id: 'q1',
                type: 'multiple-choice',
                text: 'What is the capital of France?',
                options: ['London', 'Berlin', 'Paris', 'Madrid'],
                correctAnswer: 'Paris'
            },
            {
                id: 'q2',
                type: 'true-false',
                text: 'The earth is flat.',
                options: ['True', 'False'],
                correctAnswer: 'False'
            }
        ];

        await Assessment.create({
            courseId: course.id,
            title: 'Graded Validation Quiz',
            description: 'Take this to verify grading logic.',
            accessCode: 'GRADE123',
            timeLimit: 30,
            attemptsAllowed: 1,
            questions: questions
        });

        console.log(`Created graded assessment "Graded Validation Quiz" for ${course.name}`);
        process.exit(0);

    } catch (error) {
        console.error('Error seeding graded assessment:', error);
        process.exit(1);
    }
};

seedGradedAssessment();
