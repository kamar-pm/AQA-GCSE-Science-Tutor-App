import React from 'react';

/**
 * SafeMarkdown — lightweight markdown renderer with no external dependencies.
 * Handles the most common patterns the AI backend returns:
 * bold, italic, headers, bullet lists, numbered lists, code blocks, and paragraphs.
 */
const SafeMarkdown = ({ children, style = {} }) => {
  if (!children || typeof children !== 'string') return null;

  const lines = children.split('\n');
  const elements = [];
  let listBuffer = [];
  let listType = null;
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    elements.push(
      <Tag key={key++} style={Tag === 'ul'
        ? { paddingLeft: '1.5rem', marginBottom: '1.25rem' }
        : { paddingLeft: '1.5rem', marginBottom: '1.25rem' }
      }>
        {listBuffer.map((item, i) => (
          <li key={i} style={{ marginBottom: '0.4rem' }}>
            <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
          </li>
        ))}
      </Tag>
    );
    listBuffer = [];
    listType = null;
  };

  const inlineFormat = (text) => {
    return text
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;color:hsl(262,83%,75%);font-size:0.9em">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:white;font-weight:700">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<strong style="color:white;font-weight:700">$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Heading 3
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={key++} style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.75rem', color: 'white' }}>
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(4)) }} />
        </h3>
      );
      continue;
    }

    // Heading 2
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={key++} style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.75rem', color: 'white' }}>
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(3)) }} />
        </h2>
      );
      continue;
    }

    // Heading 1
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={key++} style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.75rem', color: 'white' }}>
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(2)) }} />
        </h1>
      );
      continue;
    }

    // Unordered list
    if (line.match(/^[-*•] /)) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listBuffer.push(line.replace(/^[-*•] /, ''));
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listBuffer.push(line.replace(/^\d+\. /, ''));
      continue;
    }

    // Bold section header (e.g. "**Key Terms:**")
    // Regular paragraph text
    flushList();
    elements.push(
      <p key={key++} style={{ marginBottom: '1rem', lineHeight: 1.75, color: 'hsl(215, 20%, 72%)' }}>
        <span dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
      </p>
    );
  }

  flushList(); // flush any remaining list

  return (
    <div className="markdown-content" style={style}>
      {elements}
    </div>
  );
};

export default SafeMarkdown;
