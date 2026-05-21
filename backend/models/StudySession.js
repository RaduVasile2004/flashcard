const mongoose = require('mongoose');

const reviewEntrySchema = new mongoose.Schema(
  {
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Flashcard', required: true },
    grade: { type: Number, min: 0, max: 5, required: true },
    msSpent: { type: Number, default: 0 },
  },
  { _id: false }
);

const studySessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deck: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    reviews: { type: [reviewEntrySchema], default: [] },
    totals: {
      count: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      avgGrade: { type: Number, default: 0 },
      durationMs: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

studySessionSchema.index({ user: 1, endedAt: -1 });

module.exports = mongoose.model('StudySession', studySessionSchema);
