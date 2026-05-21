const express = require('express');
const router = express.Router();
const {
  createSession,
  getRecentSessions,
  getSessionById,
} = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createSession);
router.route('/recent').get(protect, getRecentSessions);
router.route('/:id').get(protect, getSessionById);

module.exports = router;
