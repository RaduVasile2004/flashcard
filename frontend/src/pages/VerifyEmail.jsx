import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './Login.module.css';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/auth/verify-email/${token}`
        );
        if (cancelled) return;
        localStorage.setItem('token', res.data.token);
        setStatus('success');
        setMessage('Email verified! Redirecting...');
        setTimeout(() => navigate('/'), 1200);
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(
          err.response?.data?.message || 'Verification failed. The link may be invalid or expired.'
        );
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <h2>Email verification</h2>
        <p>{message}</p>
        {status === 'error' && (
          <p className={styles.registerLink}>
            <Link to="/login">Back to login</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
