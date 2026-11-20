const express = require('express');
const router = express.Router();
const jdController = require('../controllers/jdController');
const { authenticateToken } = require('../middleware/auth');
const { uploadPdf } = require('../middleware/upload');

router.post('/analyze', authenticateToken, uploadPdf.single('jdFile'), jdController.analyzeJD);
router.get('/', authenticateToken, jdController.getJDs);
router.get('/:id', authenticateToken, jdController.getJDById);
router.put('/:id/select', authenticateToken, jdController.selectActiveJD);
router.delete('/:id', authenticateToken, jdController.deleteJD);

module.exports = router;
