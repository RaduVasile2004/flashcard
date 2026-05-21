import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './Analytics.module.css';

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Trebuie să fii logat pentru a vedea statisticile.');
        setLoading(false);
        return;
      }

      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
        const [statsRes, sessionsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/flashcards/stats', config),
          axios.get('http://localhost:5000/api/sessions/recent?limit=10', config),
        ]);
        setStats(statsRes.data);
        setRecentSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
      } catch (err) {
        setError('Nu s-au putut încărca statisticile. Te rog, încearcă mai târziu.');
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const COLORS = {
    'Greu': '#FF6384',     // Red
    'Potrivit': '#FFCE56', // Yellow
    'Ușor': '#4BC0C0',     // Teal
  };

  if (loading) {
    return <div className={styles.container}><p>Se încarcă statisticile...</p></div>;
  }

  if (error) {
    return <div className={styles.container}><p className={styles.error}>{error}</p></div>;
  }

  if ((!stats || stats.totalStudied === 0) && recentSessions.length === 0) {
    return <div className={styles.container}><p>Nu ai încă statistici disponibile. Începe să studiezi!</p></div>;
  }

  const formatDuration = (ms) => {
    const s = Math.max(0, Math.round((ms || 0) / 1000));
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Statistici de Învățare</h1>
      
      {stats && stats.totalStudied > 0 && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h2 className={styles.statValue}>{stats.totalStudied}</h2>
              <p className={styles.statLabel}>Carduri Studiate</p>
            </div>
            <div className={styles.statCard}>
              <h2 className={styles.statValue}>{stats.upcomingReviews}</h2>
              <p className={styles.statLabel}>Revizuiri în 7 Zile</p>
            </div>
          </div>

          <div className={styles.chartContainer}>
            <h2 className={styles.chartTitle}>Distribuția Dificultății</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.difficultyDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    if (percent === 0) return null;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                    return (
                      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                >
                  {stats.difficultyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {recentSessions.length > 0 && (
        <div className={styles.chartContainer} style={{ marginTop: '2rem' }}>
          <h2 className={styles.chartTitle}>Sesiuni recente</h2>
          <ul className={styles.sessionList}>
            {recentSessions.map((s) => {
              const t = s.totals || {};
              const accuracy = t.count ? Math.round((t.correct / t.count) * 100) : 0;
              return (
                <li key={s._id} className={styles.sessionItem}>
                  <div className={styles.sessionMeta}>
                    <span className={styles.sessionDeck}>{s.deck?.title || 'Pachet șters'}</span>
                    <span className={styles.sessionDate}>
                      {new Date(s.endedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.sessionStats}>
                    <span>{t.count} carduri</span>
                    <span>{accuracy}% acuratețe</span>
                    <span>notă medie {t.avgGrade ?? 0}</span>
                    <span>{formatDuration(t.durationMs)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Analytics;
