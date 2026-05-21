const mongoose = require('mongoose');

const deckSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  tags: {
    type: [String],
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isStandard: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual for populating flashcards
deckSchema.virtual('flashcards', {
  ref: 'Flashcard', // The model to use
  localField: '_id', // Find flashcards where `localField`
  foreignField: 'deckId', // is equal to `foreignField`
  justOne: false,
});

const Deck = mongoose.model('Deck', deckSchema);

module.exports = Deck;
