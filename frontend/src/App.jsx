import { useState, useEffect } from 'react';

const API_URL = "http://localhost:8000/api";

function App() {
  const [subject, setSubject] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [topicInput, setTopicInput] = useState(""); // For manual typing mode
  const [loading, setLoading] = useState(false);
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [availableChapters, setAvailableChapters] = useState([]);
  const [inputMode, setInputMode] = useState('select'); // 'select' or 'text'
  const [isTimed, setIsTimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [visibleHints, setVisibleHints] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [userApiKey, setUserApiKey] = useState(localStorage.getItem('openai_api_key') || "");
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState('mock'); // 'mock' or 'tutor'
  const [tutorData, setTutorData] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const subjects = [
    { id: 'biology', name: 'Biology', icon: '🧬', class: 'bio' },
    { id: 'chemistry', name: 'Chemistry', icon: '🧪', class: 'chem' },
    { id: 'physics', name: 'Physics', icon: '⚡', class: 'phys' },
  ];

  // Fetch chapters when subject changes
  const fetchChapters = async (sub) => {
    try {
      const res = await fetch(`${API_URL}/chapters?subject=${sub.name}`);
      const data = await res.json();
      if (data.status === 'success') {
        setAvailableChapters(data.chapters);
      }
    } catch (e) {
      console.error("Failed to fetch chapters", e);
    }
  };

  const handleSubjectSelect = (s) => {
    setSubject(s);
    setSelectedTopics([]);
    setTopicInput("");
    setAvailableChapters([]);
    fetchChapters(s);
  };

  // Timer Countdown Logic
  useEffect(() => {
    let timer;
    if (exam && isTimed && timeLeft > 0 && !results) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && exam && isTimed && !results) {
      alert("Time is up! Your exam is being submitted automatically.");
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [exam, isTimed, timeLeft, results]);

  const handleGenerateExam = async () => {
    const topic = inputMode === 'select' ? selectedTopics.join(", ") : topicInput;
    if (!topic || topic.length === 0) return alert("Please select or enter at least one topic.");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_exam`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-OpenAI-API-Key": userApiKey
        },
        body: JSON.stringify({ subject: subject.name, topic, tier: "Higher" })
      });
      const data = await res.json();
      setExam(data.exam);
      if (isTimed) {
        setTimeLeft(data.exam.time_limit_seconds);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate exam. Is the backend running?");
    }
    setLoading(false);
  };

  const handleStartTutoring = async () => {
    const topic = inputMode === 'select' ? selectedTopics.join(", ") : topicInput;
    if (!topic || topic.length === 0) return alert("Please select or enter at least one topic.");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tutor_help`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-OpenAI-API-Key": userApiKey
        },
        body: JSON.stringify({ subject: subject.name, topic })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTutorData(data.content);
      } else {
        alert(data.message || "Failed to get tutoring help.");
      }
    } catch (e) {
      console.error(e);
      alert("Error connecting to server.");
    }
    setLoading(false);
  };

  const handleChatSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: "user", content: chatInput };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatInput("");
    setChatLoading(true);

    try {
      const topic = inputMode === 'select' ? selectedTopics.join(", ") : topicInput;
      const res = await fetch(`${API_URL}/tutor_chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-OpenAI-API-Key": userApiKey
        },
        body: JSON.stringify({ 
          message: chatInput, 
          history: newHistory,
          subject: subject.name,
          topic
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setChatHistory([...newHistory, { role: "assistant", content: data.response }]);
      }
    } catch (e) {
      console.error(e);
    }
    setChatLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/submit_exam`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-OpenAI-API-Key": userApiKey
        },
        body: JSON.stringify({ exam_id: exam.id, answers })
      });
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleAnswerChange = (qId, val) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const handleSync = async () => {
    if (!subject) return;
    setIsSyncing(true);
    setSyncStatus(`Agent searching for ${subject.name} papers...`);
    try {
      const resp = await fetch(`${API_URL}/sync_papers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          "X-OpenAI-API-Key": userApiKey
        },
        body: JSON.stringify({ subject: subject.name })
      });
      const data = await resp.json();
      setSyncStatus(data.message);
      setTimeout(() => setSyncStatus(""), 5000);
    } catch (err) {
      setSyncStatus("Failed to sync papers.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header fade-in">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', position: 'relative' }}>
          <div style={{ flex: 1 }}></div>
          <div style={{ flex: 2 }}>
            <h1>AQA Triple Science Tutor</h1>
            <p>Your personal AI examiner and tutor for GCSE</p>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
            >
              {showSettings ? '❌' : '⚙️'}
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="glass-card mt-4 fade-in" style={{ maxWidth: '400px', margin: '15px auto', padding: '15px', border: '1px solid var(--accent-primary)', textAlign: 'left' }}>
            <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Personal OpenAI API Key (Optional)</label>
            <input 
              type="password" 
              placeholder="sk-..." 
              value={userApiKey}
              onChange={(e) => {
                setUserApiKey(e.target.value);
                localStorage.setItem('openai_api_key', e.target.value);
              }}
              style={{ width: '100%', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '4px' }}
            />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Stored locally. If provided, used instead of server key.
            </p>
          </div>
        )}
      </header>

      {!subject && (
        <div className="grid fade-in">
          {subjects.map(s => (
            <div key={s.id} className={`glass-card subject-card ${s.class}`} onClick={() => handleSubjectSelect(s)}>
              <div className="subject-icon">{s.icon}</div>
              <h2>{s.name}</h2>
              <p className="mt-4" style={{ color: "var(--text-secondary)" }}>Select to begin mock exam</p>
            </div>
          ))}
        </div>
      )}

      {subject && !exam && !loading && !tutorData && (
        <div className="glass-card fade-in" style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2>Configure {subject.name} Session</h2>
          
          <div className="mt-6 glass-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '15px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '15px' }}>Select Mode</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={`toggle-btn ${viewMode === 'mock' ? 'active' : ''}`}
                onClick={() => setViewMode('mock')}
                style={{ flex: 1, padding: '10px' }}
              >
                📝 Mock Exam
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'tutor' ? 'active' : ''}`}
                onClick={() => setViewMode('tutor')}
                style={{ flex: 1, padding: '10px' }}
              >
                📖 Learn & Revise
              </button>
            </div>
          </div>

          <div className="mt-6" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button 
              className={`toggle-btn ${inputMode === 'select' ? 'active' : ''}`}
              onClick={() => setInputMode('select')}
              style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
            >
              Select Chapter
            </button>
            <button 
              className={`toggle-btn ${inputMode === 'text' ? 'active' : ''}`}
              onClick={() => setInputMode('text')}
              style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
            >
              Type Topic
            </button>
          </div>

          <div className="mt-4">
            <label>{inputMode === 'select' ? 'Select Chapters (Multiple Allowed)' : 'Topic / Chapter'}</label>
            {inputMode === 'select' ? (
              <div className="chapter-select-container mt-2">
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <button 
                    onClick={() => setSelectedTopics(availableChapters)}
                    style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', padding: '5px 10px', flex: 1 }}
                  >
                    Select All
                  </button>
                  <button 
                    onClick={() => setSelectedTopics([])}
                    style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', padding: '5px 10px', flex: 1 }}
                  >
                    Clear
                  </button>
                </div>
                <div className="checkbox-list">
                  {availableChapters.length > 0 ? (
                    availableChapters.map((c, i) => (
                      <label key={i} className={`checkbox-item ${selectedTopics.includes(c) ? 'selected' : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedTopics.includes(c)}
                          onChange={() => {
                            setSelectedTopics(prev => 
                              prev.includes(c) ? prev.filter(t => t !== c) : [...prev, c]
                            );
                          }}
                        />
                        {c}
                      </label>
                    ))
                  ) : (
                    <p>Loading chapters...</p>
                  )}
                </div>
              </div>
            ) : (
              <input 
                type="text" 
                placeholder="e.g. Quantitative Chemistry, Cell Biology..." 
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
              />
            )}
          </div>

          <div className="mt-6" style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isTimed}
                onChange={(e) => setIsTimed(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)' }}
              />
              <div>
                <span style={{ fontWeight: '600' }}>⏱️ Enable Strict Mode (Timed Exam)</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>You'll get 1 minute per mark. Exam auto-submits when time runs out.</p>
              </div>
            </label>
          </div>

          <div className="mt-6 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Want the latest AQA materials? My search agent can find them for you.
            </p>
            <button 
              onClick={handleSync} 
              disabled={isSyncing}
              className="toggle-btn"
              style={{ 
                background: 'rgba(139, 92, 246, 0.1)', 
                border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
                fontSize: '0.85rem',
                width: '100%',
                padding: '10px'
              }}
            >
              {isSyncing ? '🕵️ Searching & Downloading...' : '🔍 Sync Latest AQA Papers'}
            </button>
            {syncStatus && (
              <p className="fade-in" style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--accent-primary)', fontWeight: '500' }}>
                {syncStatus}
              </p>
            )}
          </div>

          <div className="mt-8 text-center" style={{ display: 'flex', gap: '15px' }}>
            <button 
              className="btn btn-primary" 
              onClick={viewMode === 'mock' ? handleGenerateExam : handleStartTutoring} 
              style={{ flex: 2, padding: '12px', fontSize: '1.1rem' }}
              disabled={loading}
            >
              {loading ? "Generating..." : viewMode === 'mock' ? "🚀 Generate Mock Exam" : "📖 Get Tutoring Support"}
            </button>
            <button 
              className="btn" 
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} 
              onClick={() => setSubject(null)}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {subject && tutorData && !loading && (
        <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'left' }}>
          <button className="btn mb-6" onClick={() => { setTutorData(null); setViewMode('mock'); }}>← Back to Topics</button>
          
          <div className="glass-card mb-8">
            <h2 style={{ color: 'var(--accent-primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              💡 Simple Explanation
            </h2>
            <div className="mt-4" style={{ lineHeight: '1.6', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
              {tutorData.explanation}
            </div>
          </div>

          <div className="glass-card mb-8">
            <h2 style={{ color: 'var(--accent-secondary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
              🌍 Real-World Examples
            </h2>
            <div className="mt-4" style={{ lineHeight: '1.6', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
              {tutorData.examples}
            </div>
          </div>

          <div className="glass-card" style={{ border: '1px solid var(--accent-primary)' }}>
            <h2 style={{ color: 'var(--accent-primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              📄 Revision Cheat Sheet
              <span style={{ fontSize: '0.8rem', background: 'var(--accent-primary)', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>Essential Knowledge</span>
            </h2>
            <div className="mt-4" style={{ lineHeight: '1.6', fontSize: '1rem', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px' }}>
              {tutorData.cheat_sheet}
            </div>
          </div>

          <div className="glass-card mt-8" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h2 style={{ color: 'var(--accent-secondary)', marginBottom: '15px' }}>📚 Top Recommended Resources</h2>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <a href="https://cognitoedu.org/" target="_blank" rel="noreferrer" className="btn" style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                🎥 Cognito Lessons
              </a>
              <a href={
                subject.id === 'biology' ? "https://www.bbc.co.uk/bitesize/examspecs/zpgcbk7" :
                subject.id === 'chemistry' ? "https://www.bbc.co.uk/bitesize/examspecs/z8xtmnb" :
                "https://www.bbc.co.uk/bitesize/examspecs/zsc9rj6"
              } target="_blank" rel="noreferrer" className="btn" style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                📖 BBC Bitesize AQA
              </a>
              <a href="https://senecalearning.com/" target="_blank" rel="noreferrer" className="btn" style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                🧠 Seneca Learning
              </a>
            </div>
          </div>

          <div className="glass-card mt-8" style={{ border: '1px solid var(--accent-secondary)' }}>
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              💬 Ask a Follow-up Question
            </h2>
            
            <div className="chat-history mb-4" style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '10px' }}>
              {chatHistory.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '20px 0' }}>Ask any specific question about this topic to dive deeper...</p>}
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ 
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                  color: 'white',
                  padding: '10px 15px',
                  borderRadius: '12px',
                  maxWidth: '80%',
                  lineHeight: '1.5',
                  fontSize: '0.95rem',
                  border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.1)' : 'none'
                }}>
                  {msg.content}
                </div>
              ))}
              {chatLoading && <div className="loader" style={{ alignSelf: 'flex-start', scale: '0.5' }}></div>}
            </div>

            <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Ask your follow-up question here..." 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{ flex: 1, padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
              />
              <button type="submit" className="btn btn-primary" disabled={chatLoading} style={{ padding: '0 25px' }}>Send</button>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center fade-in mt-4">
          <div className="loader"></div>
          <p className="mt-4">Please wait...</p>
        </div>
      )}

      {exam && !results && !loading && (
        <div className="glass-card fade-in">
          {isTimed && (
            <div className={`timer-banner ${timeLeft < 60 ? 'critical' : ''}`}>
              <span>Time Remaining: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>{exam.title}</h2>
            <span style={{ background: 'var(--accent-primary)', padding: '5px 10px', borderRadius: '20px', fontSize: '0.9rem' }}>{exam.tier} Tier</span>
          </div>
          
          <div className="questions">
            {exam.questions.map((q, i) => (
              <div key={q.id} className="mb-8" style={{ paddingBottom: '20px', borderBottom: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3>Q{i + 1}. {q.text}</h3>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '10px' }}>[{q.marks} marks]</p>
                      {q.reference && <p style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '10px' }}>Ref: {q.reference}</p>}
                    </div>
                  </div>
                  <button 
                    onClick={() => setVisibleHints(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                    style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', padding: '5px 10px', whiteSpace: 'nowrap' }}
                  >
                    {visibleHints[q.id] ? '📖 Hide Hint' : '💡 Get Hint'}
                  </button>
                </div>

                {visibleHints[q.id] && (
                  <div className="hint-box fade-in">
                    <strong>Hint:</strong> {q.hint}
                  </div>
                )}
                
                {q.type === 'multiple_choice' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {q.options.map((opt, idx) => (
                      <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name={q.id} 
                          value={opt} 
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea 
                    rows={q.type === 'extended_response' ? 6 : 3} 
                    placeholder="Type your answer here..."
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  ></textarea>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <button onClick={handleSubmit}>Submit Exam for Grading</button>
          </div>
        </div>
      )}

      {results && !loading && (
        <div className="glass-card fade-in">
          <div className="text-center">
            <h2>Exam Results</h2>
            <div className="mt-4 mb-4">
              <h1 style={{ fontSize: '4rem', color: 'var(--accent-primary)' }}>{results.total_marks} / {results.max_marks}</h1>
            </div>
            <p style={{ fontSize: '1.2rem', marginBottom: '30px', color: 'var(--text-primary)' }}>{results.overall_feedback}</p>
          </div>
          
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ marginBottom: '20px', borderBottom: '2px solid var(--accent-primary)', display: 'inline-block' }}>Detailed Breakdown</h3>
            
            <div className="result-list">
              {results.question_results.map((res, i) => (
                <div key={res.id} className="mb-6 glass-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h4 style={{ color: 'var(--accent-primary)' }}>Question {i + 1}</h4>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 'bold' }}>{res.marks_awarded} / {res.max_marks} Marks</p>
                      {res.reference && <p style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>Based on: {res.reference}</p>}
                    </div>
                  </div>
                  
                  <p style={{ marginBottom: '15px' }}><strong>Feedback:</strong> {res.feedback}</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
                      <p style={{ color: 'var(--accent-green)', marginBottom: '5px', fontWeight: '600' }}>Model Answer:</p>
                      <p>{res.correct_answer}</p>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
                      <p style={{ color: 'var(--accent-primary)', marginBottom: '5px', fontWeight: '600' }}>Mark Scheme:</p>
                      <p>{res.mark_scheme}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-8">
            <button onClick={() => { 
              setResults(null); 
              setExam(null); 
              setSubject(null); 
              setSelectedTopics([]); 
              setTopicInput(""); 
              setVisibleHints({});
            }}>Start New Session</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
