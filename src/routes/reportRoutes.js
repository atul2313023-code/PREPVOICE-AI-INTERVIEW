const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

router.get('/:interviewId', authenticateToken, reportController.getReport);
router.get('/:interviewId/pdf', authenticateToken, reportController.getPdfReport);

module.exports = router;
