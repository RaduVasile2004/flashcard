const express = require('express');
const router = express.Router();
const {
  createFlashcard,
  reviewFlashcard,
  getCardsToReview,
  getUserStats,
  importFlashcards,
  deleteFlashcard,
  updateFlashcard,
  getDeckCardsStats,
} = require('../controllers/flashcardController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createFlashcard);

// This route must come before routes with dynamic parameters like '/:id'
router.route('/stats').get(protect, getUserStats);

router.route('/:id/review').post(protect, reviewFlashcard);
router.route('/:deckId/review').get(protect, getCardsToReview);
router.route('/:deckId/cards-stats').get(protect, getDeckCardsStats);
router.route('/:deckId/import').post(protect, importFlashcards);
router.route('/:id').delete(protect, deleteFlashcard).put(protect, updateFlashcard);

module.exports = router;
