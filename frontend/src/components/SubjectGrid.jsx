import React from 'react';

const SubjectGrid = ({ subjects, onSelect }) => {
  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h2 style={{ fontSize: '2.2rem', marginBottom: '16px', background: 'linear-gradient(135deg, #fff 0%, hsl(var(--text-dim)) 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Choose Your Subject
        </h2>
        <p style={{ color: 'hsl(var(--text-muted))' }}>
          Select a science discipline to begin your AQA GCSE practice session.
        </p>
      </div>

      <div className="grid">
        {subjects.map((s) => {
          const accentColor = s.id === 'biology'
            ? 'hsl(var(--accent-green))'
            : s.id === 'chemistry'
            ? 'hsl(var(--accent-pink))'
            : 'hsl(var(--secondary))';

          return (
            <div
              key={s.id}
              className="premium-card"
              onClick={() => onSelect(s)}
              style={{ textAlign: 'center', cursor: 'pointer', padding: '48px 32px' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = accentColor;
                e.currentTarget.style.boxShadow = `0 20px 40px rgba(0,0,0,0.3), 0 0 30px ${accentColor}22`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
            >
              <div style={{ fontSize: '3.5rem', marginBottom: '24px', display: 'block' }}>
                {s.icon}
              </div>
              <h3 style={{ fontSize: '1.7rem', marginBottom: '8px' }}>{s.name}</h3>
              <p style={{ color: 'hsl(var(--text-muted))', marginBottom: '24px', fontSize: '0.9rem' }}>
                GCSE Triple Science
              </p>
              <span style={{ fontSize: '0.85rem', color: accentColor, fontWeight: 600 }}>
                Start Session →
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubjectGrid;
