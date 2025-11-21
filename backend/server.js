require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));