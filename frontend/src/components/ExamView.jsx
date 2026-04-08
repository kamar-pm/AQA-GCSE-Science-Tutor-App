import React from 'react';

const ExamView = ({ 
  exam, 
  isTimed, 
  timeLeft, 
  answers, 
  handleAnswerChange, 
  visibleHints, 
  setVisibleHints, 
  onSubmit,
  loading 
}) => {
  const progressPct = (Object.keys(answers).length / exam.questions.length) * 100;

  return (
    <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>

      {/* Sticky Progress / Timer Bar */}
      <div className={`timer-banner${isTimed && timeLeft < 60 ? ' critical' : ''}`} style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--text-muted))' }}>
              Progress
            </span>
            <div style={{ width: '180px', height: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '999px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: 'hsl(var(--primary))', borderRadius: '999px', transition: 'width 0.4s' }} />
            </div>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-dim))' }}>
              {Object.keys(answers).length}/{exam.questions.length}
            </span>
          </div>

          {isTimed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '24px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--text-muted))' }}>Time</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'monospace' }}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="premium-card" style={{ marginBottom: '40px' }}>
        {/* Exam Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px', background: 'linear-gradient(135deg, #fff, hsl(var(--text-dim)))', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {exam.title}
            </h1>
            <p style={{ color: 'hsl(var(--text-dim))', fontSize: '0.9rem' }}>AQA GCSE Triple Science • {exam.tier} Tier</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))', padding: '6px 16px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid hsla(var(--primary), 0.2)' }}>
              {exam.questions.reduce((acc, q) => acc + q.marks, 0)} Total Marks
            </div>
          </div>
        </div>

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '56px' }}>
          {exam.questions.map((q, i) => (
            <div key={q.id} className="fade-in">
              {/* Question Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '10px' }}>
                    <span style={{ color: 'hsl(var(--primary))', fontFamily: 'monospace', marginRight: '12px' }}>Q{i + 1}.</span>
                    {q.text}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>
                      [{q.marks} marks]
                    </span>
                    {q.reference && (
                      <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'hsla(var(--primary), 0.6)' }}>
                        Ref: {q.reference}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setVisibleHints(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                  className="secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 14px', marginLeft: '16px', flexShrink: 0 }}
                >
                  {visibleHints[q.id] ? '🙈 Hide' : '💡 Hint'}
                </button>
              </div>

              {/* Hint Box */}
              {visibleHints[q.id] && (
                <div className="hint-box fade-in" style={{ marginBottom: '20px' }}>
                  <strong>Hint:</strong> {q.hint}
                </div>
              )}

              {/* Answer Area */}
              <div style={{ paddingLeft: '28px' }}>
                {q.type === 'multiple_choice' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    {q.options.map((opt, idx) => {
                      const selected = answers[q.id] === opt;
                      return (
                        <label
                          key={idx}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '14px',
                            padding: '16px', borderRadius: '12px', cursor: 'pointer',
                            background: selected ? 'hsla(var(--primary), 0.1)' : 'rgba(0,0,0,0.2)',
                            border: `1px solid ${selected ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.06)'}`,
                            transition: 'all 0.25s',
                            boxShadow: selected ? '0 4px 16px var(--primary-glow)' : 'none',
                          }}
                        >
                          <input type="radio" name={q.id} value={opt} onChange={(e) => handleAnswerChange(q.id, e.target.value)} style={{ display: 'none' }} />
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                            border: `2px solid ${selected ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.2)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {selected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'hsl(var(--primary))' }} />}
                          </div>
                          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    rows={q.type === 'extended_response' ? 8 : 4}
                    placeholder="Type your structured answer here..."
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    value={answers[q.id] || ''}
                    style={{ resize: 'vertical' }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <p style={{ color: 'hsl(var(--text-dim))', fontSize: '0.9rem', marginBottom: '24px' }}>
            Review your answers before submitting for grading.
          </p>
          <button
            onClick={onSubmit}
            disabled={loading || Object.keys(answers).length === 0}
            style={{ padding: '18px 56px', fontSize: '1.2rem' }}
          >
            {loading
              ? <div className="premium-loader" style={{ width: '24px', height: '24px', border: '2px solid', margin: 'auto' }} />
              : '📋 Submit Exam for Review'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamView;
