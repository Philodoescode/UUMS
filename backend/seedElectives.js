const { Course, Department } = require('./models');
const { connectDB } = require('./config/db');

const seedElectives = async () => {
    try {
        await connectDB();

        // Get Departments
        const csDept = await Department.findOne({ where: { code: 'CS' } });
        const histDept = await Department.findOne({ where: { code: 'HIST' } });

        if (!csDept || !histDept) {
            console.log("Departments not found. Run main seeder first.");
            return;
        }

        const electives = [
            {
                courseCode: 'CS450',
                name: 'Introduction to Artificial Intelligence',
                description: 'Explore the basics of AI, including search algorithms, machine learning, and neural networks.',
                credits: 3,
                departmentId: csDept.id,
                semester: 'Spring',
                year: 2025,
                capacity: 30,
                courseType: 'Elective',
                isActive: true
            },
            {
                courseCode: 'CS460',
                name: 'Computer Graphics',
                description: 'Fundamentals of 2D and 3D graphics, rendering, and animation.',
                credits: 3,
                departmentId: csDept.id,
                semester: 'Spring',
                year: 2025,
                capacity: 25,
                courseType: 'Elective',
                isActive: true
            },
            {
                courseCode: 'HIST200',
                name: 'History of Technology',
                description: 'A survey of technological advancements throughout human history.',
                credits: 3,
                departmentId: histDept.id,
                semester: 'Fall',
                year: 2024,
                capacity: 50,
                courseType: 'Elective',
                isActive: true
            }
        ];

        for (const data of electives) {
            const [course, created] = await Course.findOrCreate({
                where: { courseCode: data.courseCode },
                defaults: data
            });
            if (created) console.log(`Created Elective: ${course.name}`);
            else console.log(`Elective exists: ${course.name}`);
        }

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

seedElectives();
