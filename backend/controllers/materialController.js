const { Material, Course } = require('../models');
const { v4: uuidv4 } = require('uuid');

// @desc    Upload new material or new version
// @route   POST /api/materials
const uploadMaterial = async (req, res) => {
    try {
        const { courseId, title, description, fileUrl, groupId } = req.body;

        if (req.user.role.name !== 'instructor' && req.user.role.name !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        let newGroupId = groupId;
        let version = 1;

        if (groupId) {
            // Updating existing material: Find current latest and update its isLatest to false
            const currentLatest = await Material.findOne({
                where: { groupId, isLatest: true }
            });

            if (currentLatest) {
                currentLatest.isLatest = false;
                await currentLatest.save();
                version = currentLatest.version + 1;
                newGroupId = groupId;
            } else {
                // Should not happen if groupId provided correctly, but handle gracefully
                newGroupId = uuidv4();
                version = 1;
            }
        } else {
            // New material
            newGroupId = uuidv4();
        }

        const material = await Material.create({
            courseId,
            title,
            description,
            fileUrl,
            version,
            isLatest: true,
            groupId: newGroupId
        });

        res.status(201).json(material);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get materials for a course
// @route   GET /api/materials/course/:courseId
const getMaterialsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { includeHistory } = req.query; // 'true' to see all versions (Instructor only)

        const whereClause = { courseId };

        // Students only see latest
        if (req.user.role.name === 'student' || includeHistory !== 'true') {
            whereClause.isLatest = true;
        }

        const materials = await Material.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });

        res.json(materials);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    uploadMaterial,
    getMaterialsByCourse
};
