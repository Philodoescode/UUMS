const { GradeAppeal, Enrollment, AssessmentSubmission, User, Assessment, Course } = require('../models');

// @desc    Create a new grade appeal (Course or Assessment)
// @route   POST /api/appeals
const createAppeal = async (req, res) => {
    try {
        const { enrollmentId, submissionId, reason } = req.body;
        const studentId = req.user.id; // User must be authenticated

        if (!reason) {
            return res.status(400).json({ message: 'Reason is required' });
        }

        // Determine Type
        if (enrollmentId) {
            // Check for existing pending appeal
            const existing = await GradeAppeal.findOne({
                where: { enrollmentId, status: 'pending' }
            });
            if (existing) {
                return res.status(400).json({ message: 'You already have a pending appeal for this course grade.' });
            }

            // Allow appeals only if grade exists? (Logic handled on frontend mostly, but good to verify)

            const appeal = await GradeAppeal.create({
                studentId,
                enrollmentId,
                reason,
                type: 'COURSE_GRADE',
                status: 'pending'
            });
            return res.status(201).json({ message: 'Appeal submitted', appeal });

        } else if (submissionId) {
            const existing = await GradeAppeal.findOne({
                where: { submissionId, status: 'pending' }
            });
            if (existing) {
                return res.status(400).json({ message: 'You already have a pending appeal for this assessment.' });
            }

            const appeal = await GradeAppeal.create({
                studentId,
                submissionId,
                reason,
                type: 'ASSESSMENT_GRADE',
                status: 'pending'
            });
            return res.status(201).json({ message: 'Appeal submitted', appeal });
        } else {
            return res.status(400).json({ message: 'Either enrollmentId or submissionId is required' });
        }

    } catch (error) {
        console.error("Create Appeal Error:", error);
        res.status(500).json({ message: 'Server error creating appeal' });
    }
};

// @desc    Get appeals for a specific course (Course Grade Appeals)
// @route   GET /api/appeals/course/:courseId
const getCourseGradeAppeals = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        // Find enrollment first
        const enrollment = await Enrollment.findOne({ where: { courseId, userId: studentId } });
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        const appeal = await GradeAppeal.findOne({
            where: { enrollmentId: enrollment.id },
            order: [['createdAt', 'DESC']]
        }); // Get latest

        res.json(appeal || null);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get appeal for a specific submission
// @route   GET /api/appeals/submission/:submissionId
const getSubmissionAppeal = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const appeal = await GradeAppeal.findOne({
            where: { submissionId },
            order: [['createdAt', 'DESC']]
        });
        res.json(appeal || null);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all appeals for a course (Instructor View)
// @route   GET /api/appeals/instructor/course/:courseId
const getInstructorAppeals = async (req, res) => {
    try {
        const { courseId } = req.params;
        console.log(`Fetching appeals for courseId: ${courseId}`);

        // 1. Get Enrollment Appeals
        const enrollmentAppeals = await GradeAppeal.findAll({
            where: { type: 'COURSE_GRADE' },
            include: [
                {
                    model: Enrollment,
                    as: 'enrollment',
                    where: { courseId },
                    required: true,
                    include: [{ model: User, as: 'student', attributes: ['id', 'fullName', 'email'] }]
                },
                { model: User, as: 'student', attributes: ['id', 'fullName'] }
            ]
        });

        // 2. Get Assessment Appeals
        // This is trickier because we need to find submissions for assessments in this course
        const assessmentAppeals = await GradeAppeal.findAll({
            where: { type: 'ASSESSMENT_GRADE' },
            include: [
                {
                    model: AssessmentSubmission,
                    as: 'submission',
                    required: true,
                    include: [
                        {
                            model: Assessment,
                            as: 'assessment',
                            where: { courseId },
                            required: true,
                            attributes: ['id', 'title']
                        }
                    ]
                },
                { model: User, as: 'student', attributes: ['id', 'fullName'] }
            ]
        });

        console.log(`Found ${enrollmentAppeals.length} enrollment appeals and ${assessmentAppeals.length} assessment appeals.`);

        // Use filter to remove appeals where submission/assessment (due to courseId filter) didn't match
        // Actually Sequelize inner join (required: true implied by where clause in include) handles this?
        // Wait, AssessmentSubmission includes Assessment. If Assessment where courseId matches, we are good.

        res.json({
            courseAppeals: enrollmentAppeals,
            assessmentAppeals: assessmentAppeals
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update appeal status (Instructor)
// @route   PUT /api/appeals/:id
const updateAppeal = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, professorResponse, newGrade, newScore } = req.body; // newScore for assessments

        const appeal = await GradeAppeal.findByPk(id);
        if (!appeal) return res.status(404).json({ message: 'Appeal not found' });

        await appeal.update({
            status,
            professorResponse,
            newGrade, // Only if Course Grade
            resolvedAt: status === 'resolved' ? new Date() : null,
            resolvedById: req.user.id
        });

        // If Resolved and newScore provided for Assessment Appeal, update submission
        if (appeal.type === 'ASSESSMENT_GRADE' && status === 'resolved' && newScore !== undefined) {
            const submission = await AssessmentSubmission.findByPk(appeal.submissionId);
            if (submission) {
                await submission.update({ score: newScore });
                // Recalculate grade? Or trust instructor input?
                // Simple logic for now.
            }
        }

        // If Resolved and newGrade provided for Course Appeal
        if (appeal.type === 'COURSE_GRADE' && status === 'resolved' && newGrade) {
            const enrollment = await Enrollment.findByPk(appeal.enrollmentId);
            if (enrollment) {
                await enrollment.update({ grade: newGrade });
            }
        }

        res.json(appeal);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createAppeal,
    getCourseGradeAppeals,
    getSubmissionAppeal,
    getInstructorAppeals,
    updateAppeal
};
