// backend/seedStandard.js
// Rulează din folderul backend:  node seedStandard.js
require('dotenv').config();
const mongoose = require('mongoose');
const Deck = require('./models/Deck');
const Flashcard = require('./models/Flashcard');

const NEW_DECKS = [
  {
    title: 'Capitalele Lumii',
    description: 'Capitale de pe toate continentele. Cât de bine cunoști harta lumii?',
    tags: ['geografie', 'capitale', 'lume'],
    cards: [
      ['Japonia', 'Tokyo'], ['Australia', 'Canberra'], ['Canada', 'Ottawa'],
      ['Brazilia', 'Brasília'], ['Egipt', 'Cairo'], ['India', 'New Delhi'],
      ['Argentina', 'Buenos Aires'], ['China', 'Beijing'],
    ],
  },
  {
    title: 'Elemente Chimice',
    description: 'Recunoaște elementul după simbolul său chimic.',
    tags: ['chimie', 'elemente', 'știință'],
    cards: [
      ['H', 'Hidrogen'], ['O', 'Oxigen'], ['Fe', 'Fier'], ['Au', 'Aur'],
      ['Ag', 'Argint'], ['Na', 'Sodiu'], ['K', 'Potasiu'], ['He', 'Heliu'],
    ],
  },
  {
    title: 'Verbe Neregulate în Engleză',
    description: 'Infinitiv → Past Simple / Past Participle.',
    tags: ['engleză', 'gramatică', 'verbe'],
    cards: [
      ['go', 'went / gone'], ['be', 'was-were / been'], ['eat', 'ate / eaten'],
      ['see', 'saw / seen'], ['write', 'wrote / written'], ['take', 'took / taken'],
      ['come', 'came / come'], ['speak', 'spoke / spoken'],
    ],
  },
  {
    title: 'Vocabular Spaniol de Bază',
    description: 'Cuvinte esențiale în spaniolă pentru începători.',
    tags: ['spaniolă', 'vocabular', 'limbi'],
    cards: [
      ['Hola', 'Bună'], ['Gracias', 'Mulțumesc'], ['Casa', 'Casă'],
      ['Perro', 'Câine'], ['Agua', 'Apă'], ['Amigo', 'Prieten'],
      ['Libro', 'Carte'], ['Comer', 'A mânca'],
    ],
  },
  {
    title: 'Termeni de Programare',
    description: 'Acronime și concepte esențiale din IT.',
    tags: ['informatică', 'programare', 'IT'],
    cards: [
      ['API', 'Application Programming Interface'],
      ['HTTP', 'HyperText Transfer Protocol'],
      ['SQL', 'Structured Query Language'],
      ['JSON', 'JavaScript Object Notation'],
      ['CSS', 'Cascading Style Sheets'],
      ['RAM', 'Random Access Memory'],
      ['CPU', 'Central Processing Unit'],
    ],
  },
];

async function dedupe() {
  const groups = await Deck.aggregate([
    { $match: { isStandard: true } },
    { $group: { _id: '$title', ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  let removedDecks = 0, removedCards = 0;
  for (const g of groups) {
    const ids = g.ids.slice().sort((a, b) => (a.toString() < b.toString() ? -1 : 1));
    const remove = ids.slice(1); // păstrează cel mai vechi
    const fc = await Flashcard.deleteMany({ deckId: { $in: remove } });
    const dk = await Deck.deleteMany({ _id: { $in: remove } });
    removedCards += fc.deletedCount;
    removedDecks += dk.deletedCount;
    console.log(`  Dedupe "${g._id}": șterse ${remove.length} duplicate.`);
  }
  console.log(`Dedupe total: ${removedDecks} pachete + ${removedCards} carduri orfane.`);
}

async function seed() {
  for (const d of NEW_DECKS) {
    const exists = await Deck.findOne({ isStandard: true, title: d.title });
    if (exists) {
      console.log(`  "${d.title}" există deja — sar peste.`);
      continue;
    }
    const deck = await Deck.create({
      title: d.title, description: d.description, tags: d.tags, isStandard: true,
    });
    const cards = d.cards.map(([frontText, backText]) => ({ frontText, backText, deckId: deck._id }));
    await Flashcard.insertMany(cards); // Mongoose aplică default-urile SM-2 automat
    console.log(`  "${d.title}" creat cu ${cards.length} carduri.`);
  }
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectat la MongoDB.\n');
    await dedupe();
    console.log('');
    await seed();
    console.log('\nGata. Reîncarcă Dashboard-ul în aplicație.');
  } catch (e) {
    console.error('Eroare:', e.message);
  } finally {
    await mongoose.disconnect();
  }
})();


