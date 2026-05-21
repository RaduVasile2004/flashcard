import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import DeckCard from '../components/DeckCard';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const [myDecks, setMyDecks] = useState([]);
  const [standardDecks, setStandardDecks] = useState([]);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  
  // Use state to track auth status, checked on component mount.
  const [isAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        // 1. Always fetch standard decks (this is a public route)
        const standardDecksRes = await axios.get('http://localhost:5000/api/decks/standard');
        setStandardDecks(Array.isArray(standardDecksRes.data) ? standardDecksRes.data : []);

        // 2. If the user is authenticated, fetch their private decks
        if (isAuthenticated) {
          const token = localStorage.getItem('token');
          const config = {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          };
          const myDecksRes = await axios.get('http://localhost:5000/api/decks/mine', config);
          setMyDecks(Array.isArray(myDecksRes.data) ? myDecksRes.data : []);
        } else {
          // Ensure 'My Decks' is empty for guest users
          setMyDecks([]);
        }
      } catch (error) {
        console.error('Error fetching decks:', error);
        // In case of error (e.g., API is down), reset both deck lists
        setMyDecks([]); 
        setStandardDecks([]);
      }
    };

    fetchDecks();
  }, [isAuthenticated]); // Re-fetch if auth status changes (though not expected in this component's lifecycle)

  const handleCreateDeck = async (e) => {
    e.preventDefault();
    if (!newDeckTitle) {
      alert('Please provide a title for the new deck.');
      return;
    }
    const token = localStorage.getItem('token');
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    const body = {
      title: newDeckTitle,
      description: newDeckDescription,
    };

    try {
      const response = await axios.post('http://localhost:5000/api/decks', body, config);
      setMyDecks(prevDecks => [...prevDecks, response.data]);
      setNewDeckTitle('');
      setNewDeckDescription('');
    } catch (error) {
      console.error('Error creating deck:', error);
      alert('Failed to create deck. Please try again.');
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      <h1 className={styles.title}>Dashboard</h1>

      {/* Conditionally render the create deck form only for authenticated users */}
      {isAuthenticated && (
        <section className={styles.createDeckSection}>
          <h2 className={styles.sectionTitle}>Create New Deck</h2>
          <form onSubmit={handleCreateDeck} className={styles.createDeckForm}>
            <div className={styles.formRow}>
              <input
                type="text"
                placeholder="New deck title"
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
                className={styles.formInput}
              />
              <input
                type="text"
                placeholder="Short description (optional)"
                value={newDeckDescription}
                onChange={(e) => setNewDeckDescription(e.target.value)}
                className={styles.formInput}
              />
            </div>
            <button type="submit" className={styles.createButton}>Create Deck</button>
          </form>
        </section>
      )}

      <section>
        <h2 className={styles.sectionTitle}>My Decks</h2>
        {isAuthenticated ? (
          myDecks.length > 0 ? (
            <div className={styles.decksGrid}>
              {myDecks.map((deck) => (
                <DeckCard key={deck._id} deck={deck} />
              ))}
            </div>
          ) : (
            <p>You haven't created any decks yet.</p>
          )
        ) : (
          <p className={styles.loginPrompt}>
            <Link to="/login">Trebuie să fii logat</Link> pentru a-ți crea propriile pachete.
          </p>
        )}
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Standard Decks</h2>
        {standardDecks.length > 0 ? (
          <div className={styles.decksGrid}>
            {standardDecks.map((deck) => (
              <DeckCard key={deck._id} deck={deck} />
            ))}
          </div>
        ) : (
          <p>No standard decks available at the moment.</p>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
