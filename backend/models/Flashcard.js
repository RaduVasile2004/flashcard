const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
  frontText: {
    type: String,
    required: true,
  },
  backText: {
    type: String,
    required: true,
  },
  deckId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck',
    required: true,
  },
  // SM-2 Algorithm Fields
  interval: {
    type: Number,
    default: 0, // In days
  },
  repetition: {
    type: Number,
    default: 0,
  },
  easeFactor: {
    type: Number,
    default: 2.5,
  },
  nextReviewDate: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

const Flashcard = mongoose.model('Flashcard', flashcardSchema);

module.exports = Flashcard;
