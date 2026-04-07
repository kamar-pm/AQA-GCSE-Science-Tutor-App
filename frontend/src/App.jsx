import { useState } from 'react';

const API_URL = "http://localhost:8000/api";

function App() {
  const [subject, setSubject] = useState(null);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);

  const subjects = [
    { id: 'biology', name: 'Biology', icon: '🧬', class: 'bio' },
    { id: 'chemistry', name: 'Chemistry', icon: '🧪', class: 'chem' },
    { id: 'physics', name: 'Physics', icon: '⚡', class: 'phys' },
  ];

  const handleGenerateExam = async () => {
    if (!topic) return alert("Please enter a topic.");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/generate_exam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.name, topic, tier: "Higher" })
      });
      const data = await res.json();
      setExam(data.exam);
    } catch (e) {
      console.error(e);
      alert("Failed to generate exam. Is the backend running?");
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/submit_exam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="app-container">
      <header className="header fade-in">
        <h1>AQA Triple Science Tutor</h1>
        <p>Your personal AI examiner and tutor for GCSE</p>
      </header>

      {!subject && (
        <div className="grid fade-in">
          {subjects.map(s => (
            <div key={s.id} className={`glass-card subject-card ${s.class}`} onClick={() => setSubject(s)}>
              <div className="subject-icon">{s.icon}</div>
              <h2>{s.name}</h2>
              <p className="mt-4" style={{ color: "var(--text-secondary)" }}>Select to begin mock exam</p>
            </div>
          ))}
        </div>
      )}

      {subject && !exam && !loading && (
        <div className="glass-card fade-in" style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2>Configure {subject.name} Exam</h2>
          <div className="mt-4">
            <label>Topic / Chapter</label>
            <input 
              type="text" 
              placeholder="e.g. Quantitative Chemistry, Cell Biology..." 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="mt-4 text-center">
            <button onClick={handleGenerateExam}>Generate Mock Assessment</button>
            <button style={{ marginLeft: '10px', background: 'transparent', border: '1px solid var(--text-secondary)' }} onClick={() => setSubject(null)}>Back</button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>{exam.title}</h2>
            <span style={{ background: 'var(--accent-primary)', padding: '5px 10px', borderRadius: '20px', fontSize: '0.9rem' }}>{exam.tier} Tier</span>
          </div>
          
          <div className="questions">
            {exam.questions.map((q, i) => (
              <div key={q.id} className="mb-8" style={{ paddingBottom: '20px', borderBottom: '1px solid var(--card-border)' }}>
                <h3>Q{i + 1}. {q.text}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '10px' }}>[{q.marks} marks]</p>
                
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
        <div className="glass-card fade-in text-center">
          <h2>Exam Results</h2>
          <div className="mt-4 mb-4">
            <h1 style={{ fontSize: '4rem', color: 'var(--accent-primary)' }}>{results.total_marks} / {results.max_marks}</h1>
          </div>
          <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>{results.feedback}</p>
          
          <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px' }}>
            <h3>Question Breakdown</h3>
            <ul style={{ listStyleType: 'none', marginTop: '10px' }}>
              {Object.entries(results.marks_awarded).map(([qId, marks]) => (
                <li key={qId} style={{ padding: '8px 0', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Question {qId.replace('q', '')}</span>
                  <span style={{ fontWeight: 'bold' }}>{marks} marks gained</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <button onClick={() => { setResults(null); setExam(null); setSubject(null); setTopic(""); }}>Start New Session</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
