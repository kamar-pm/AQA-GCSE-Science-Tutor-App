import React from 'react';

const ResultsView = ({ results, onReset }) => {
  const scorePercentage = (results.total_marks / results.max_marks) * 100;
  const circumference = 2 * Math.PI * 88; // r=88

  const getScoreColor = () => {
    if (scorePercentage >= 70) return 'hsl(var(--accent-green))';
    if (scorePercentage >= 40) return 'hsl(var(--primary))';
    return 'hsl(0, 84%, 60%)';
  };

  const getScoreEmoji = () => {
    if (scorePercentage >= 70) return '🎉 Outstanding Work!';
    if (scorePercentage >= 40) return '📚 Solid Progress';
    return '📖 More Practice Needed';
  };

  return (
    <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 0' }}>

      {/* Score Summary Card */}
      <div className="premium-card" style={{ textAlign: 'center', marginBottom: '48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'hsla(var(--primary), 0.03)', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '32px', background: 'linear-gradient(135deg, #fff, hsl(var(--text-dim)))', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Practice Exam Results
          </h2>

          {/* Circular Score Chart */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ position: 'relative', width: '192px', height: '192px' }}>
              <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="96" cy="96" r="88" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                <circle
                  cx="96" cy="96" r="88"
                  stroke={getScoreColor()}
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * scorePercentage) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontSize: '3rem', fontWeight: 700, color: getScoreColor() }}>{results.total_marks}</span>
                <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '8px' }}>
                  of {results.max_marks}
                </span>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '500px', margin: '0 auto', padding: '0 24px' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '16px' }}>{getScoreEmoji()}</p>
            <p style={{ color: 'hsl(var(--text-dim))', lineHeight: 1.7, marginBottom: '32px' }}>{results.overall_feedback}</p>
            <button onClick={onReset} style={{ padding: '14px 40px', fontSize: '1rem' }}>
              Start New Practice Session
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div style={{ textAlign: 'left' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'hsla(var(--primary), 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary))', fontFamily: 'monospace', fontSize: '0.85rem', fontStyle: 'italic' }}>i</span>
          Detailed Question Breakdown
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {results.question_results.map((res, i) => {
            const isFullMark = res.marks_awarded === res.max_marks;
            const isPartial = res.marks_awarded > 0 && !isFullMark;
            const markColor = isFullMark ? 'hsl(var(--accent-green))' : isPartial ? 'hsl(var(--primary))' : 'hsl(0, 84%, 60%)';
            const markBg = isFullMark ? 'hsla(var(--accent-green), 0.1)' : isPartial ? 'hsla(var(--primary), 0.1)' : 'hsla(0, 84%, 60%, 0.1)';

            return (
              <div key={res.id || i} className="premium-card" style={{ background: 'rgba(255,255,255,0.01)' }}>
                {/* Question header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'hsl(var(--text-muted))', fontFamily: 'monospace', fontSize: '0.85rem' }}>Q{i + 1}</span>
                    {isFullMark ? '✅' : isPartial ? '⚠️' : '❌'}
                  </h4>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ padding: '6px 16px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700, border: `1px solid ${markColor}33`, background: markBg, color: markColor }}>
                      {res.marks_awarded} / {res.max_marks} Marks
                    </div>
                    {res.reference && (
                      <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--text-muted))', marginTop: '8px' }}>
                        Source: {res.reference}
                      </p>
                    )}
                  </div>
                </div>

                {/* Feedback */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--text-muted))', fontWeight: 700, marginBottom: '8px' }}>Examiner Feedback</p>
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{res.feedback}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'hsla(var(--accent-green), 0.05)', border: '1px solid hsla(var(--accent-green), 0.1)' }}>
                      <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--accent-green))', fontWeight: 700, marginBottom: '8px' }}>Model Answer</p>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'hsl(var(--text-dim))', fontStyle: 'italic' }}>{res.correct_answer}</p>
                    </div>
                    <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'hsla(var(--primary), 0.05)', border: '1px solid hsla(var(--primary), 0.1)' }}>
                      <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--primary))', fontWeight: 700, marginBottom: '8px' }}>AQA Mark Scheme</p>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'hsl(var(--text-dim))' }}>{res.mark_scheme}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: '48px', textAlign: 'center' }}>
        <button className="secondary" onClick={onReset} style={{ padding: '14px 40px' }}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ResultsView;
