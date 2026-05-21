import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Papa from 'papaparse';
import ReactMarkdown from 'react-markdown';
import styles from './DeckDetails.module.css';

const DeckDetails = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState(null);
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDeckDetails = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const res = await axios.get(`http://localhost:5000/api/decks/${deckId}`, config);
      console.log('Date primite:', res.data); // Log for debugging
      setDeck(res.data);
    } catch (error) {
      console.error('Error fetching deck details:', error);
      navigate('/'); // Redirect if deck not found or other error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeckDetails();
  }, [deckId, navigate]);

  const handleAddCard = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!frontText || !backText) {
      setMessage('Both sides of the card must have content.');
      return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const body = { frontText, backText, deckId };
      await axios.post('http://localhost:5000/api/flashcards', body, config);
      
      setFrontText('');
      setBackText('');
      setMessage('Card added successfully!');
      setTimeout(() => setMessage(''), 3000);
      
      fetchDeckDetails(); // Re-fetch deck details
    } catch (error) {
      console.error('Error adding flashcard:', error);
      setMessage('Failed to add card. Please try again.');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const token = localStorage.getItem('token');
        const data = results.data;

        if (data.length === 0) {
          setMessage('CSV file is empty or invalid.');
          return;
        }

        const headers = results.meta.fields;
        const frontKey = headers.find(h => h.toLowerCase().trim().includes('front'));
        const backKey = headers.find(h => h.toLowerCase().trim().includes('back'));

        if (!frontKey || !backKey) {
          setMessage("CSV must have columns named 'front'/'frontText' and 'back'/'backText'.");
          event.target.value = null;
          return;
        }
        
        const formattedData = data
          .map(row => ({
            frontText: row[frontKey],
            backText: row[backKey],
          }))
          .filter(card => card.frontText && card.backText);

        if (formattedData.length === 0) {
          setMessage('No valid cards found in the CSV file.');
          event.target.value = null;
          return;
        }

        try {
          const config = {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          };
          
          await axios.post(`http://localhost:5000/api/flashcards/${deckId}/import`, { cards: formattedData }, config);

          alert('Import reușit!');
          setMessage('Cards imported successfully!');
          setTimeout(() => setMessage(''), 4000);
          
          fetchDeckDetails(); // Re-fetch deck details

        } catch (error) {
          console.error('Error importing CSV:', error);
          setMessage(error.response?.data?.message || 'Failed to import CSV. See console for details.');
        } finally {
          event.target.value = null;
        }
      },
      error: (err) => {
        console.error('Error parsing CSV:', err);
        setMessage('Failed to parse CSV file.');
        event.target.value = null;
      },
    });
  };
  
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!deck) {
    return <div>Deck not found.</div>;
  }

  return (
    <div className={styles.detailsContainer}>
      <h1 className={styles.deckTitle}>{deck.title}</h1>
      <p className={styles.deckDescription}>{deck.description}</p>

      <Link to={`/study/${deckId}`} className={styles.studyButton}>
        Începe Studiul
      </Link>

      {/* Only show the 'Add Card' form if the deck is not a standard, read-only deck */}
      {deck && !deck.isStandard && (
        <div className={styles.addCardSection}>
          <div className={styles.manualAdd}>
            <h2 className={styles.addCardTitle}>Add a New Card</h2>
            <form onSubmit={handleAddCard} className={styles.addCardForm}>
              <div className={styles.formGroup}>
                <label htmlFor="frontText">Front</label>
                <textarea
                  id="frontText"
                  value={frontText}
                  onChange={(e) => setFrontText(e.target.value)}
                  placeholder="e.g., What is the capital of Romania?"
                  rows="3"
                ></textarea>
                <small className={styles.markdownSupport}>Suportă Markdown: bold, italic, sau cod pentru programare.</small>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="backText">Back</label>
                <textarea
                  id="backText"
                  value={backText}
                  onChange={(e) => setBackText(e.target.value)}
                  placeholder="e.g., Bucharest"
                  rows="3"
                ></textarea>
                <small className={styles.markdownSupport}>Suportă Markdown: bold, italic, sau cod pentru programare.</small>
              </div>
              <button type="submit" className={styles.addButton}>
                Add Card
              </button>
            </form>
          </div>
          <div className={styles.csvImportSection}>
              <input 
                type='file' 
                accept='.csv' 
                style={{display: 'none'}} 
                id='csvInput' 
                onChange={handleFileUpload} 
              />
              <button 
                className={styles.importButton} 
                onClick={() => document.getElementById('csvInput').click()}
              >
                Importă CSV
              </button>
          </div>
          {message && <p className={styles.message}>{message}</p>}
        </div>
      )}

      <div className={styles.cardListContainer}>
        <h2 className={styles.cardListTitle}>Carduri în Pachet</h2>
        {deck?.flashcards?.length > 0 ? (
          <div className={styles.cardList}>
            {deck.flashcards.map((card) => (
              <div key={card._id} className={styles.cardItem}>
                <div className={styles.cardItemContent}>
                  <div className={styles.cardItemFront}>
                    <ReactMarkdown>{card.frontText}</ReactMarkdown>
                  </div>
                  <hr className={styles.cardItemSeparator} />
                  <div className={styles.cardItemBack}>
                    <ReactMarkdown>{card.backText}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Acest pachet nu are niciun card adăugat.</p>
        )}
      </div>
    </div>
  );
};

export default DeckDetails;
