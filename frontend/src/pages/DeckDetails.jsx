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

  // Inline-edit state
  const [editingCardId, setEditingCardId] = useState(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  const [editingDeck, setEditingDeck] = useState(false);
  const [deckTitleDraft, setDeckTitleDraft] = useState('');
  const [deckDescDraft, setDeckDescDraft] = useState('');

  // Per-card leech stats: { [cardId]: { lapses, isLeech } }
  const [cardStats, setCardStats] = useState({});
  const [leechThreshold, setLeechThreshold] = useState(4);
  const [leechCount, setLeechCount] = useState(0);

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

      // Fetch per-card stats (lapses / leech flags). Non-fatal on failure.
      try {
        const statsRes = await axios.get(
          `http://localhost:5000/api/flashcards/${deckId}/cards-stats`,
          config
        );
        const map = {};
        (statsRes.data?.cards || []).forEach((c) => {
          map[c._id] = { lapses: c.lapses, isLeech: c.isLeech };
        });
        setCardStats(map);
        setLeechThreshold(statsRes.data?.leechThreshold ?? 4);
        setLeechCount(statsRes.data?.totals?.leeches ?? 0);
      } catch (statsErr) {
        console.warn('Could not fetch card stats:', statsErr?.message);
      }
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

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Sigur vrei să ștergi acest card?')) return;

    const token = localStorage.getItem('token');
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`http://localhost:5000/api/flashcards/${cardId}`, config);

      setDeck((prev) => ({
        ...prev,
        flashcards: prev.flashcards.filter((c) => c._id !== cardId),
      }));
      setMessage('Card șters.');
      setTimeout(() => setMessage(''), 2500);
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      setMessage(error.response?.data?.message || 'Failed to delete card.');
    }
  };

  const startEditCard = (card) => {
    setEditingCardId(card._id);
    setEditFront(card.frontText);
    setEditBack(card.backText);
  };

  const cancelEditCard = () => {
    setEditingCardId(null);
    setEditFront('');
    setEditBack('');
  };

  const saveEditCard = async () => {
    if (!editFront.trim() || !editBack.trim()) {
      setMessage('Both sides must have content.');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.put(
        `http://localhost:5000/api/flashcards/${editingCardId}`,
        { frontText: editFront, backText: editBack },
        config
      );
      setDeck((prev) => ({
        ...prev,
        flashcards: prev.flashcards.map((c) =>
          c._id === editingCardId ? { ...c, frontText: res.data.frontText, backText: res.data.backText } : c
        ),
      }));
      cancelEditCard();
      setMessage('Card actualizat.');
      setTimeout(() => setMessage(''), 2500);
    } catch (error) {
      console.error('Error updating card:', error);
      setMessage(error.response?.data?.message || 'Failed to update card.');
    }
  };

  const startEditDeck = () => {
    setDeckTitleDraft(deck.title || '');
    setDeckDescDraft(deck.description || '');
    setEditingDeck(true);
  };

  const cancelEditDeck = () => {
    setEditingDeck(false);
  };

  const saveEditDeck = async () => {
    if (!deckTitleDraft.trim()) {
      setMessage('Titlul nu poate fi gol.');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.put(
        `http://localhost:5000/api/decks/${deckId}`,
        { title: deckTitleDraft, description: deckDescDraft },
        config
      );
      setDeck((prev) => ({ ...prev, title: res.data.title, description: res.data.description }));
      setEditingDeck(false);
      setMessage('Pachet actualizat.');
      setTimeout(() => setMessage(''), 2500);
    } catch (error) {
      console.error('Error updating deck:', error);
      setMessage(error.response?.data?.message || 'Failed to update deck.');
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
      {editingDeck ? (
        <div className={styles.deckEditBlock}>
          <input
            type="text"
            value={deckTitleDraft}
            onChange={(e) => setDeckTitleDraft(e.target.value)}
            className={styles.deckTitleInput}
            placeholder="Titlu pachet"
          />
          <textarea
            value={deckDescDraft}
            onChange={(e) => setDeckDescDraft(e.target.value)}
            className={styles.deckDescInput}
            placeholder="Descriere (opțional)"
            rows="2"
          />
          <div className={styles.editActions}>
            <button type="button" className={styles.saveButton} onClick={saveEditDeck}>Salvează</button>
            <button type="button" className={styles.cancelButton} onClick={cancelEditDeck}>Anulează</button>
          </div>
        </div>
      ) : (
        <>
          <h1 className={styles.deckTitle}>{deck.title}</h1>
          <p className={styles.deckDescription}>{deck.description}</p>
          {!deck.isStandard && (
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <button type="button" className={styles.editDeckButton} onClick={startEditDeck}>
                Editează pachet
              </button>
            </div>
          )}
        </>
      )}

      <Link to={`/study/${deckId}`} className={styles.studyButton}>
        Începe Studiul
      </Link>

      {leechCount > 0 && (
        <p className={styles.leechSummary}>
          ⚠️ {leechCount} {leechCount === 1 ? 'card-problemă' : 'carduri-problemă'} (≥ {leechThreshold} ratări) în acest pachet.
        </p>
      )}

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
              </div>
              <button type="submit" className={styles.addButton}>Add Card</button>
            </form>
          </div>
          <div className={styles.csvImportSection}>
            <input
              type="file"
              id="csvInput"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              type="button"
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
            {deck.flashcards.map((card) => {
              const stats = cardStats[card._id] || { lapses: 0, isLeech: false };
              const isEditing = editingCardId === card._id;
              return (
                <div key={card._id} className={styles.cardItem}>
                  {isEditing ? (
                    <div className={styles.cardEditBlock}>
                      <textarea
                        value={editFront}
                        onChange={(e) => setEditFront(e.target.value)}
                        rows="3"
                        placeholder="Front"
                      />
                      <textarea
                        value={editBack}
                        onChange={(e) => setEditBack(e.target.value)}
                        rows="3"
                        placeholder="Back"
                      />
                      <div className={styles.editActions}>
                        <button type="button" className={styles.saveButton} onClick={saveEditCard}>Salvează</button>
                        <button type="button" className={styles.cancelButton} onClick={cancelEditCard}>Anulează</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.cardItemContent}>
                        <div className={styles.cardItemFront}>
                          <ReactMarkdown>{card.frontText}</ReactMarkdown>
                        </div>
                        <hr className={styles.cardItemSeparator} />
                        <div className={styles.cardItemBack}>
                          <ReactMarkdown>{card.backText}</ReactMarkdown>
                        </div>
                      </div>
                      <div className={styles.cardBadges}>
                        {stats.isLeech && (
                          <span className={styles.leechBadge} title={`Ratat de ${stats.lapses} ori`}>
                            🐛 Leech
                          </span>
                        )}
                        {!stats.isLeech && stats.lapses > 0 && (
                          <span className={styles.lapseBadge} title="Ratări la review">
                            ✗ {stats.lapses}
                          </span>
                        )}
                      </div>
                      {!deck.isStandard && (
                        <div className={styles.cardActions}>
                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => startEditCard(card)}
                            aria-label="Editează card"
                          >
                            Editează
                          </button>
                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => handleDeleteCard(card._id)}
                            aria-label="Șterge card"
                          >
                            Șterge
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p>Acest pachet nu are niciun card adăugat.</p>
        )}
      </div>
    </div>
  );
};

export default DeckDetails;
