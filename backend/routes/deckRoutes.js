const express = require('express');
const router = express.Router();
const {
  createDeck,
  getUserDecks,
  getStandardDecks,
  getDeckById,
  seedStandardDecksRoute,
  searchDecks,
  updateDeck,
} = require('../controllers/deckController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

router.route('/seed').post(seedStandardDecksRoute); // Route to manually trigger seeding
router.route('/').post(protect, createDeck);
router.route('/mine').get(protect, getUserDecks);
router.route('/standard').get(getStandardDecks);
router.route('/search').get(optionalAuth, searchDecks);
router.route('/:id').get(protect, getDeckById).put(protect, updateDeck);

module.exports = router;
