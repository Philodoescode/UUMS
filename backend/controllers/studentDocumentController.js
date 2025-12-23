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

// Generate Transcript PDF
exports.generateTranscript = async (req, res) => {
    try {
        const { studentId } = req.params;
        const PDFDocument = require('pdfkit');
        const { Enrollment, Course, User, Department } = require('../models');
        const { Op } = require('sequelize');

        // 1. Fetch Student Details
        const student = await User.findByPk(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // 2. Fetch Completed Enrollments
        const enrollments = await Enrollment.findAll({
            where: {
                userId: studentId,
                status: 'completed'
            },
            include: [
                {
                    model: Course,
                    as: 'course',
                    attributes: ['courseCode', 'name', 'credits'],
                    include: [{ model: Department, as: 'department', attributes: ['code'] }]
                }
            ],
            order: [['updatedAt', 'ASC']] // Chronological order of completion
        });

        // 3. Calculate GPA
        const gradePoints = {
            'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D+': 1.3, 'D': 1.0,
            'F': 0.0
        };

        let totalCredits = 0;
        let totalPoints = 0;

        enrollments.forEach(enrollment => {
            const credits = enrollment.course.credits || 0;
            const grade = enrollment.grade;

            if (grade && gradePoints[grade] !== undefined) {
                totalCredits += credits;
                totalPoints += (gradePoints[grade] * credits);
            }
        });

        const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

        // 4. Generate PDF
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=transcript_${student.fullName.replace(/\s+/g, '_')}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).text('University Unified Management System', { align: 'center' });
        doc.fontSize(12).text('Official Academic Transcript', { align: 'center' });
        doc.moveDown();

        // Student Info
        doc.fontSize(12).text(`Student Name: ${student.fullName}`);
        doc.text(`Email: ${student.email}`);
        doc.text(`Date Generated: ${new Date().toLocaleDateString()}`);
        doc.moveDown();

        // GPA Summary
        doc.fontSize(14).text(`Cumulative GPA: ${gpa}`, { bold: true });
        doc.text(`Total Credits Earned: ${totalCredits}`);
        doc.moveDown();

        // Course Table Header
        const tableTop = doc.y;
        const codeX = 50;
        const nameX = 150;
        const creditsX = 400;
        const gradeX = 480;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Code', codeX, tableTop);
        doc.text('Course Name', nameX, tableTop);
        doc.text('Credits', creditsX, tableTop);
        doc.text('Grade', gradeX, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Course List
        let y = tableTop + 25;
        doc.font('Helvetica');

        enrollments.forEach(enrollment => {
            if (y > 700) { // Add new page if close to bottom
                doc.addPage();
                y = 50;
            }

            doc.text(enrollment.course.courseCode, codeX, y);
            doc.text(enrollment.course.name.substring(0, 40) + (enrollment.course.name.length > 40 ? '...' : ''), nameX, y);
            doc.text(enrollment.course.credits.toString(), creditsX, y);
            doc.text(enrollment.grade || 'N/A', gradeX, y);

            y += 20;
        });

        // Footer
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).text(
                `Page ${i + 1} of ${pageCount}`,
                50,
                doc.page.height - 50,
                { align: 'center', width: doc.page.width - 100 }
            );
        }

        doc.end();

    } catch (error) {
        console.error('Transcript Generation Error:', error);
        res.status(500).json({ message: 'Error generating transcript' });
    }
};
