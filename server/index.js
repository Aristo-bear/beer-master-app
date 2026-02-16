const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const routes = require('./routes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for file uploads

// Routes
app.use('/api', routes);

// Serve static files (optional, if we want to serve frontend via backend later)
// app.use(express.static(path.join(__dirname, '../dist')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    db.init(); // Initialize database
});
