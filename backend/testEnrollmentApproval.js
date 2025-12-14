const { User, Enrollment, Course } = require('./models');
const { connectDB } = require('./config/db');

const testApproval = async () => {
    try {
        await connectDB();

        console.log("1. Checking Users...");
        const student = await User.findOne({ where: { email: 'student@example.com' } });
        const advisor = await User.findOne({ where: { email: 'advisor@example.com' } });

        if (!student || !advisor) {
            console.log("Error: Users not found");
            return;
        }

        console.log("2. Assigning Advisor...");
        student.advisorId = advisor.id;
        await student.save();
        console.log(`Assigned ${advisor.email} to ${student.email}`);

        console.log("3. Simulate Registration...");
        // Just finding a course to enroll
        const course = await Course.findOne();
        if (!course) {
            console.log("Error: No course found");
            return;
        }

        // Clear existing enrollments for this student to avoid unique constraint error
        await Enrollment.destroy({ where: { userId: student.id } });

        // Creating direct enrollment to test status default/logic
        // Note: The controller logic 'req.user.advisorId' check happens in the API request context.
        // Here we are testing the model and basic data flow.

        // We can't easily simulate req.user here without mocking.
        // But we can verify the model supports 'pending'.

        const enrollment = await Enrollment.create({
            userId: student.id,
            courseId: course.id,
            status: 'pending' // Simulating what the controller would do
        });

        console.log(`Created enrollment with status: ${enrollment.status}`);

        if (enrollment.status === 'pending') {
            console.log("SUCCESS: Enrollment supports pending status.");
        } else {
            console.log("FAILURE: Enrollment status incorrect.");
        }

        // Clean up
        await enrollment.destroy();
        student.advisorId = null;
        await student.save();

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

testApproval();
