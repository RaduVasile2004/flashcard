const Flashcard = require('../models/Flashcard');
const Deck = require('../models/Deck');

// @desc    Create a new flashcard
// @route   POST /api/flashcards
// @access  Private
const createFlashcard = async (req, res) => {
  const { frontText, backText, deckId } = req.body;

  try {
    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    // Prevent adding cards to read-only standard decks
    if (deck.isStandard) {
      return res.status(403).json({ message: 'Pachetele publice sunt read-only' });
    }

    // If the deck is not standard, it must have a creator. Verify ownership.
    if (deck.creator.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized to add cards to this deck' });
    }

    const flashcard = new Flashcard({
      frontText,
      backText,
      deckId,
    });

    const createdFlashcard = await flashcard.save();
    res.status(201).json(createdFlashcard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/**
 * Updates a flashcard's review data based on the SM-2 algorithm.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @ JSDoc-documentation for Bachelor's Thesis
 * 
 * The SM-2 algorithm is a popular spaced repetition system (SRS) that helps users learn and retain information more effectively.
 * This function takes a user's self-assessed grade (0-5) for a flashcard and updates the card's properties (`interval`, `repetition`, `easeFactor`, `nextReviewDate`) accordingly.
 *
 * @property {number} grade - The user's assessment of how well they recalled the information.
 *   - 5: Perfect recall
 *   - 4: Correct recall after a moment of hesitation
 *   - 3: Correct recall with difficulty
 *   - 2: Incorrect recall, but the correct answer seemed familiar
 *   - 1: Incorrect recall, but remembered the correct answer
 *   - 0: Complete blackout, no recollection
 *
 * @logic
 *
 * If the user's response was correct (grade >= 3):
 *   - The repetition counter is incremented.
 *   - The review interval is increased.
 *     - 1st repetition: interval is 1 day.
 *     - 2nd repetition: interval is 6 days.
 *     - Subsequent repetitions (n > 2): interval is calculated by multiplying the previous interval by the easeFactor.
 *
 * If the user's response was incorrect (grade < 3):
 *   - The repetition counter is reset to 0.
 *   - The interval is reset to 1 day, forcing an early review.
 *
 * The `easeFactor` is adjusted after every review to personalize the learning schedule.
 * A higher grade results in a slight increase to the easeFactor, spacing out future reviews more.
 * A lower grade results in a decrease, bringing future reviews closer.
 * The easeFactor is prevented from dropping below 1.3 to avoid overly frequent reviews.
 *
 * `nextReviewDate` is calculated by adding the new interval (in days) to the current date.
 */
const reviewFlashcard = async (req, res) => {
  const { grade } = req.body;
  const { id } = req.params;

  try {
    const card = await Flashcard.findById(id);

    if (!card) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }
    
    // Verify that the user is authorized to review this card.
    // A user can review a card if the deck is standard OR they are the creator.
    const deck = await Deck.findById(card.deckId);
    if (!deck) {
        return res.status(404).json({ message: 'The deck this card belongs to could not be found.' });
    }

    if (!deck.isStandard && deck.creator && deck.creator.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'User not authorized to review cards in this deck.' });
    }

    let { repetition, interval, easeFactor } = card;

    // 1. Check if the grade is valid
    if (grade < 0 || grade > 5) {
      return res.status(400).json({ message: 'Grade must be between 0 and 5' });
    }

    // 2. Process the grade
    if (grade >= 3) { // Correct response
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetition += 1;
    } else { // Incorrect response
      repetition = 0;
      interval = 1;
    }

    // 3. Update the easeFactor
    easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (easeFactor < 1.3) {
      easeFactor = 1.3;
    }
    
    // 4. Set next review date
    const now = new Date();
    const nextReviewDate = new Date(now.setDate(now.getDate() + interval));

    // 5. Update the card in the database
    card.repetition = repetition;
    card.interval = interval;
    card.easeFactor = easeFactor;
    card.nextReviewDate = nextReviewDate;

    const updatedCard = await card.save();
    res.json(updatedCard);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getCardsToReview = async (req, res) => {
  const { deckId } = req.params;

  try {
    // A user can review a deck if it's standard OR they are the creator.
    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }
    
    // The route is protected, so req.user exists.
    // Block access only if the deck is NOT standard AND the user is NOT the creator.
    if (!deck.isStandard && deck.creator && deck.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'User not authorized to review this deck' });
    }

    const cardsToReview = await Flashcard.find({
      deckId: deckId,
      nextReviewDate: { $lte: new Date() },
    });

    res.json(cardsToReview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's learning statistics
// @route   GET /api/flashcards/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    // 1. Find all decks created by the user to get their IDs
    const userDecks = await Deck.find({ creator: req.user._id }).select('_id');
    const deckIds = userDecks.map(deck => deck._id);

    // 2. Find all flashcards belonging to those decks
    const userFlashcards = await Flashcard.find({ deckId: { $in: deckIds } });

    // 3. Calculate statistics from the user's flashcards
    const studiedCards = userFlashcards.filter(card => card.repetition > 0);
    const totalStudied = studiedCards.length;

    // Difficulty Distribution based on easeFactor
    let hard = 0;
    let good = 0;
    let easy = 0;

    studiedCards.forEach(card => {
      if (card.easeFactor < 2.0) hard++;
      else if (card.easeFactor <= 2.5) good++;
      else easy++;
    });

    const difficultyDistribution = [
      { name: 'Greu', value: hard },
      { name: 'Potrivit', value: good },
      { name: 'Ușor', value: easy },
    ];

    // Upcoming Reviews for the next 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the beginning of today
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const upcomingReviews = userFlashcards.filter(card => {
      const nextReview = new Date(card.nextReviewDate);
      return nextReview >= today && nextReview < sevenDaysFromNow;
    }).length;

    res.status(200).json({
      totalStudied,
      difficultyDistribution,
      upcomingReviews,
    });

  } catch (error) {
    res.status(500).json({ message: `Error fetching user stats: ${error.message}` });
  }
};

// @desc    Bulk import flashcards into a deck
// @route   POST /api/flashcards/:deckId/import
// @access  Private
const importFlashcards = async (req, res) => {
  const { deckId } = req.params;
  const { cards } = req.body; // Expect an array of { frontText, backText }

  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ message: 'Request body must contain a non-empty array of cards.' });
  }

  try {
    // 1. Verify deck exists and user has permission
    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found.' });
    }
    if (deck.isStandard) {
      return res.status(403).json({ message: 'Cannot import cards into a standard (read-only) deck.' });
    }
    if (deck.creator && deck.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'User not authorized to import cards into this deck.' });
    }

    // 2. Prepare cards for insertion by adding the deckId
    const cardsToInsert = cards.map(card => ({
      frontText: card.frontText,
      backText: card.backText,
      deckId: deckId,
    }));

    // 3. Use insertMany for efficient bulk insertion
    const createdFlashcards = await Flashcard.insertMany(cardsToInsert);

    res.status(201).json({
      message: `${createdFlashcards.length} cards imported successfully into '${deck.title}'.`,
      count: createdFlashcards.length,
    });

  } catch (error) {
    // Handle potential validation errors from insertMany
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: `Validation error: ${error.message}` });
    }
    res.status(500).json({ message: `Error importing flashcards: ${error.message}` });
  }
};


module.exports = { createFlashcard, reviewFlashcard, getCardsToReview, getUserStats, importFlashcards };
