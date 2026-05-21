import React from 'react';
import { Link } from 'react-router-dom';
import styles from './DeckCard.module.css';

/**
 * DeckCard component displays a summary of a deck.
 * It shows the deck's title and description, and provides a link to view the deck's details.
 *
 * @param {object} props - The component props.
 * @param {object} props.deck - The deck object to display.
 * @param {string} props.deck._id - The unique identifier for the deck.
 * @param {string} props.deck.title - The title of the deck.
 * @param {string} props.deck.description - The description of the deck.
 * @returns {JSX.Element} The rendered DeckCard component.
 */
const DeckCard = ({ deck }) => {
  return (
    <div className={styles.deckCard}>
      <h3 className={styles.deckTitle}>{deck.title}</h3>
      <p className={styles.deckDescription}>{deck.description}</p>
      <Link to={`/deck/${deck._id}`} className={styles.studyButton}>
        Study Now
      </Link>
    </div>
  );
};

export default DeckCard;
