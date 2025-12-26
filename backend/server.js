require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const { sequelize } = require('./models');
const seedDatabase = require('./utils/seeder');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const appealRoutes = require('./routes/appealRoutes');
const instructorPortalRoutes = require('./routes/instructorPortalRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const universityAnnouncementRoutes = require('./routes/universityAnnouncementRoutes');
const electiveRequestRoutes = require('./routes/electiveRequestRoutes');
const userRoutes = require('./routes/userRoutes');
const materialRoutes = require('./routes/materialRoutes');
const facilityRoutes = require('./routes/facilityRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const studentDocumentRoutes = require('./routes/studentDocumentRoutes');
const assetRoutes = require('./routes/assetRoutes');
const hrRoutes = require('./routes/hrRoutes');
const messageRoutes = require('./routes/messageRoutes');
const parentRoutes = require('./routes/parentRoutes');
const taAssignmentRoutes = require('./routes/taAssignmentRoutes');
const profileRoutes = require('./routes/profileRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const staffBenefitsRoutes = require('./routes/staffBenefitsRoutes');
const meetingRequestRoutes = require('./routes/meetingRequestRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const professionalDevelopmentRoutes = require('./routes/professionalDevelopmentRoutes');


const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS Configuration (Allow frontend to send cookies)
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true,
}));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/student-feedback', require('./routes/studentFeedbackRoutes'));
app.use('/api/appeals', appealRoutes);
app.use('/api/instructor-portal', instructorPortalRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/university-announcements', universityAnnouncementRoutes);
app.use('/api/elective-requests', electiveRequestRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/users', userRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/student-documents', studentDocumentRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/ta-assignments', taAssignmentRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/leave-requests', leaveRoutes);
app.use('/api/staff', staffBenefitsRoutes);
app.use('/api/meeting-requests', meetingRequestRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/professional-development', professionalDevelopmentRoutes);

const PORT = process.env.PORT || 3000;

// Initialize Database and Start Server
const startServer = async () => {
  try {
    // Connect to Database
    await connectDB();

    // Database Synchronization Strategy
    // ⚠️  IMPORTANT: Use migrations for production deployments
    const NODE_ENV = process.env.NODE_ENV || 'development';
    
    if (NODE_ENV === 'production') {
      // Production: Never auto-sync, use migrations only
      console.log('🚫 Production mode: Auto-sync disabled. Use "npm run migrate:up" to apply migrations.');
      console.log('💡 Ensure all migrations are run before starting the server.');
    } else {
      // Development: Allow controlled sync
      const ENABLE_SYNC = process.env.ENABLE_SYNC !== 'false'; // Default to true in development
      
      if (ENABLE_SYNC) {
        console.log('⚙️  Development mode: Running database sync...');
        await sequelize.sync({ alter: true });
        console.log('✅ Database synchronized.');
      } else {
        console.log('🔒 Sync disabled via ENABLE_SYNC=false. Using migrations only.');
      }
    }

    // Run Seeder (Creates dummy accounts if missing)
    await seedDatabase();

    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();