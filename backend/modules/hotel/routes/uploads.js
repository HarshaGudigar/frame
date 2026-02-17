const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../../../middleware/authMiddleware');
const { successResponse, errorResponse } = require('../../../utils/responseWrapper');

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, '../../../../uploads/hotel/id-proofs');
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `id-proof-${uniqueSuffix}${ext}`);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const ext = path.extname(file.originalname).toLowerCase();
        const mimeType = allowedTypes.test(file.mimetype);
        const extName = allowedTypes.test(ext);

        if (mimeType && extName) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, webp) are allowed'));
    },
});

/**
 * POST /api/m/hotel/uploads/id-proof
 * Upload an ID proof image.
 */
router.post('/id-proof', authMiddleware, (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return errorResponse(res, `Multer error: ${err.message}`, 400);
        } else if (err) {
            return errorResponse(res, err.message, 400);
        }

        if (!req.file) {
            return errorResponse(res, 'No file uploaded', 400);
        }

        const fileUrl = `/uploads/hotel/id-proofs/${req.file.filename}`;
        return successResponse(res, { url: fileUrl }, 'File uploaded successfully');
    });
});

module.exports = router;
