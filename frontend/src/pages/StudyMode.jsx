import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import styles from './StudyMode.module.css';

const formatDuration = (ms) => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const StudyMode = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();

  const [cardsToReview, setCardsToReview] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [sessionPosting, setSessionPosting] = useState(false);

  const sessionStartedAtRef = useRef(null);
  const cardStartedAtRef = useRef(null);
  const reviewsRef = useRef([]);
  const sessionPostedRef = useRef(false);

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
        if (Array.isArray(res.data) && res.data.length > 0) {
          const now = Date.now();
          sessionStartedAtRef.current = now;
          cardStartedAtRef.current = now;
        }
      } catch (error) {
        console.error('Error fetching cards for review:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCardsToReview();
  }, [deckId, navigate]);

  const postSession = async () => {
    if (sessionPostedRef.current) return;
    if (reviewsRef.current.length === 0) return;
    sessionPostedRef.current = true;
    setSessionPosting(true);

    const token = localStorage.getItem('token');
    const payload = {
      deckId,
      startedAt: new Date(sessionStartedAtRef.current).toISOString(),
      endedAt: new Date().toISOString(),
      reviews: reviewsRef.current,
    };

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post('http://localhost:5000/api/sessions', payload, config);
      setSessionSummary(res.data);
    } catch (error) {
      console.error('Error saving session:', error);
      // Fallback: build a local summary so the UI still works
      const reviews = reviewsRef.current;
      const correct = reviews.filter(r => r.grade >= 3).length;
      const avgGrade = reviews.reduce((a, r) => a + r.grade, 0) / reviews.length;
      setSessionSummary({
        totals: {
          count: reviews.length,
          correct,
          avgGrade: Number(avgGrade.toFixed(2)),
          durationMs: Date.now() - sessionStartedAtRef.current,
        },
        reviews,
        _local: true,
      });
    } finally {
      setSessionPosting(false);
    }
  };

  const handleReview = async (grade) => {
    const token = localStorage.getItem('token');
    const card = cardsToReview[currentIndex];
    const cardId = card._id;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const msSpent = cardStartedAtRef.current ? Date.now() - cardStartedAtRef.current : 0;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      await axios.post(`http://localhost:5000/api/flashcards/${cardId}/review`, { grade }, config);

      // Only record locally once the server has accepted the review,
      // so retries on failure don't double-count.
      reviewsRef.current.push({ cardId, grade, msSpent });

      const nextIndex = currentIndex + 1;
      setIsFlipped(false);
      setCurrentIndex(nextIndex);

      if (nextIndex >= cardsToReview.length) {
        await postSession();
      } else {
        cardStartedAtRef.current = Date.now();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
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

  if (cardsToReview.length === 0) {
    return (
      <div className={styles.completionContainer}>
        <h1 className={styles.completionTitle}>Felicitări!</h1>
        <p className={styles.completionText}>Nu ai carduri de revizuit acum.</p>
        <Link to="/" className={styles.dashboardButton}>
          Înapoi la Dashboard
        </Link>
      </div>
    );
  }

  if (currentIndex >= cardsToReview.length) {
    if (sessionPosting || !sessionSummary) {
      return <div className={styles.statusMessage}>Se salvează sesiunea...</div>;
    }

    const t = sessionSummary.totals || {};
    const accuracy = t.count ? Math.round((t.correct / t.count) * 100) : 0;
    const tally = { 0: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of sessionSummary.reviews || []) {
      if (tally[r.grade] !== undefined) tally[r.grade] += 1;
    }

    return (
      <div className={styles.completionContainer}>
        <h1 className={styles.completionTitle}>Sesiune încheiată!</h1>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue}>{t.count}</span>
            <span className={styles.summaryLabel}>Carduri</span>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue}>{accuracy}%</span>
            <span className={styles.summaryLabel}>Acuratețe</span>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue}>{t.avgGrade ?? 0}</span>
            <span className={styles.summaryLabel}>Notă medie</span>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue}>{formatDuration(t.durationMs || 0)}</span>
            <span className={styles.summaryLabel}>Durată</span>
          </div>
        </div>
        <div className={styles.tallyRow}>
          <span className={styles.tallyBadge} data-grade="0">Din nou: {tally[0]}</span>
          <span className={styles.tallyBadge} data-grade="3">Greu: {tally[3]}</span>
          <span className={styles.tallyBadge} data-grade="4">Bine: {tally[4]}</span>
          <span className={styles.tallyBadge} data-grade="5">Ușor: {tally[5]}</span>
        </div>
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
