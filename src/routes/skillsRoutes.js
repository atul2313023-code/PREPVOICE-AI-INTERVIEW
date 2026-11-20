const express = require('express');
const router = express.Router();
const skillsController = require('../controllers/skillsController');
const { authenticateToken } = require('../middleware/auth');

router.post('/match', authenticateToken, skillsController.matchSkills);
router.get('/latest', authenticateToken, skillsController.getLatestMatch);

module.exports = router;
