const { Course, Department } = require('./models');
const { connectDB } = require('./config/db');

const checkElectives = async () => {
    try {
        await connectDB();

        const electives = await Course.findAll({
            where: { courseType: 'Elective' },
            include: [{ model: Department, as: 'department' }]
        });

        console.log(`Found ${electives.length} elective courses.`);
        electives.forEach(c => console.log(`- ${c.courseCode}: ${c.name} (${c.department?.code})`));

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkElectives();
