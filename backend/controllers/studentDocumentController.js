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
        const QRCode = require('qrcode');
        const { Enrollment, Course, User, Department } = require('../models');
        const { Op } = require('sequelize');

        // 1. Fetch Student Details
        const student = await User.findByPk(studentId, {
            include: [{ model: User, as: 'advisor', attributes: ['fullName'] }]
        });

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
                    attributes: ['courseCode', 'name', 'credits', 'semester', 'year'],
                    include: [{ model: Department, as: 'department' }]
                }
            ],
            order: [['course', 'year', 'ASC'], ['course', 'semester', 'ASC']]
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
        let majorDepartment = 'General Studies';

        if (enrollments.length > 0 && enrollments[0].course.department) {
            majorDepartment = enrollments[0].course.department.name;
        }

        enrollments.forEach(enrollment => {
            const credits = enrollment.course.credits || 0;
            const grade = enrollment.grade;

            if (grade && gradePoints[grade] !== undefined) {
                totalCredits += credits;
                totalPoints += (gradePoints[grade] * credits);
            }
        });

        const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

        // 4. Generate Transcript Meta Data
        const transcriptId = `TR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        const generatedAt = new Date().toUTCString();
        // Use localhost for now as 'my website'
        const verificationUrl = `http://localhost:5173/verify?tid=${transcriptId}&sid=${student.id}`;

        // 5. Generate QR Code
        const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);

        // 6. Generate PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=transcript_${student.fullName.replace(/\s+/g, '_')}_${transcriptId}.pdf`);

        doc.pipe(res);

        // --- HEADER ---
        doc.fontSize(24).font('Helvetica-Bold').text('University Unified Management System', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Office of the University Registrar', { align: 'center' });
        doc.text('123 Academic Avenue, Knowledge City, World', { align: 'center' });
        // Update link to point to localhost as requested
        doc.text('www.uums.edu', { align: 'center', link: 'http://localhost:5173' });

        doc.moveDown(2);

        doc.fontSize(16).font('Helvetica-Bold').text('OFFICIAL ACADEMIC TRANSCRIPT', { align: 'center', underline: true });
        doc.moveDown(1.5);

        // --- STUDENT & TRANSCRIPT INFO ---
        const infoTop = doc.y;

        // Left Column: Student Info
        doc.fontSize(10).font('Helvetica-Bold').text('Student Information:', 50, infoTop);
        doc.font('Helvetica').text(`Name: ${student.fullName}`, 50, infoTop + 15);
        doc.text(`Student ID: ${student.id}`, 50, infoTop + 30);
        doc.text(`Program: B.Sc. in ${majorDepartment}`, 50, infoTop + 45);
        doc.text(`Faculty: Faculty of ${majorDepartment}`, 50, infoTop + 60);

        // Right Column: Document Info
        doc.font('Helvetica-Bold').text('Document Details:', 350, infoTop);
        doc.font('Helvetica').text(`Transcript ID: ${transcriptId}`, 350, infoTop + 15);
        doc.text(`Generated At: ${generatedAt}`, 350, infoTop + 30, { width: 220 });

        // QR Code Image - Moved DOWN to avoid overlap with text
        // Previous position was infoTop - 10 (overlap). New position: infoTop + 45 (below text)
        doc.text('Scan to Verify:', 350, infoTop + 60);
        doc.image(qrCodeDataUrl, 350, infoTop + 75, { width: 60 });

        doc.moveDown(6);

        // --- ACADEMIC SUMMARY ---
        // Move down further to account for QR code height
        // QR code is at infoTop + 75 with height ~60 = infoTop + 135.
        // Let's set Y explicitly or moveDown inside loop or dynamic
        doc.y = Math.max(doc.y, infoTop + 150);

        doc.rect(50, doc.y, 500, 25).fill('#f0f0f0');
        doc.fillColor('black').font('Helvetica-Bold').fontSize(11).text(`Cumulative GPA: ${gpa}   |   Total Credits Earned: ${totalCredits}`, 50, doc.y - 18, { align: 'center', width: 500 });
        doc.moveDown(2);

        // --- COURSE TABLE ---
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 120;
        const col3 = 350;
        const col4 = 430;
        const col5 = 480;

        // Table Header
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Code', col1, tableTop);
        doc.text('Course Name', col2, tableTop);
        doc.text('Term', col3, tableTop);
        doc.text('Credits', col4, tableTop);
        doc.text('Grade', col5, tableTop);

        doc.moveTo(50, tableTop + 12).lineTo(550, tableTop + 12).stroke();

        // Table Body
        let y = tableTop + 20;
        doc.font('Helvetica');

        enrollments.forEach((enrollment, index) => {
            if (y > 720) {
                doc.addPage();
                y = 50;
            }

            if (index % 2 === 0) {
                doc.save().rect(50, y - 2, 500, 14).fill('#fafafa').restore();
            }

            doc.text(enrollment.course.courseCode, col1, y);
            doc.text(enrollment.course.name.substring(0, 45), col2, y);
            doc.text(`${enrollment.course.semester} ${enrollment.course.year}`, col3, y);
            doc.text(enrollment.course.credits.toString(), col4, y);
            doc.text(enrollment.grade || '--', col5, y);

            y += 14;
        });

        doc.moveTo(50, y).lineTo(550, y).stroke();
        doc.moveDown(2);

        // --- FOOTER / LEGEND ---
        if (y > 650) doc.addPage();

        const footerY = 680;

        doc.moveTo(50, footerY).lineTo(550, footerY).stroke();
        doc.fontSize(8).font('Helvetica-Oblique').text('This transcript is valid only if issued directly by the University Unified Management System and bears the digital signature of the Registrar.', 50, footerY + 10, { width: 350 });

        doc.font('Helvetica-Bold').text('Digitally Signed by:', 400, footerY + 10);
        doc.font('Helvetica').text('Dr. Academic Registrar', 400, footerY + 22);
        doc.text('University Registrar', 400, footerY + 34);

        doc.fontSize(7).font('Helvetica').text('Grading Scale: A (4.0), A- (3.7), B+ (3.3), B (3.0), B- (2.7), C+ (2.3), C (2.0), D (1.0), F (0.0)', 50, 750, { align: 'center', width: 500 });

        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).text(
                `Page ${i + 1} of ${pageCount} | Transcript ID: ${transcriptId}`,
                50,
                doc.page.height - 30,
                { align: 'center', width: doc.page.width - 100 }
            );
        }

        doc.end();

    } catch (error) {
        console.error('Transcript Generation Error:', error);
        res.status(500).json({ message: 'Error generating transcript' });
    }
};
