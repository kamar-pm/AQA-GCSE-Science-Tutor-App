import React from 'react';

const CHAPTER_ICONS = {
  // Biology
  'Cell biology': '🔬', 'Organisation': '🫀', 'Infection and response': '🦠',
  'Bioenergetics': '⚡', 'Homeostasis and response': '🧠', 'Inheritance': '🧬',
  'Ecology': '🌿', 'Evolution': '🦎',
  // Chemistry
  'Atomic structure': '⚛️', 'Periodic table': '📊', 'Bonding': '🔗',
  'Quantitative chemistry': '⚗️', 'Chemical changes': '🔥', 'Energy changes': '💡',
  'Rate': '⏩', 'Organic chemistry': '🧪', 'Chemical analysis': '🔍',
  'Atmosphere': '🌍', 'Resources': '♻️',
  // Physics
  'Energy': '⚡', 'Electric': '🔌', 'Electricity': '💡', 'Molecules': '⚛️',
  'Radioactivity': '☢️', 'Forces': '⚖️', 'Motion': '🏃', 'Waves': '〰️',
  'Electromagnetic': '📡', 'Light': '💡', 'Electromagnetism': '🧲', 'Space': '🌌',
};

const getChapterIcon = (chapter) => {
  const key = Object.keys(CHAPTER_ICONS).find(k => chapter.toLowerCase().includes(k.toLowerCase()));
  return key ? CHAPTER_ICONS[key] : '📚';
};

const SessionConfig = ({
  subject,
  viewMode, setViewMode,
  inputMode, setInputMode,
  selectedTopics, setSelectedTopics,
  availableChapters,
  topicInput, setTopicInput,
  isTimed, setIsTimed,
  isSyncing, handleSync, syncStatus,
  loading, onGenerate, onBack
}) => {
  const isMock = viewMode === 'mock';

  const subjectAccent = subject.id === 'biology'
    ? 'hsl(160, 84%, 39%)'
    : subject.id === 'chemistry'
    ? 'hsl(327, 73%, 53%)'
    : 'hsl(199, 89%, 48%)';

  const canGenerate = inputMode === 'select'
    ? selectedTopics.length > 0
    : topicInput.trim().length > 0;

  return (
    <div className="fade-in" style={{ maxWidth: '680px', margin: '0 auto' }}>

      {/* Subject Badge Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{subject.icon}</div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '6px' }}>{subject.name}</h2>
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>AQA GCSE Triple Science</p>
      </div>

      {/* Mode Toggle — large, prominent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
        {[
          { id: 'mock', label: 'Mock Exam', desc: 'Timed, marked practice', icon: '📝' },
          { id: 'tutor', label: 'Learn & Revise', desc: 'AI-guided exploration', icon: '📖' },
        ].map(m => {
          const active = viewMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setViewMode(m.id)}
              style={{
                padding: '18px 16px',
                background: active ? `${subjectAccent}22` : 'rgba(255,255,255,0.03)',
                border: `2px solid ${active ? subjectAccent : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '14px',
                color: active ? 'white' : 'hsl(var(--text-muted))',
                cursor: 'pointer',
                transition: 'all 0.25s',
                fontFamily: 'var(--font-heading)',
                textAlign: 'left',
                boxShadow: active ? `0 0 20px ${subjectAccent}30` : 'none',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{m.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{m.label}</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>{m.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Topic Selection Card */}
      <div className="premium-card" style={{ padding: '24px', marginBottom: '16px' }}>

        {/* Input method pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[
            { id: 'select', label: '📋 Browse Chapters' },
            { id: 'text',   label: '🔎 Search Topics' },
          ].map(m => {
            const active = inputMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setInputMode(m.id)}
                style={{
                  padding: '7px 16px', fontSize: '0.82rem', fontWeight: 600,
                  background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '999px', color: active ? 'white' : 'hsl(var(--text-muted))',
                  cursor: 'pointer', transition: 'all 0.2s',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {m.label}
              </button>
            );
          })}

          {selectedTopics.length > 0 && inputMode === 'select' && (
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: subjectAccent, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: subjectAccent, color: 'black', borderRadius: '999px', padding: '1px 8px', fontWeight: 700, fontSize: '0.75rem' }}>
                {selectedTopics.length}
              </span>
              selected
            </span>
          )}
        </div>

        {/* Chapter Grid or Text Input */}
        {inputMode === 'select' ? (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '12px' }}>
              <button
                onClick={() => setSelectedTopics(availableChapters)}
                style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'hsl(var(--text-dim))', borderRadius: '6px', cursor: 'pointer' }}
              >Select All</button>
              <button
                onClick={() => setSelectedTopics([])}
                style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'hsl(var(--text-dim))', borderRadius: '6px', cursor: 'pointer' }}
              >Clear</button>
            </div>

            {availableChapters.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                {availableChapters.map((c, i) => {
                  const selected = selectedTopics.includes(c);
                  const label = c.replace(/^Chapter [A-Z0-9]+ /i, '');
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedTopics(prev => prev.includes(c) ? prev.filter(t => t !== c) : [...prev, c])}
                      style={{
                        padding: '12px 14px',
                        background: selected ? `${subjectAccent}18` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${selected ? subjectAccent : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        userSelect: 'none',
                      }}
                      onMouseEnter={e => !selected && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                      onMouseLeave={e => !selected && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                    >
                      <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{getChapterIcon(c)}</span>
                      <span style={{ fontSize: '0.82rem', lineHeight: 1.3, color: selected ? 'white' : 'hsl(var(--text-dim))', fontWeight: selected ? 600 : 400 }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: 'hsl(var(--text-muted))', fontStyle: 'italic', fontSize: '0.9rem' }}>
                <div className="premium-loader" style={{ margin: '0 auto 12px', width: '24px', height: '24px', border: '2px solid' }} />
                Loading syllabus chapters...
              </div>
            )}
          </div>
        ) : (
          <div className="fade-in">
            <input
              type="text"
              placeholder={`e.g. ${subject.name === 'Biology' ? 'Osmosis, Cell division' : subject.name === 'Chemistry' ? 'Equilibrium, Titration' : 'Ohm\'s Law, Waves'}`}
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canGenerate && onGenerate()}
              style={{ marginBottom: 0, borderColor: topicInput ? subjectAccent : undefined }}
            />
            <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginTop: '8px' }}>
              Tip: You can enter multiple topics separated by commas.
            </p>
          </div>
        )}
      </div>

      {/* Timing Option — Mock Exam only */}
      {isMock && (
        <div className="fade-in" style={{ padding: '16px 20px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '1.4rem' }}>⏱️</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '2px' }}>Strict Timed Mode</p>
              <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>AQA-style (1 min per mark)</p>
            </div>
          </div>
          <div
            onClick={() => setIsTimed(!isTimed)}
            style={{ width: '52px', height: '28px', borderRadius: '999px', background: isTimed ? subjectAccent : 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', transition: 'background 0.3s', flexShrink: 0 }}
          >
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: isTimed ? '28px' : '4px', transition: 'left 0.3s' }} />
          </div>
        </div>
      )}

      {/* Sync Panel — Mock Exam only */}
      {isMock && (
        <div style={{ marginBottom: '24px', padding: '16px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>🤖</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '2px' }}>AI Paper Sync</p>
            <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
              {syncStatus || 'Fetch latest AQA past papers for your subject'}
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'hsl(var(--text-dim))', borderRadius: '8px', cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--font-body)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          >
            {isSyncing ? '🔍 Searching...' : '🔄 Sync Now'}
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onGenerate}
          disabled={loading || !canGenerate}
          style={{
            flex: 2, padding: '16px',
            fontSize: '1.05rem', fontWeight: 700,
            background: canGenerate ? subjectAccent : 'rgba(255,255,255,0.05)',
            border: 'none',
            boxShadow: canGenerate ? `0 8px 24px ${subjectAccent}55` : 'none',
            opacity: canGenerate ? 1 : 0.5,
            transition: 'all 0.3s',
          }}
        >
          {loading
            ? <div className="premium-loader" style={{ width: '20px', height: '20px', border: '2px solid', margin: 'auto' }} />
            : isMock ? '🚀 Generate Practice Exam' : '📖 Start Tutoring Session'
          }
        </button>
        <button onClick={onBack} className="secondary" style={{ flex: 1, padding: '16px' }}>
          ← Back
        </button>
      </div>
    </div>
  );
};

export default SessionConfig;
