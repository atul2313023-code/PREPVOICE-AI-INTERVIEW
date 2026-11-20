const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const { authenticateToken } = require('../middleware/auth');
const { uploadPdf } = require('../middleware/upload');

router.post('/upload', authenticateToken, uploadPdf.single('resume'), resumeController.uploadResume);
router.get('/', authenticateToken, resumeController.getResumes);
router.get('/:id', authenticateToken, resumeController.getResumeById);
router.put('/:id/select', authenticateToken, resumeController.selectActiveResume);
router.delete('/:id', authenticateToken, resumeController.deleteResume);

module.exports = router;
