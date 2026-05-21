import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './Login.module.css';

const CheckEmail = () => {
  const location = useLocation();
  const email = location.state?.email || '';
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handleResend = async () => {
    if (!email) {
      setMessage('No email on file. Please register or login again.');
      return;
    }
    setBusy(true);
    try {
      const res = await axios.post(
        'http://localhost:5000/api/auth/resend-verification',
        { email }
      );
      setMessage(res.data.message || 'If eligible, a new link was sent.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to resend.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <h2>Check your email</h2>
        <p>
          We sent a verification link{email ? ` to ${email}` : ''}. Open it to
          activate your account. The link expires in 24 hours.
        </p>
        <button
          type="button"
          className={styles.submitButton}
          onClick={handleResend}
          disabled={busy}
          style={{ marginTop: 16 }}
        >
          {busy ? 'Sending...' : 'Resend email'}
        </button>
        {message && <p style={{ marginTop: 16 }}>{message}</p>}
        <p className={styles.registerLink}>
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default CheckEmail;
