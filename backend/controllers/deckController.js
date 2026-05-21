const Deck = require('../models/Deck');
const User = require('../models/User');
const Flashcard = require('../models/Flashcard');

// @desc    Create new deck
// @route   POST /api/decks
// @access  Private
const createDeck = async (req, res) => {
  const { title, description, tags } = req.body;

  try {
    const deck = new Deck({
      title,
      description,
      tags,
      creator: req.user._id,
    });

    const createdDeck = await deck.save();
    res.status(201).json(createdDeck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's decks
// @route   GET /api/decks/mine
// @access  Private
const getUserDecks = async (req, res) => {
  try {
    const decks = await Deck.find({ creator: req.user._id });
    res.json(decks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get standard decks
// @route   GET /api/decks/standard
// @access  Public
const getStandardDecks = async (req, res) => {
  try {
    const decks = await Deck.find({ isStandard: true });
    res.json(decks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Escape regex special characters in user input
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Search decks by title / description / tags
// @route   GET /api/decks/search?q=...
// @access  Public (auth optional — includes user's own decks when authenticated)
const searchDecks = async (req, res) => {
  const q = (req.query.q || '').trim();

  if (!q) {
    return res.json({ mine: [], standard: [] });
  }

  const regex = new RegExp(escapeRegex(q), 'i');
  const textFilter = {
    $or: [{ title: regex }, { description: regex }, { tags: regex }],
  };

  try {
    const standardPromise = Deck.find({
      $and: [{ isStandard: true }, textFilter],
    }).limit(50);

    const minePromise = req.user
      ? Deck.find({
          $and: [
            { creator: req.user._id, isStandard: { $ne: true } },
            textFilter,
          ],
        }).limit(50)
      : Promise.resolve([]);

    const [standard, mine] = await Promise.all([standardPromise, minePromise]);
    res.json({ mine, standard });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get deck by ID
// @route   GET /api/decks/:id
// @access  Private (standard decks viewable by any authed user; user decks only by their creator)
const getDeckById = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id).populate('flashcards');

    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    if (
      !deck.isStandard &&
      (!deck.creator || deck.creator.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: 'Not authorized to view this deck' });
    }

    res.json(deck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Seeds the database with standard decks. Idempotent and non-destructive:
 * if any standard decks already exist, this is a no-op so that user review
 * progress on standard cards (SM-2 fields, lapses, etc.) is preserved across
 * server restarts.
 */
const seedStandardDecks = async () => {
  try {
    const existingCount = await Deck.countDocuments({ isStandard: true });
    if (existingCount > 0) {
      console.log(`Standard decks already present (${existingCount}). Skipping seed.`);
      return;
    }

    // Create a new standard deck for 'Capitalele Europei'
    const capitalDeck = new Deck({
        title: 'Capitalele Europei',
        description: 'O colecție de capitale din țările europene. Testați-vă cunoștințele geografice!',
        isStandard: true,
        tags: ['geografie', 'capitale', 'europa'],
    });
    const createdDeck = await capitalDeck.save();
    console.log(`Standard deck '${createdDeck.title}' created.`);

    // Create flashcards for the new deck
    const capitalFlashcards = [
      { frontText: 'Franța', backText: 'Paris', deckId: createdDeck._id },
      { frontText: 'Italia', backText: 'Roma', deckId: createdDeck._id },
      { frontText: 'Spania', backText: 'Madrid', deckId: createdDeck._id },
      { frontText: 'Germania', backText: 'Berlin', deckId: createdDeck._id },
      { frontText: 'Regatul Unit', backText: 'Londra', deckId: createdDeck._id },
    ];
    
    await Flashcard.insertMany(capitalFlashcards);
    console.log(`${capitalFlashcards.length} flashcards for '${createdDeck.title}' created successfully.`);
    
  } catch (error) {
    console.error(`Error during standard deck seeding: ${error.message}`);
  }
};

// @desc    Controller to trigger seeding via an API route
// @route   POST /api/decks/seed
// @access  Public
const seedStandardDecksRoute = async (req, res) => {
  await seedStandardDecks();
  res.status(200).send('Seeding process initiated. Check server logs for details.');
};


// @desc    Update a deck's metadata
// @route   PUT /api/decks/:id
// @access  Private
const updateDeck = async (req, res) => {
  const { title, description, tags } = req.body;

  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    if (deck.isStandard) {
      return res.status(403).json({ message: 'Pachetele publice sunt read-only' });
    }
    if (!deck.creator || deck.creator.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized to edit this deck' });
    }

    if (typeof title === 'string') {
      const trimmed = title.trim();
      if (!trimmed) return res.status(400).json({ message: 'Title cannot be empty.' });
      deck.title = trimmed;
    }
    if (typeof description === 'string') {
      deck.description = description.trim();
    }
    if (Array.isArray(tags)) {
      deck.tags = tags.map(t => String(t).trim()).filter(Boolean);
    }

    const updated = await deck.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDeck,
  getUserDecks,
  getStandardDecks,
  getDeckById,
  seedStandardDecks,
  seedStandardDecksRoute,
  searchDecks,
  updateDeck,
};
