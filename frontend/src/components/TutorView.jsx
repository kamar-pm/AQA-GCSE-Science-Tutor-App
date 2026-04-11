import React, { useState } from 'react';
import SafeMarkdown from './SafeMarkdown';

// ── Infographic data per subject/chapter keyword ─────────────────────────────
const INFOGRAPHICS = {
  // BIOLOGY
  'cell biology': {
    title: 'Cell Biology at a Glance',
    color: 'hsl(160, 84%, 39%)',
    stats: [
      { icon: '🔬', label: 'Microscope types', value: 'Light & Electron' },
      { icon: '📏', label: 'Cell size', value: '1–100 µm' },
      { icon: '🧫', label: 'Cell types', value: 'Prokaryotic · Eukaryotic' },
      { icon: '🔄', label: 'Division', value: 'Mitosis · Meiosis' },
    ],
    keyPoints: ['Nucleus contains DNA', 'Mitochondria = energy (ATP)', 'Cell membrane controls diffusion', 'Ribosomes make proteins'],
  },
  'organisation': {
    title: 'Biological Organisation',
    color: 'hsl(160, 84%, 39%)',
    stats: [
      { icon: '🫀', label: 'Heart chambers', value: '4' },
      { icon: '🩸', label: 'Blood vessels', value: 'Artery · Vein · Capillary' },
      { icon: '🌿', label: 'Leaf layers', value: 'Palisade · Spongy · Epidermis' },
      { icon: '⚗️', label: 'Enzyme pH', value: 'Amylase pH 7, Pepsin pH 2' },
    ],
    keyPoints: ['Enzymes are biological catalysts', 'Digestion breaks polymers → monomers', 'Double circulation in humans', 'Transpiration stream in plants'],
  },
  'infection': {
    title: 'Infection & Immunity',
    color: 'hsl(160, 84%, 39%)',
    stats: [
      { icon: '🦠', label: 'Pathogens', value: 'Bacteria · Virus · Fungi · Protozoa' },
      { icon: '💉', label: 'Vaccine type', value: 'Weakened / dead pathogen' },
      { icon: '🛡️', label: 'WBC types', value: 'Phagocytes & Lymphocytes' },
      { icon: '💊', label: 'Antibiotic target', value: 'Bacteria only (not viruses)' },
    ],
    keyPoints: ['Antigens trigger immune response', 'Antibodies are specific to antigens', 'Memory cells give long-term immunity', 'Herd immunity protects vulnerable'],
  },
  'bioenergetics': {
    title: 'Bioenergetics',
    color: 'hsl(160, 84%, 39%)',
    stats: [
      { icon: '☀️', label: 'Photosynthesis inputs', value: 'CO₂ + H₂O + light' },
      { icon: '🌿', label: 'Photosynthesis outputs', value: 'Glucose + O₂' },
      { icon: '⚡', label: 'Respiration output', value: 'ATP (energy currency)' },
      { icon: '🔬', label: 'Anaerobic in animals', value: 'Lactic acid produced' },
    ],
    keyPoints: ['Photosynthesis rate depends on light, CO₂, temperature', 'Aerobic respiration needs oxygen', 'Anaerobic = less ATP than aerobic', 'Fermentation → ethanol + CO₂ in yeast'],
  },
  // CHEMISTRY
  'atomic': {
    title: 'Atomic Structure',
    color: 'hsl(327, 73%, 53%)',
    stats: [
      { icon: '⚛️', label: 'Subatomic particles', value: 'Proton · Neutron · Electron' },
      { icon: '📊', label: 'Atomic number', value: '= number of protons' },
      { icon: '🔢', label: 'Mass number', value: 'Protons + Neutrons' },
      { icon: '☢️', label: 'Isotopes', value: 'Same Z, different mass' },
    ],
    keyPoints: ['Electrons occupy energy levels (shells)', 'Ionisation removes electrons', 'Rutherford → nuclear model of atom', 'Electronic config: 2, 8, 8...'],
  },
  'bonding': {
    title: 'Chemical Bonding',
    color: 'hsl(327, 73%, 53%)',
    stats: [
      { icon: '🔗', label: 'Ionic bonding', value: 'Metal + Non-metal electrons' },
      { icon: '🤝', label: 'Covalent bonding', value: 'Shared electrons' },
      { icon: '⚡', label: 'Metallic bonding', value: 'Delocalised electron sea' },
      { icon: '🌡️', label: 'Giant ionic MP', value: 'Very high (strong lattice)' },
    ],
    keyPoints: ['Ionic: high MP, conducts when molten', 'Simple covalent: low MP (weak IMF)', 'Giant covalent: diamond, graphite, SiO₂', 'Metals conduct due to free electrons'],
  },
  'quantitative': {
    title: 'Quantitative Chemistry',
    color: 'hsl(327, 73%, 53%)',
    stats: [
      { icon: '⚗️', label: 'Moles formula', value: 'n = mass ÷ Mr' },
      { icon: '📐', label: 'Avogadro number', value: '6.02 × 10²³' },
      { icon: '💧', label: 'Concentration', value: 'mol/dm³ = n ÷ V(dm³)' },
      { icon: '🧮', label: 'Atom economy', value: '(wanted Mr ÷ total Mr) × 100' },
    ],
    keyPoints: ['Balance equations before calculating moles', 'Limiting reagent determines yield', 'Atom economy: prefer high values', '%yield = (actual ÷ theoretical) × 100'],
  },
  // PHYSICS
  'energy': {
    title: 'Energy Stores & Transfers',
    color: 'hsl(199, 89%, 48%)',
    stats: [
      { icon: '⚡', label: 'Energy equation', value: 'E = P × t (Joules)' },
      { icon: '🌡️', label: 'Thermal formula', value: 'Q = mcΔT' },
      { icon: '🏋️', label: 'GPE formula', value: 'Ep = mgh' },
      { icon: '🔋', label: 'KE formula', value: 'Ek = ½mv²' },
    ],
    keyPoints: ['Energy is conserved (not created/destroyed)', 'Efficiency = useful out ÷ total in × 100', 'Sankey diagrams show energy transfers', 'Power = energy ÷ time (Watts)'],
  },
  'electric': {
    title: 'Electric Circuits',
    color: 'hsl(199, 89%, 48%)',
    stats: [
      { icon: '⚡', label: "Ohm's Law", value: 'V = I × R' },
      { icon: '🔋', label: 'Power', value: 'P = I²R or P = VI' },
      { icon: '🔌', label: 'Series R', value: 'R_total = R₁ + R₂' },
      { icon: '🔀', label: 'Parallel R', value: '1/R = 1/R₁ + 1/R₂' },
    ],
    keyPoints: ['Charge (C) = Current (A) × time (s)', 'Voltage measures energy per unit charge', 'Resistance increases with temperature (metallic)', 'LDR resistance decreases in light'],
  },
  'waves': {
    title: 'Wave Properties',
    color: 'hsl(199, 89%, 48%)',
    stats: [
      { icon: '〰️', label: 'Wave equation', value: 'v = f × λ' },
      { icon: '🔊', label: 'Sound speed', value: '~340 m/s in air' },
      { icon: '💡', label: 'Light speed', value: '3 × 10⁸ m/s' },
      { icon: '📡', label: 'EM Spectrum', value: 'Radio → Gamma rays' },
    ],
    keyPoints: ['Transverse: vibrations perpendicular to travel', 'Longitudinal: vibrations parallel to travel', 'Reflection: angle in = angle out', 'Refraction: bends towards normal (slower medium)'],
  },
  'radioactivity': {
    title: 'Radioactivity',
    color: 'hsl(199, 89%, 48%)',
    stats: [
      { icon: '🔴', label: 'Alpha (α)', value: 'He nucleus, stopped by paper' },
      { icon: '🟡', label: 'Beta (β)', value: 'fast electron, stopped by Al' },
      { icon: '🟢', label: 'Gamma (γ)', value: 'EM wave, stopped by lead/concrete' },
      { icon: '⏳', label: 'Half-life', value: 'Time for activity to halve' },
    ],
    keyPoints: ['Ionising radiation damages DNA', 'Background radiation is always present', 'Nuclear fission: heavy nucleus splits', 'Nuclear fusion: light nuclei combine'],
  },
};

const getInfographic = (subject, topics) => {
  const combined = (topics || []).join(' ').toLowerCase();
  const subjectId = subject?.id || '';

  // Try to find a matching infographic
  const keys = Object.keys(INFOGRAPHICS);
  const match = keys.find(k => combined.includes(k));
  if (match) return INFOGRAPHICS[match];

  // Fallback to first infographic matching subject
  const subjectDefaults = {
    biology: 'cell biology',
    chemistry: 'atomic',
    physics: 'energy',
  };
  return INFOGRAPHICS[subjectDefaults[subjectId]] || null;
};

// ── Quick-reference stat cards ───────────────────────────────────────────────
const InfoCard = ({ icon, label, value, color }) => (
  <div style={{
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }}>
    <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{icon}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--text-muted))', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'white', wordBreak: 'break-word' }}>{value}</div>
    </div>
  </div>
);

// ── Main TutorView ───────────────────────────────────────────────────────────
const TutorView = ({
  subject,
  tutorData,
  topic,
  selectedTopics = [],
  chatHistory,
  chatInput, setChatInput,
  handleChatSubmit,
  chatLoading,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState('explain');

  const accentColor = subject.id === 'biology'
    ? 'hsl(160, 84%, 39%)'
    : subject.id === 'chemistry'
    ? 'hsl(327, 73%, 53%)'
    : 'hsl(199, 89%, 48%)';

  const infographic = getInfographic(subject, selectedTopics);

  const tabs = [
    { id: 'explain', label: '💡 Explanation' },
    { id: 'examples', label: '🌍 Examples' },
    { id: 'cheatsheet', label: '📋 Cheat Sheet' },
    { id: 'papers', label: '📜 Exam Papers' },
  ];

  const tabContent = {
    explain: tutorData?.explanation,
    examples: tutorData?.examples,
    cheatsheet: tutorData?.cheat_sheet,
    papers: tutorData?.past_papers,
  };

  const tabStyle = (active) => ({
    padding: '9px 18px',
    fontSize: '0.85rem',
    fontWeight: 600,
    background: active ? accentColor : 'rgba(255,255,255,0.04)',
    border: `1px solid ${active ? accentColor : 'rgba(255,255,255,0.07)'}`,
    borderRadius: '8px',
    color: active ? 'white' : 'hsl(var(--text-muted))',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'var(--font-body)',
    boxShadow: active ? `0 4px 12px ${accentColor}44` : 'none',
  });

  return (
    <div className="fade-in" style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', maxWidth: '1260px', margin: '0 auto' }}>

      {/* ── LEFT: Main content ─────────────────────────────────────────── */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>

        <button className="secondary" onClick={onBack} style={{ alignSelf: 'flex-start', padding: '8px 18px', fontSize: '0.9rem' }}>
          ← Back
        </button>

        {/* Infographic panel */}
        {infographic && (
          <div className="premium-card" style={{ background: `${infographic.color}10`, border: `1px solid ${infographic.color}30`, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: infographic.color }}>{infographic.title}</h3>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', background: `${infographic.color}22`, color: infographic.color, padding: '3px 10px', borderRadius: '999px', border: `1px solid ${infographic.color}44` }}>
                Quick Reference
              </span>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
              {infographic.stats.map((s, i) => (
                <InfoCard key={i} {...s} color={infographic.color} />
              ))}
            </div>

            {/* Key points row */}
            <div style={{ paddingTop: '16px', borderTop: `1px solid ${infographic.color}20` }}>
              <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: infographic.color, marginBottom: '10px', fontWeight: 700 }}>
                Must Know
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {infographic.keyPoints.map((pt, i) => (
                  <span key={i} style={{
                    fontSize: '0.8rem', padding: '5px 12px',
                    background: `${infographic.color}15`,
                    border: `1px solid ${infographic.color}25`,
                    borderRadius: '999px',
                    color: 'hsl(var(--text-dim))',
                  }}>
                    {pt}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {tabs.map(t => (
            <button key={t.id} style={tabStyle(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div key={activeTab} className="premium-card fade-in" style={{ padding: '28px', minHeight: '300px' }}>
          {activeTab === 'papers' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>AQA Past Paper References</h4>
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                  The following question papers contain questions directly related to <strong>{topic}</strong>.
                </p>
              </div>
              
              {tabContent.papers && tabContent.papers.length > 0 ? (
                tabContent.papers.map((paper, idx) => (
                  <div key={idx} className="premium-card" style={{ 
                    padding: '20px', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ padding: '8px', background: `${accentColor}20`, borderRadius: '8px', color: accentColor }}>
                          📄
                        </div>
                        <div>
                          <h5 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{paper.title}</h5>
                          <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>AQA GCSE {subject.name} • {paper.year}</p>
                        </div>
                      </div>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em', 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        background: paper.tier?.toLowerCase().includes('higher') ? 'rgba(255,100,100,0.15)' : 'rgba(100,255,100,0.1)',
                        color: paper.tier?.toLowerCase().includes('higher') ? '#ff6b6b' : '#51cf66',
                        border: `1px solid ${paper.tier?.toLowerCase().includes('higher') ? '#ff6b6b33' : '#51cf6633'}`,
                        fontWeight: 700
                      }}>
                        {paper.tier}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.88rem', lineHeight: 1.5, color: 'hsl(var(--text-dim))', margin: 0 }}>
                      {paper.summary}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{ padding: '48px 0', textAlign: 'center', opacity: 0.5 }}>
                  <p style={{ fontSize: '0.9rem' }}>No specific past paper references found for this topic yet.</p>
                  <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Try syncing more papers to expand the library.</p>
                </div>
              )}
            </div>
          ) : (
            tabContent[activeTab]
              ? <SafeMarkdown>{tabContent[activeTab]}</SafeMarkdown>
              : <p style={{ color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>Loading...</p>
          )}
        </div>

        {/* External Resources */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { href: 'https://cognitoedu.org/', label: '🎥 Cognito', sub: 'Video lessons' },
            {
              href: subject.id === 'biology' ? 'https://www.bbc.co.uk/bitesize/examspecs/zpgcbk7'
                : subject.id === 'chemistry' ? 'https://www.bbc.co.uk/bitesize/examspecs/z8xtmnb'
                : 'https://www.bbc.co.uk/bitesize/examspecs/zsc9rj6',
              label: '📖 BBC Bitesize',
              sub: 'AQA Spec',
            },
            { href: 'https://senecalearning.com/', label: '🧠 Seneca', sub: 'Active recall' },
          ].map(({ href, label, sub }) => (
            <a key={href} href={href} target="_blank" rel="noreferrer"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white', textDecoration: 'none', transition: 'all 0.25s', gap: '4px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
            >
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</span>
              <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>{sub}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Chat Sidebar ────────────────────────────────────────── */}
      <div style={{ flex: '0 0 320px', position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
        <div className="premium-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', border: `1px solid ${accentColor}22`, maxHeight: 'calc(100vh - 100px)', overflow: 'hidden', padding: '20px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>AI Study Buddy</h3>
              <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>Ask anything about this topic</p>
            </div>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: accentColor, display: 'inline-block', boxShadow: `0 0 8px ${accentColor}` }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px', paddingRight: '2px' }}>
            {chatHistory.length === 0 && (
              <div style={{ padding: '32px 12px', textAlign: 'center', opacity: 0.35, fontSize: '0.85rem', fontStyle: 'italic' }}>
                Ask a follow-up question or request a simpler explanation.
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '88%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? accentColor : 'rgba(255,255,255,0.05)',
                  border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  fontSize: '0.87rem', lineHeight: 1.5,
                }}>
                  {msg.role === 'user'
                    ? <span style={{ color: 'white' }}>{msg?.content || ''}</span>
                    : <SafeMarkdown>{msg?.content || ''}</SafeMarkdown>
                  }
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '14px 14px 14px 4px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[0, 0.15, 0.3].map((d, i) => (
                    <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: accentColor, display: 'inline-block', animation: `pulse 1s ease ${d}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Ask a question..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', fontSize: '0.88rem', marginBottom: 0 }}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              style={{ width: '44px', height: '44px', padding: 0, flexShrink: 0, background: accentColor, border: 'none', boxShadow: `0 4px 12px ${accentColor}55` }}
            >
              →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TutorView;
