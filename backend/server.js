require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const { sequelize } = require('./models');
const seedDatabase = require('./utils/seeder');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS Configuration (Allow frontend to send cookies)
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true, 
}));

// Routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;

// Initialize Database and Start Server
const startServer = async () => {
  try {
    // Connect to Database
    await connectDB();

    // Sync models with database (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');

    // Run Seeder (Creates dummy accounts if missing)
    await seedDatabase();

    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();