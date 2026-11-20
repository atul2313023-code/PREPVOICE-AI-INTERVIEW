const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviewController');
const { authenticateToken } = require('../middleware/auth');
const { uploadAudio } = require('../middleware/upload');

router.post('/', authenticateToken, interviewController.createInterview);
router.get('/', authenticateToken, interviewController.getInterviews);
router.get('/:id', authenticateToken, interviewController.getInterviewById);
router.post('/:id/start', authenticateToken, interviewController.startInterview);
router.post('/:id/answer', authenticateToken, uploadAudio.single('audio'), interviewController.submitAnswer);
router.post('/:id/next-question', authenticateToken, interviewController.getNextQuestion);
router.post('/:id/end', authenticateToken, interviewController.endInterview);

module.exports = router;
