import { useState, useEffect } from 'react';

const LoadingScreen = ({ subject }) => {
  const messages = [
    "Connecting to AQA Science agents...",
    "Analyzing syllabus modules...",
    "Reviewing textbook chapters...",
    "Retrieving context from past papers...",
    "Tailoring data for your tier...",
    "Finalizing AI generation...",
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div className="premium-loader" style={{ marginBottom: '32px', width: '64px', height: '64px', borderWidth: '4px' }} />
      <h3 style={{ marginBottom: '12px', fontSize: '1.4rem' }}>
        <span className="text-gradient">Orchestrating {subject?.name || 'Science'} Materials</span>
      </h3>
      <div style={{ height: '24px', position: 'relative', width: '350px', textAlign: 'center' }}>
        <p 
          style={{ 
            color: 'hsl(var(--text-dim))', 
            position: 'absolute', 
            width: '100%', 
            animation: 'fadeInOut 2.5s infinite',
            fontSize: '1rem'
          }}
          key={messageIndex}
        >
          {messages[messageIndex]}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
