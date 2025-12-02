require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { sendMail } = require('./utils/mailer'); // Keep your existing mailer structure
const upload = require('./middleware/upload');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// --- FIXED CORS CONFIGURATION ---
const allowedOrigins = [
    'https://luz-lens.vercel.app',       // Your Vercel Frontend
    process.env.FRONTEND_URL,            // Environment variable backup
    'http://127.0.0.1:5500',             // Local Development
    'http://localhost:3000'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log("⚠️ Blocked by CORS:", origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (needed for email attachments)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- FIXED UPLOAD ENDPOINT ---
app.post('/upload', upload.single('file'), (req, res, next) => {
    try {
        // 1. Validation
        if (req.fileValidationError) {
            return res.status(400).json({ error: req.fileValidationError });
        }
        
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a file' });
        }

        // 2. CRITICAL FIX: SEND SUCCESS RESPONSE FIRST
        // We reply to the user immediately. The email happens later.
        res.status(200).json({
            message: 'File uploaded successfully',
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: `/uploads/${req.file.filename}`,
                size: req.file.size
            }
        });

        // 3. BACKGROUND EMAIL PROCESS
        // Prepare email content
        const mailOptions = {
            to: process.env.OWNER_EMAIL, 
            subject: 'New Upload - Luz&Lens',
            text: `New file uploaded:\n\nUploader: ${name} (${email})\nFile: ${req.file.originalname}\nSize: ${(req.file.size / 1024).toFixed(2)} KB`,
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2 style="color: #2c3e50;">New Upload - Luz&Lens</h2>
                    <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                        <h3 style="color: #34495e;">Uploader Details:</h3>
                        <ul>
                            <li><strong>Name:</strong> ${name}</li>
                            <li><strong>Email:</strong> ${email}</li>
                        </ul>
                        <h3 style="color: #34495e;">File Details:</h3>
                        <ul>
                            <li><strong>Filename:</strong> ${req.file.originalname}</li>
                            <li><strong>Size:</strong> ${(req.file.size / 1024).toFixed(2)} KB</li>
                        </ul>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: req.file.originalname,
                    path: req.file.path
                }
            ]
        };

        // Send email without 'await' so it doesn't block
        sendMail(mailOptions)
            .then(() => console.log(`📧 Email sent successfully for ${req.file.originalname}`))
            .catch(err => console.error("⚠️ Background Email Failed:", err.message));

    } catch (error) {
        console.error('Upload route error:', error);
        next(error);
    }
});

// Upload Multiple Endpoint (Kept as is)
app.post('/upload-multiple', upload.array('files', 5), (req, res, next) => {
    try {
        if (req.fileValidationError) return res.status(400).json({ error: req.fileValidationError });
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Please upload at least one file' });

        res.json({
            message: 'Files uploaded successfully',
            files: req.files.map(file => ({
                filename: file.filename,
                path: `/uploads/${file.filename}`,
                size: file.size
            }))
        });
    } catch (error) {
        next(error);
    }
});

// Test Endpoint
app.get('/', (req, res) => {
    res.send('Backend is running');
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
