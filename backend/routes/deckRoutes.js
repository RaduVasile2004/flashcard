const express = require('express');
const router = express.Router();
const {
  createDeck,
  getUserDecks,
  getStandardDecks,
  getDeckById,
  seedStandardDecksRoute,
} = require('../controllers/deckController');
const { protect } = require('../middleware/authMiddleware');

router.route('/seed').post(seedStandardDecksRoute); // Route to manually trigger seeding
router.route('/').post(protect, createDeck);
router.route('/mine').get(protect, getUserDecks);
router.route('/standard').get(getStandardDecks);
router.route('/:id').get(protect, getDeckById);

module.exports = router;
