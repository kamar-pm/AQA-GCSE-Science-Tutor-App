import { useState, useEffect } from 'react';
import SubjectGrid from './components/SubjectGrid';
import SessionConfig from './components/SessionConfig';
import ExamView from './components/ExamView';
import TutorView from './components/TutorView';
import ResultsView from './components/ResultsView';
import LoadingScreen from './components/LoadingScreen';

const API_URL = "http://localhost:8000/api";

function App() {
  const [subject, setSubject] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [topicInput, setTopicInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [availableChapters, setAvailableChapters] = useState([]);
  const [inputMode, setInputMode] = useState('select');
  const [isTimed, setIsTimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [visibleHints, setVisibleHints] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [userApiKey, setUserApiKey] = useState(localStorage.getItem('openai_api_key') || "");
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState('mock');
  const [tutorData, setTutorData] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const subjects = [
    { id: 'biology', name: 'Biology', icon: '🧬' },
    { id: 'chemistry', name: 'Chemistry', icon: '🧪' },
    { id: 'physics', name: 'Physics', icon: '⚡' },
  ];

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

  const resetSession = () => {
    setResults(null);
    setExam(null);
    setSubject(null);
    setSelectedTopics([]);
    setTopicInput("");
    setVisibleHints({});
    setTutorData(null);
    setAnswers({});
    setChatHistory([]);
  };

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
    setSyncStatus(`Searching for ${subject.name} materials...`);
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
      setSyncStatus("Sync service unavailable.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
        <div
          onClick={resetSession}
          style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'opacity 0.3s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <div style={{ width: '48px', height: '48px', background: 'hsl(var(--primary))', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px var(--primary-glow)', transform: 'rotate(-3deg)', flexShrink: 0 }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>A</span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.03em' }}>AQA Science Tutor</h1>
            <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
              GCSE Excellence Platform
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {subject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 18px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{subject.icon} {subject.name}</span>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'hsl(var(--text-muted))' }} />
              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-dim))', textTransform: 'capitalize' }}>{viewMode} Mode</span>
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="secondary"
              style={{ width: '42px', height: '42px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {showSettings ? '✕' : '⚙️'}
            </button>

            {showSettings && (
              <div className="premium-card fade-in" style={{ position: 'absolute', right: 0, top: '52px', zIndex: 50, width: '320px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'hsl(var(--text-muted))', marginBottom: '12px' }}>
                  System Configuration
                </p>
                <label>OpenAI API Key</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={userApiKey}
                  onChange={(e) => {
                    setUserApiKey(e.target.value);
                    localStorage.setItem('openai_api_key', e.target.value);
                  }}
                  style={{ fontSize: '0.85rem' }}
                />
                <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '8px', lineHeight: 1.5 }}>
                  Stored locally. If unset, the platform uses the server-level API key.
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        {!subject && (
          <SubjectGrid subjects={subjects} onSelect={handleSubjectSelect} />
        )}

        {subject && !exam && !loading && !tutorData && (
          <SessionConfig
            subject={subject}
            viewMode={viewMode}
            setViewMode={setViewMode}
            inputMode={inputMode}
            setInputMode={setInputMode}
            selectedTopics={selectedTopics}
            setSelectedTopics={setSelectedTopics}
            availableChapters={availableChapters}
            topicInput={topicInput}
            setTopicInput={setTopicInput}
            isTimed={isTimed}
            setIsTimed={setIsTimed}
            isSyncing={isSyncing}
            handleSync={handleSync}
            syncStatus={syncStatus}
            loading={loading}
            onGenerate={viewMode === 'mock' ? handleGenerateExam : handleStartTutoring}
            onBack={() => setSubject(null)}
          />
        )}

        {loading && (
          <LoadingScreen subject={subject} />
        )}

        {subject && tutorData && !loading && (
          <TutorView
            subject={subject}
            tutorData={tutorData}
            selectedTopics={selectedTopics.length > 0 ? selectedTopics : [topicInput]}
            chatHistory={chatHistory}
            chatInput={chatInput}
            setChatInput={setChatInput}
            handleChatSubmit={handleChatSubmit}
            chatLoading={chatLoading}
            onBack={() => { setTutorData(null); setChatHistory([]); }}
          />
        )}

        {exam && !results && !loading && (
          <ExamView
            exam={exam}
            isTimed={isTimed}
            timeLeft={timeLeft}
            answers={answers}
            handleAnswerChange={handleAnswerChange}
            visibleHints={visibleHints}
            setVisibleHints={setVisibleHints}
            onSubmit={handleSubmit}
            loading={loading}
          />
        )}

        {results && !loading && (
          <ResultsView results={results} onReset={resetSession} />
        )}
      </main>

      <footer style={{ marginTop: '80px', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'hsl(var(--text-muted))' }}>
          Developed for AQA GCSE Triple Science Syllabus
        </p>
        <div style={{ display: 'flex', gap: '24px', opacity: 0.3 }}>
          <span style={{ fontSize: '0.8rem' }}>Dashboard</span>
          <span style={{ fontSize: '0.8rem' }}>Resources</span>
          <span style={{ fontSize: '0.8rem' }}>Sync History</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
