const { Assessment, AssessmentSubmission, Enrollment, Course, User } = require('../models');
const { Op } = require('sequelize');
const assessmentMetadataService = require('../utils/assessmentMetadataEavService');

// @desc    Create a new assessment
// @route   POST /api/assessments
const createAssessment = async (req, res) => {
    try {
        const { courseId, title, description, accessCode, timeLimit, attemptsAllowed, dueDate, startDate, questions, type, latePolicy, latePenalty, closeDate } = req.body;

        // Check if user is instructor for the course (or admin)
        if (req.user.role.name !== 'instructor' && req.user.role.name !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to create assessments' });
        }

        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const assessment = await Assessment.create({
            courseId,
            title,
            description,
            accessCode,
            timeLimit,
            attemptsAllowed,
            dueDate,
            startDate,
            questions,
            type,
            latePolicy,
            latePenalty,
            closeDate
        });

        res.status(201).json(assessment);
    } catch (error) {
        console.error(error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get assessments for a course
// @route   GET /api/assessments/course/:courseId
const getAssessmentsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // 1. Enrollment Check (Security)
        // If student, must be enrolled.
        if (req.user.role.name === 'student') {
            const enrollment = await Enrollment.findOne({
                where: {
                    userId,
                    courseId,
                    status: { [Op.in]: ['enrolled', 'completed'] }
                }
            });

            if (!enrollment) {
                return res.status(403).json({ message: 'You must be enrolled in this course to view assessments.' });
            }
        }

        let attributes = {};
        if (req.user.role.name === 'student') {
            attributes = { exclude: ['accessCode'] };
        }

        const assessments = await Assessment.findAll({
            where: { courseId, isActive: true },
            attributes
        });

        // For students, distinct 'submitted' status might be useful
        // But for now, just returning list is fine.

        if (req.user.role.name === 'student') {
            const assessmentsWithSubmission = await Promise.all(assessments.map(async (assessment) => {
                const submission = await AssessmentSubmission.findOne({
                    where: { assessmentId: assessment.id, studentId: userId },
                    attributes: ['id', 'status', 'score', 'grade', 'gradingStatus']
                });
                const assessmentData = assessment.toJSON();
                assessmentData.submission = submission;
                return assessmentData;
            }));
            return res.json(assessmentsWithSubmission);
        }

        res.json(assessments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Verify access code and start assessment
// @route   POST /api/assessments/:id/start
const startAssessment = async (req, res) => {
    try {
        const { accessCode } = req.body;
        const assessmentId = req.params.id;
        const userId = req.user.id;

        const assessment = await Assessment.findByPk(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // 1. Validate Access Code (Secure Token)
        if (assessment.accessCode !== accessCode) {
            return res.status(401).json({ message: 'Invalid access code.' });
        }

        // 2. Check if Assessment Scheduled Start Date has passed
        const now = new Date();
        if (assessment.startDate && now < new Date(assessment.startDate)) {
            return res.status(403).json({ message: `Assessment has not started yet. Starts on ${new Date(assessment.startDate).toLocaleString()}` });
        }

        // 2b. Check if Assessment has Closed
        if (assessment.closeDate && now > new Date(assessment.closeDate)) {
            return res.status(403).json({ message: `Assessment is closed. Closed on ${new Date(assessment.closeDate).toLocaleString()}` });
        }

        // 2. Check Enrollment again just in case
        const enrollment = await Enrollment.findOne({
            where: {
                userId,
                courseId: assessment.courseId,
                status: { [Op.in]: ['enrolled', 'completed'] }
            }
        });
        if (!enrollment) {
            return res.status(403).json({ message: 'Not enrolled.' });
        }

        // 3. Check existing submissions (Attempts)
        const existingSubmission = await AssessmentSubmission.findOne({
            where: {
                assessmentId,
                studentId: userId
            }
        });

        if (existingSubmission) {
            // If already submitted or time expired
            if (existingSubmission.status !== 'in-progress') {
                return res.status(400).json({ message: 'You have already taken this assessment.' });
            }
            // If in-progress, resume it (return existing start time)
            const assessmentData = assessment.toJSON();
            delete assessmentData.accessCode;

            return res.json({
                ...existingSubmission.toJSON(),
                assessment: assessmentData
            });
        }

        // 4. Create Submission (Start Timer)
        const submission = await AssessmentSubmission.create({
            assessmentId,
            studentId: userId,
            startTime: new Date(),
            status: 'in-progress',
            gradingStatus: 'pending'
        });

        // Don't send access code or correct answers back
        const assessmentData = assessment.toJSON();
        delete assessmentData.accessCode;
        if (assessmentData.questions) {
            assessmentData.questions = assessmentData.questions.map(q => {
                const { correctAnswer, ...rest } = q;
                return rest;
            });
        }

        res.status(201).json({
            ...submission.toJSON(),
            assessment: assessmentData
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Submit assessment
// @route   POST /api/assessments/:id/submit
const submitAssessment = async (req, res) => {
    try {
        const assessmentId = req.params.id;
        const userId = req.user.id;
        const { content, fileUrl } = req.body;

        const submission = await AssessmentSubmission.findOne({
            where: { assessmentId, studentId: userId, status: 'in-progress' }
        });

        if (!submission) {
            return res.status(404).json({ message: 'No active submission found.' });
        }

        const assessment = await Assessment.findByPk(assessmentId);
        const now = new Date();

        // 5. Time limit check (Server-side enforcement) & Deadline Checks

        // A. Hard Close Date Check
        if (assessment.closeDate && now > new Date(assessment.closeDate)) {
            // Even if late allowed, closeDate is hard stop
            return res.status(403).json({ message: 'Assessment is closed. Submissions no longer accepted.' });
        }

        // B. Late Check
        let isLate = false;
        if (assessment.dueDate && now > new Date(assessment.dueDate)) {
            isLate = true;
            if (assessment.latePolicy === 'BLOCK_LATE') {
                return res.status(403).json({ message: 'Late submissions are not accepted.' });
            }
        }

        // C. Quiz Time Limit Check
        if (assessment.type === 'QUIZ') {
            const startTime = new Date(submission.startTime);
            const timeLimitMs = assessment.timeLimit * 60 * 1000;
            const bufferMs = 2 * 60 * 1000;

            if (now - startTime > timeLimitMs + bufferMs) {
                // Could mark as late or just accept. 
                // If specific quiz logic needed, add here.
            }
        }

        // 6. Auto-Grading Logic
        let score = 0;
        let totalQuestions = 0;
        let gradingStatus = 'pending';
        let grade = null;
        let finalScore = null;

        if (assessment.type === 'QUIZ' && assessment.questions && Array.isArray(assessment.questions)) {
            totalQuestions = assessment.questions.length;
            const answers = content || {};

            assessment.questions.forEach(q => {
                const studentAnswer = answers[q.id];
                if (studentAnswer === q.correctAnswer) {
                    score += 1;
                }
            });

            // Calculate Percentage
            finalScore = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

            // Apply Late Penalty
            if (isLate && assessment.latePolicy === 'ALLOW_LATE' && assessment.latePenalty > 0) {
                finalScore = Math.max(0, finalScore - assessment.latePenalty);
            }

            // Assign Grade
            grade = 'F';
            if (finalScore >= 90) grade = 'A';
            else if (finalScore >= 80) grade = 'B';
            else if (finalScore >= 70) grade = 'C';
            else if (finalScore >= 60) grade = 'D';

            gradingStatus = 'graded';
        } else if (assessment.type === 'ASSIGNMENT') {
            // Manual grading usually, but mark as submitted
            gradingStatus = 'pending';
            finalScore = null; // Instructor needs to grade
            // Store isLate so instructor sees it
        }

        submission.endTime = now;
        submission.content = content;
        submission.fileUrl = fileUrl; // Save file URL
        submission.status = 'submitted';
        submission.score = finalScore;
        submission.grade = grade;
        submission.gradingStatus = gradingStatus;
        submission.isLate = isLate;

        await submission.save();

        res.json({ message: 'Assessment submitted successfully.', submission });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


// @desc    Get submission details
// @route   GET /api/assessments/submission/:id
const getSubmission = async (req, res) => {
    try {
        const submissionId = req.params.id;
        const userId = req.user.id;

        const submission = await AssessmentSubmission.findByPk(submissionId, {
            include: [
                {
                    model: Assessment,
                    as: 'assessment',
                    attributes: ['id', 'title', 'description', 'questions'] // Include questions for review
                }
            ]
        });

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Security check: Only the student who owns it or an instructor/admin can view it
        if (submission.studentId !== userId && req.user.role.name === 'student') {
            return res.status(403).json({ message: 'Not authorized to view this submission.' });
        }

        res.json(submission);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ============================================================================
// Assessment Metadata (EAV) Operations
// ============================================================================

// @desc    Get all metadata for an assessment
// @route   GET /api/assessments/:id/metadata
const getAssessmentMetadata = async (req, res) => {
    try {
        const assessmentId = req.params.id;

        const assessment = await Assessment.findByPk(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Students shouldn't see instructor-only metadata
        const metadata = await assessmentMetadataService.getAssessmentMetadata(assessmentId);
        
        // Filter out instructor-only fields for students
        if (req.user.role.name === 'student') {
            delete metadata.instructorNotes;
        }

        res.json({
            assessmentId,
            metadata,
        });
    } catch (error) {
        console.error('Error fetching assessment metadata:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get metadata with full attribute details (instructors only)
// @route   GET /api/assessments/:id/metadata/details
const getAssessmentMetadataDetails = async (req, res) => {
    try {
        // Only instructors and admins can see full details
        if (req.user.role.name !== 'instructor' && req.user.role.name !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const assessmentId = req.params.id;

        const assessment = await Assessment.findByPk(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const metadata = await assessmentMetadataService.getAssessmentMetadataWithDetails(assessmentId);

        res.json({
            assessmentId,
            metadata,
        });
    } catch (error) {
        console.error('Error fetching assessment metadata details:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Set metadata for an assessment
// @route   PUT /api/assessments/:id/metadata
const setAssessmentMetadata = async (req, res) => {
    try {
        // Only instructors and admins can set metadata
        if (req.user.role.name !== 'instructor' && req.user.role.name !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to modify assessment metadata' });
        }

        const assessmentId = req.params.id;

        const assessment = await Assessment.findByPk(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const metadata = req.body;
        if (!metadata || Object.keys(metadata).length === 0) {
            return res.status(400).json({ message: 'Metadata object is required' });
        }

        // Bulk set metadata
        const results = await assessmentMetadataService.bulkSetAssessmentMetadata(assessmentId, metadata);

        // Mark assessment as having EAV metadata enabled
        if (!assessment.metadataEavEnabled) {
            await assessment.update({ metadataEavEnabled: true });
        }

        res.json({
            assessmentId,
            results,
        });
    } catch (error) {
        console.error('Error setting assessment metadata:', error);
        if (error.message.includes('not found')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a specific metadata attribute from an assessment
// @route   DELETE /api/assessments/:id/metadata/:attributeName
const deleteAssessmentMetadata = async (req, res) => {
    try {
        // Only instructors and admins can delete metadata
        if (req.user.role.name !== 'instructor' && req.user.role.name !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const assessmentId = req.params.id;
        const attributeName = req.params.attributeName;

        const assessment = await Assessment.findByPk(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Convert camelCase to snake_case for attribute lookup
        const snakeCaseName = attributeName.replace(/([A-Z])/g, '_$1').toLowerCase();

        const deleted = await assessmentMetadataService.deleteAssessmentMetadata(assessmentId, snakeCaseName);

        if (!deleted) {
            return res.status(404).json({ message: 'Metadata attribute not found' });
        }

        res.json({ message: 'Metadata deleted successfully' });
    } catch (error) {
        console.error('Error deleting assessment metadata:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get available metadata attributes
// @route   GET /api/assessments/metadata/attributes
const getAvailableMetadataAttributes = async (req, res) => {
    try {
        const attributes = await assessmentMetadataService.getAvailableMetadataAttributes();
        res.json(attributes);
    } catch (error) {
        console.error('Error fetching available metadata attributes:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createAssessment,
    getAssessmentsByCourse,
    startAssessment,
    submitAssessment,
    getSubmission,
    // Metadata EAV operations
    getAssessmentMetadata,
    getAssessmentMetadataDetails,
    setAssessmentMetadata,
    deleteAssessmentMetadata,
    getAvailableMetadataAttributes,
};
