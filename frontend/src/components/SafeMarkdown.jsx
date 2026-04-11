import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * SafeMarkdown — Uses react-markdown for rendering with SVG block handling.
 */
const SafeMarkdown = ({ children, style = {} }) => {
  if (!children || typeof children !== 'string') return null;

  // Unescape any JSON-escaped newlines from the backend
  const unescaped = children
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '');

  // Extract SVG blocks first (ReactMarkdown can't handle raw SVG tags well)
  const svgs = [];
  const PLACEHOLDER = '%%SVG_BLOCK%%';
  const svgRegex = /<svg[\s\S]*?<\/svg>/g;
  const cleanMarkdown = unescaped.replace(svgRegex, (match) => {
    svgs.push(match);
    return `\n\n${PLACEHOLDER}${svgs.length - 1}\n\n`;
  });

  // Split on our SVG placeholders
  const parts = cleanMarkdown.split(/\n\n%%SVG_BLOCK%%(\d+)\n\n/);

  return (
    <div className="markdown-content" style={style}>
      {parts.map((part, i) => {
        // Even indices are markdown text, odd indices are SVG indices
        if (i % 2 === 1) {
          const svgIndex = parseInt(part, 10);
          return (
            <div
              key={`svg-${i}`}
              style={{
                margin: '2rem 0',
                padding: '24px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                boxSizing: 'border-box',
              }}
              dangerouslySetInnerHTML={{ __html: svgs[svgIndex] }}
            />
          );
        }

        if (!part.trim()) return null;

        return (
          <ReactMarkdown key={`md-${i}`}>
            {part}
          </ReactMarkdown>
        );
      })}
    </div>
  );
};

export default SafeMarkdown;
