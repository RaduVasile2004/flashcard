import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Navbar.module.css';

const Navbar = ({ toggleTheme, theme }) => {
  const navigate = useNavigate();
  // Use a state to track authentication status to trigger re-renders
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // This effect will run when the component mounts and whenever the user navigates,
  // but we need a more reliable way to update it on login/logout.
  // For now, logout will handle its own state update.
  // A proper solution would involve a global state/context.
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    // Listen to storage changes from other tabs, for example
    window.addEventListener('storage', checkAuth);
    // Initial check
    checkAuth();
    return () => window.removeEventListener('storage', checkAuth);
  }, []);


  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.brand}>
        Intelligent Flashcards
      </Link>
      <div className={styles.navLinks}>
        <button onClick={toggleTheme} className={styles.themeToggle}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        {isAuthenticated ? (
          <>
            <Link to="/" className={styles.navLink}>Dashboard</Link>
            <Link to="/analytics" className={styles.navLink}>Statistici</Link>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.navLink}>Login</Link>
            <Link to="/register" className={styles.navLink}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
