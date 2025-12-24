const { User, Enrollment, Course, Role } = require('../models');

// Helper to convert letter grade to GPA points
const getGradePoints = (grade) => {
    const gradeMap = {
        'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'F': 0.0
    };
    return gradeMap[grade] || null;
};

// @desc    Get all children associated with the logged-in parent
// @route   GET /api/parent/children
const getChildren = async (req, res) => {
    try {
        const parentId = req.user.id;

        const parent = await User.findByPk(parentId, {
            include: [
                {
                    model: User,
                    as: 'children',
                    attributes: ['id', 'fullName', 'email'],
                    include: [{ model: Role, as: 'role' }]
                }
            ]
        });

        if (!parent) {
            return res.status(404).json({ message: 'Parent not found' });
        }

        res.json(parent.children);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get progress summary for a specific child
// @route   GET /api/parent/children/:childId/progress
const getChildProgress = async (req, res) => {
    try {
        const parentId = req.user.id;
        const { childId } = req.params;

        // 1. Verify Parent-Child Relationship
        const parent = await User.findByPk(parentId, {
            include: [
                {
                    model: User,
                    as: 'children',
                    where: { id: childId },
                    required: true // Ensures only if link exists
                }
            ]
        });

        if (!parent || parent.children.length === 0) {
            return res.status(403).json({ message: 'Not authorized to view this student\'s progress' });
        }

        const child = parent.children[0];

        // 2. Fetch Enrollments
        const enrollments = await Enrollment.findAll({
            where: { userId: childId },
            include: [
                { model: Course, as: 'course', attributes: ['id', 'courseCode', 'name', 'credits'] }
            ]
        });

        // 3. Calculate Stats
        let totalGradePoints = 0;
        let totalCredits = 0;
        let totalAttendance = 0;
        let attendanceCount = 0;

        const courseDetails = enrollments.map(enrollment => {
            const points = getGradePoints(enrollment.grade);
            if (points !== null && enrollment.course.credits) {
                totalGradePoints += points * enrollment.course.credits;
                totalCredits += enrollment.course.credits;
            }

            if (enrollment.attendancePercentage !== undefined && enrollment.attendancePercentage !== null) {
                totalAttendance += enrollment.attendancePercentage;
                attendanceCount++;
            }

            return {
                courseCode: enrollment.course.courseCode,
                courseName: enrollment.course.name,
                grade: enrollment.grade || 'N/A',
                attendance: enrollment.attendancePercentage || 0,
                credits: enrollment.course.credits
            };
        });

        const gpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 'N/A';
        const attendanceAverage = attendanceCount > 0 ? (totalAttendance / attendanceCount).toFixed(1) : 0;

        res.json({
            student: {
                id: child.id,
                name: child.fullName,
                email: child.email
            },
            summary: {
                gpa,
                attendanceAverage: parseFloat(attendanceAverage)
            },
            details: courseDetails
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getChildren,
    getChildProgress
};
