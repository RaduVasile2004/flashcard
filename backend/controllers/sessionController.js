const StudySession = require('../models/StudySession');
const Deck = require('../models/Deck');

const computeTotals = (reviews, startedAt, endedAt) => {
  const count = reviews.length;
  if (count === 0) {
    return { count: 0, correct: 0, avgGrade: 0, durationMs: 0 };
  }
  let correct = 0;
  let gradeSum = 0;
  for (const r of reviews) {
    if (r.grade >= 3) correct += 1;
    gradeSum += r.grade;
  }
  return {
    count,
    correct,
    avgGrade: Number((gradeSum / count).toFixed(2)),
    durationMs: Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime()),
  };
};

// @desc    Record a completed study session
// @route   POST /api/sessions
// @access  Private
const createSession = async (req, res) => {
  const { deckId, startedAt, endedAt, reviews } = req.body;

  if (!deckId || !startedAt || !endedAt || !Array.isArray(reviews)) {
    return res.status(400).json({ message: 'deckId, startedAt, endedAt and reviews are required.' });
  }
  if (reviews.length === 0) {
    return res.status(400).json({ message: 'Cannot record a session with no reviews.' });
  }

  try {
    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    // Same rule as getCardsToReview: standard decks open to all authed users; otherwise owner only.
    if (!deck.isStandard && deck.creator && deck.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'User not authorized to record sessions for this deck.' });
    }

    // Sanitize reviews: keep only valid entries
    const cleanReviews = reviews
      .filter(r => r && r.cardId && typeof r.grade === 'number' && r.grade >= 0 && r.grade <= 5)
      .map(r => ({
        card: r.cardId,
        grade: r.grade,
        msSpent: typeof r.msSpent === 'number' && r.msSpent >= 0 ? r.msSpent : 0,
      }));

    if (cleanReviews.length === 0) {
      return res.status(400).json({ message: 'No valid reviews in payload.' });
    }

    const totals = computeTotals(cleanReviews, startedAt, endedAt);

    const session = await StudySession.create({
      user: req.user._id,
      deck: deck._id,
      startedAt,
      endedAt,
      reviews: cleanReviews,
      totals,
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get the user's recent sessions
// @route   GET /api/sessions/recent?limit=10
// @access  Private
const getRecentSessions = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

  try {
    const sessions = await StudySession.find({ user: req.user._id })
      .sort({ endedAt: -1 })
      .limit(limit)
      .populate('deck', 'title')
      .select('-reviews'); // omit per-card details for the list view

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get full detail for one session
// @route   GET /api/sessions/:id
// @access  Private
const getSessionById = async (req, res) => {
  try {
    const session = await StudySession.findById(req.params.id)
      .populate('deck', 'title')
      .populate('reviews.card', 'frontText backText');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this session.' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createSession, getRecentSessions, getSessionById };
