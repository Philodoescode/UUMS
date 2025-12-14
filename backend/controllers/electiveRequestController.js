const { ElectiveRequest, Course, User, Department } = require('../models');
const { Op } = require('sequelize');

// @desc    Create a new elective course request
// @route   POST /api/elective-requests
const createRequest = async (req, res) => {
    try {
        const { courseId, comments } = req.body;
        const studentId = req.user.id; // From middleware

        // 1. Check if course exists and is Elective
        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (course.courseType !== 'Elective') {
            return res.status(400).json({ message: 'This course is not an elective.' });
        }

        // 2. Check if request already exists
        const existingRequest = await ElectiveRequest.findOne({
            where: {
                studentId,
                courseId,
                status: 'pending' // Or any status? Usually if rejected, can request again? Let's say pending prevents duplicates.
            }
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'You already have a pending request for this course.' });
        }

        // 3. Create Request
        const request = await ElectiveRequest.create({
            studentId,
            courseId,
            status: 'pending'
            // comments could be added if we had a field for student comments, currently model has advisorComments only.
            // Let's assume student just clicks "Request".
        });

        res.status(201).json(request);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all requests (Advisor) or My Requests (Student)
// @route   GET /api/elective-requests
const getRequests = async (req, res) => {
    try {
        const { role, id } = req.user;

        let whereClause = {};

        if (role.name === 'student') {
            whereClause = { studentId: id };
        } else if (role.name === 'advisor' || role.name === 'admin') {
            // Advisor sees all pending by default, or all?
            // Let's return all for now, maybe filter by query params later.
        } else {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const requests = await ElectiveRequest.findAll({
            where: whereClause,
            include: [
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'courseCode', 'name', 'credits']
                },
                {
                    model: User,
                    as: 'student',
                    attributes: ['id', 'fullName', 'email']
                },
                {
                    model: User,
                    as: 'advisor',
                    attributes: ['id', 'fullName']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(requests);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update request status (Approve/Reject)
// @route   PUT /api/elective-requests/:id
const updateRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, advisorComments } = req.body;
        const advisorId = req.user.id;

        // Verify Advisor Role
        if (req.user.role.name !== 'advisor' && req.user.role.name !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to approve/reject requests' });
        }

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const request = await ElectiveRequest.findByPk(id);
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        request.status = status;
        request.advisorComments = advisorComments;
        request.advisorId = advisorId;
        await request.save();

        // TODO: Notification logic could go here

        res.json(request);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createRequest,
    getRequests,
    updateRequest
};
