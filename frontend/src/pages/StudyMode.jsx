import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import styles from './StudyMode.module.css';

const StudyMode = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();

  const [cardsToReview, setCardsToReview] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCardsToReview = async () => {
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
        const res = await axios.get(`http://localhost:5000/api/flashcards/${deckId}/review`, config);
        setCardsToReview(res.data);
      } catch (error) {
        console.error('Error fetching cards for review:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCardsToReview();
  }, [deckId, navigate]);

  const handleReview = async (grade) => {
    const token = localStorage.getItem('token');
    const cardId = cardsToReview[currentIndex]._id;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      await axios.post(`http://localhost:5000/api/flashcards/${cardId}/review`, { grade }, config);

      // Move to the next card
      setIsFlipped(false);
      setCurrentIndex(currentIndex + 1);
    } catch (error) {
      console.error('Error submitting review:', error);
      // Optionally, show an error to the user
    }
  };

  const playAudio = (text, event) => {
    event.stopPropagation(); // Prevent the card from flipping
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      // You can set the language for better pronunciation
      // utterance.lang = 'ro-RO';
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Sorry, your browser does not support Text-to-Speech.');
    }
  };

  // Cleanup speech synthesis on component unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (loading) {
    return <div className={styles.statusMessage}>Loading cards...</div>;
  }

  if (cardsToReview.length === 0 || currentIndex >= cardsToReview.length) {
    return (
      <div className={styles.completionContainer}>
        <h1 className={styles.completionTitle}>Felicitări!</h1>
        <p className={styles.completionText}>Ai terminat toate cardurile pentru astăzi!</p>
        <Link to="/" className={styles.dashboardButton}>
          Înapoi la Dashboard
        </Link>
      </div>
    );
  }

  const currentCard = cardsToReview[currentIndex];

  return (
    <div className={styles.studyContainer}>
      <div className={`${styles.flashcard} ${isFlipped ? styles.isFlipped : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
        <div className={styles.cardContent}>
          <div className={styles.cardFront}>
            <div className={styles.textContainer}>
              <ReactMarkdown>{currentCard.frontText}</ReactMarkdown>
            </div>
            <button className={styles.audioButton} onClick={(e) => playAudio(currentCard.frontText, e)}>
              🔊
            </button>
          </div>
          <div className={styles.cardBack}>
            <div className={styles.textContainer}>
              <div className={styles.frontTextOnBack}><ReactMarkdown>{currentCard.frontText}</ReactMarkdown></div>
              <hr className={styles.separator} />
              <ReactMarkdown>{currentCard.backText}</ReactMarkdown>
            </div>
            <button className={styles.audioButton} onClick={(e) => playAudio(currentCard.backText, e)}>
              🔊
            </button>
          </div>
        </div>
      </div>

      {!isFlipped ? (
        <button onClick={() => setIsFlipped(true)} className={styles.revealButton}>
          Vezi Răspunsul
        </button>
      ) : (
        <div className={styles.gradeButtons}>
          <button onClick={() => handleReview(0)} className={`${styles.gradeButton} ${styles.grade0}`}>Din nou (0)</button>
          <button onClick={() => handleReview(3)} className={`${styles.gradeButton} ${styles.grade3}`}>Greu (3)</button>
          <button onClick={() => handleReview(4)} className={`${styles.gradeButton} ${styles.grade4}`}>Bine (4)</button>
          <button onClick={() => handleReview(5)} className={`${styles.gradeButton} ${styles.grade5}`}>Ușor (5)</button>
        </div>
      )}
    </div>
  );
};

export default StudyMode;
