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

// @desc    Get deck by ID
// @route   GET /api/decks/:id
// @access  Private
const getDeckById = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id).populate('flashcards');

    if (deck) {
      // Optional: Check if the user is authorized to see this deck
      // For now, we assume if they have the ID, they can see it,
      // but the route is protected, so they must be logged in.
      res.json(deck);
    } else {
      res.status(404).json({ message: 'Deck not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Seeds the database with standard decks. This is an idempotent operation.
 * It first deletes all existing standard decks and their flashcards, then creates new ones.
 * This function is designed to be callable from server startup.
 */
const seedStandardDecks = async () => {
  try {
    // Clean up old standard decks and their flashcards to ensure a fresh start
    const oldStandardDecks = await Deck.find({ isStandard: true });
    if (oldStandardDecks.length > 0) {
      const oldDeckIds = oldStandardDecks.map(d => d._id);
      await Flashcard.deleteMany({ deckId: { $in: oldDeckIds } });
      await Deck.deleteMany({ isStandard: true });
      console.log('Cleaned up old standard decks and their flashcards.');
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


module.exports = {
  createDeck,
  getUserDecks,
  getStandardDecks,
  getDeckById,
  seedStandardDecks,
  seedStandardDecksRoute,
};
