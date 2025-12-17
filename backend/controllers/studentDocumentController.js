const { StudentDocument, User } = require('../models');

// Upload a document
exports.uploadDocument = async (req, res) => {
    try {
        const { studentId, category } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Normalized path for URL (forward slashes)
        const fileUrl = `/uploads/${req.file.filename}`;

        const document = await StudentDocument.create({
            studentId,
            category,
            fileUrl,
            uploadedById: req.user.id,
        });

        const docWithUploader = await StudentDocument.findByPk(document.id, {
            include: [{ model: User, as: 'uploader', attributes: ['id', 'fullName'] }]
        });

        res.status(201).json({ message: 'Document uploaded successfully', document: docWithUploader });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get documents for a student
exports.getStudentDocuments = async (req, res) => {
    try {
        const { studentId } = req.params;

        const documents = await StudentDocument.findAll({
            where: { studentId },
            include: [
                { model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }
            ],
            order: [['createdAt', 'DESC']],
        });

        res.status(200).json(documents);
    } catch (error) {
        console.error('Get Documents Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
