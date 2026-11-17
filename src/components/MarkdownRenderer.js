"use client";

/**
 * Lightweight markdown renderer for clinical responses
 * Supports:
 * - **bold** → <strong>
 * - ## Headings → <h3>
 * - - Bullet points → <li>
 * - Line breaks
 * - Code blocks (with backticks)
 */

export function MarkdownRenderer({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeContent = [];
  let inList = false;
  let listItems = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Handle code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        if (codeContent.length > 0) {
          elements.push(
            <pre key={`code-${i}`} style={{ background: 'var(--text-primary)', color: 'white', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-lg)', overflowX: 'auto', margin: 'var(--spacing-md) 0', fontSize: '0.8em' }}>
              <code>{codeContent.join('\n')}</code>
            </pre>
          );
          codeContent = [];
        }
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Handle headings (##, ###, etc.)
    if (trimmed.match(/^#+\s/)) {
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`list-${i}`} style={{ listStyleType: 'disc', listStylePosition: 'inside', margin: 'var(--spacing-md) 0', color: 'var(--text-primary)' }}>
            {listItems.map((item, idx) => (
              <li key={idx} style={{ fontSize: '0.875rem' }}>{renderInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }

      const level = trimmed.match(/^#+/)[0].length;
      const text = trimmed.replace(/^#+\s/, '');
      const headingStyle = level === 2 
        ? { fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)', marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }
        : { fontSize: '1rem', fontWeight: 600, color: 'var(--primary)', marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' };
      
      elements.push(
        <div key={`heading-${i}`} style={headingStyle}>{renderInlineMarkdown(text)}</div>
      );
      continue;
    }

    // Handle bullet points
    if (trimmed.startsWith('-') && trimmed.length > 2) {
      if (!inList) {
        inList = true;
      }
      const itemText = trimmed.replace(/^-\s*/, '');
      listItems.push(itemText);
      continue;
    }

    // End list if we encounter non-list content
    if (inList && trimmed && !trimmed.startsWith('-')) {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${i}`} style={{ listStyleType: 'disc', listStylePosition: 'inside', margin: 'var(--spacing-md) 0', color: 'var(--text-primary)' }}>
            {listItems.map((item, idx) => (
              <li key={idx} style={{ fontSize: '0.875rem' }}>{renderInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    }

    // Handle paragraphs
    if (trimmed) {
      elements.push(
        <p key={`para-${i}`} style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: 'var(--spacing-md) 0', wordBreak: 'break-word' }}>
          {renderInlineMarkdown(trimmed)}
        </p>
      );
    }
  }

  // Flush remaining list
  if (inList && listItems.length > 0) {
    elements.push(
      <ul key={`list-final`} style={{ listStyleType: 'disc', listStylePosition: 'inside', margin: 'var(--spacing-md) 0', color: 'var(--text-primary)' }}>
        {listItems.map((item, idx) => (
          <li key={idx} style={{ fontSize: '0.875rem' }}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>
    );
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>{elements}</div>;
}

/**
 * Render inline markdown (bold, code snippets, etc.)
 */
function renderInlineMarkdown(text) {
  const parts = [];
  let current = text;
  let key = 0;

  while (current) {
    // Find **bold**
    const boldMatch = current.match(/\*\*([^*]+?)\*\*/);
    if (boldMatch) {
      const beforeBold = current.substring(0, boldMatch.index);
      if (beforeBold) parts.push(<span key={key++}>{beforeBold}</span>);
      parts.push(<strong key={key++} style={{ fontWeight: 600, color: 'var(--primary)' }}>{boldMatch[1]}</strong>);
      current = current.substring(boldMatch.index + boldMatch[0].length);
    } else {
      // Find `code`
      const codeMatch = current.match(/`([^`]+?)`/);
      if (codeMatch) {
        const beforeCode = current.substring(0, codeMatch.index);
        if (beforeCode) parts.push(<span key={key++}>{beforeCode}</span>);
        parts.push(
          <code key={key++} style={{ background: 'var(--background-secondary)', padding: 'var(--spacing-xs) var(--spacing-sm)', borderRadius: 'var(--radius-md)', fontSize: '0.8em', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {codeMatch[1]}
          </code>
        );
        current = current.substring(codeMatch.index + codeMatch[0].length);
      } else {
        parts.push(<span key={key++}>{current}</span>);
        current = '';
      }
    }
  }

  return parts;
}
