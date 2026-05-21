import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './Login.module.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNeedsVerification(false);
    setResendMessage('');
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
      });
      localStorage.setItem('token', response.data.token);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || 'Login failed');
      if (data?.needsVerification) {
        setNeedsVerification(true);
      }
    }
  };

  const handleResend = async () => {
    try {
      const res = await axios.post(
        'http://localhost:5000/api/auth/resend-verification',
        { email }
      );
      setResendMessage(res.data.message || 'If eligible, a new link was sent.');
    } catch (err) {
      setResendMessage(err.response?.data?.message || 'Failed to resend.');
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>Login</h2>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.inputGroup}>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className={styles.submitButton}>
          Login
        </button>
        <p className={styles.registerLink}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        {needsVerification && (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className={styles.submitButton}
              onClick={handleResend}
            >
              Resend verification email
            </button>
            {resendMessage && (
              <p style={{ marginTop: 8 }}>{resendMessage}</p>
            )}
          </div>
        )}
        <p className={styles.registerLink}>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
