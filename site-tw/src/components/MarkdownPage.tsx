import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';

interface MarkdownPageProps {
  path?: string;
}

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#818cf8',
    primaryTextColor: '#f1f5f9',
    primaryBorderColor: '#4f46e5',
    lineColor: '#64748b',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    background: '#0f172a',
    mainBkg: '#0f172a',
    textColor: '#f1f5f9',
    fontSize: '16px',
  },
});

export default function MarkdownPage({ path }: MarkdownPageProps) {
  const location = useLocation();
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if we need to redirect to add trailing slash for known directories
  useEffect(() => {
    if (!path) {
      const urlPath = location.pathname;
      const knownDirectories = ['sdlc', 'workshop', 'governance', 'owasp', 'maintainability', 'threat-modeling', 'agents'];
      const segments = urlPath.split('/');
      const lastSegment = segments[segments.length - 1];
      
      // If this is a known directory without trailing slash, redirect
      if (urlPath.startsWith('/docs/') && knownDirectories.includes(lastSegment) && !urlPath.endsWith('/')) {
        window.history.replaceState(null, '', urlPath + '/');
      }
    }
  }, [location.pathname, path]);

  // Determine the markdown file path
  const getMarkdownPath = () => {
    if (path) return path;

    // Convert URL path to markdown file path
    let urlPath = location.pathname;

    // Store whether it originally had a trailing slash (indicates directory)
    const hadTrailingSlash = urlPath.endsWith('/');

    // Remove trailing slash
    if (urlPath.endsWith('/') && urlPath !== '/') {
      urlPath = urlPath.slice(0, -1);
    }

    // Remove .html extension if present
    urlPath = urlPath.replace(/\.html$/, '');

    // If already has .md extension, return as-is (this fixes /docs/sdlc/index.md)
    if (urlPath.endsWith('.md')) {
      return urlPath;
    }

    // For root docs, try index
    if (urlPath === '/docs') {
      return '/docs/index.md';
    }

    // If path originally had trailing slash or is a known directory, try index.md
    if (urlPath.startsWith('/docs/')) {
      const knownDirectories = ['sdlc', 'workshop', 'governance', 'owasp', 'maintainability', 'threat-modeling', 'agents'];
      const segments = urlPath.split('/');
      const lastSegment = segments[segments.length - 1];

      // Check if it's a known directory or had a trailing slash
      if (hadTrailingSlash || knownDirectories.includes(lastSegment)) {
        return urlPath + '/index.md';
      }

      // Otherwise assume it's a file and append .md
      return urlPath + '.md';
    }

    return urlPath + '.md';
  };

  useEffect(() => {
    const loadMarkdown = async () => {
      setLoading(true);
      setError(null);

      try {
        const mdPath = getMarkdownPath();
        console.log('Loading markdown from:', mdPath);

        const response = await fetch(mdPath);

        if (!response.ok) {
          throw new Error(`Failed to load ${mdPath}: ${response.statusText}`);
        }

        const text = await response.text();
        setMarkdown(text);
      } catch (err) {
        console.error('Error loading markdown:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    loadMarkdown();
  }, [location.pathname, path]);

  // Render mermaid diagrams after markdown is rendered
  useEffect(() => {
    if (!loading && markdown) {
      const renderMermaid = async () => {
        try {
          // Find all mermaid code blocks
          const mermaidBlocks = document.querySelectorAll('.language-mermaid');

          for (let i = 0; i < mermaidBlocks.length; i++) {
            const block = mermaidBlocks[i] as HTMLElement;
            const code = block.textContent || '';

            // Create container for mermaid diagram
            const container = document.createElement('div');
            container.className = 'mermaid-diagram';

            try {
              const { svg } = await mermaid.render(`mermaid-${i}-${Date.now()}`, code);
              container.innerHTML = svg;

              // Replace code block with rendered diagram
              block.parentElement?.replaceWith(container);
            } catch (err) {
              console.error('Mermaid render error:', err);
              block.parentElement?.classList.add('mermaid-error');
            }
          }
        } catch (err) {
          console.error('Error processing mermaid diagrams:', err);
        }
      };

      // Delay to ensure DOM is ready
      setTimeout(renderMermaid, 100);
    }
  }, [markdown, loading]);

  // Add copy-to-clipboard functionality for prompt boxes
  useEffect(() => {
    if (!loading && markdown) {
      const addCopyButtons = () => {
        // Find all prompt boxes (divs with gradient background containing code blocks)
        const promptBoxes = document.querySelectorAll('div[style*="linear-gradient"]');

        promptBoxes.forEach((box) => {
          // Check if this box contains a code block with a prompt
          const codeBlock = box.querySelector('pre code');
          if (!codeBlock) return;

          // Check if copy button already exists
          if (box.querySelector('.copy-prompt-btn')) return;

          const promptText = codeBlock.textContent || '';

          // Find the header text that says "Copy this prompt..."
          const headerElements = box.querySelectorAll('strong');
          let headerElement: Element | null = null;

          headerElements.forEach((el) => {
            if (el.textContent?.includes('Copy this prompt')) {
              headerElement = el.parentElement;
            }
          });

          if (headerElement) {
            // Create copy button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-prompt-btn';
            copyBtn.innerHTML = '📋 Copy';
            copyBtn.style.cssText = `
              background: rgba(16, 185, 129, 0.2);
              border: 1px solid rgba(16, 185, 129, 0.5);
              color: #10b981;
              padding: 6px 12px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              margin-left: 12px;
              transition: all 0.2s;
              display: inline-block;
              vertical-align: middle;
            `;

            // Add hover effect
            copyBtn.onmouseenter = () => {
              copyBtn.style.background = 'rgba(16, 185, 129, 0.3)';
              copyBtn.style.borderColor = 'rgba(16, 185, 129, 0.7)';
            };
            copyBtn.onmouseleave = () => {
              copyBtn.style.background = 'rgba(16, 185, 129, 0.2)';
              copyBtn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            };

            // Add click handler
            copyBtn.onclick = async () => {
              try {
                await navigator.clipboard.writeText(promptText);

                // Show success feedback
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '✅ Copied!';
                copyBtn.style.color = '#22c55e';

                setTimeout(() => {
                  copyBtn.innerHTML = originalText;
                  copyBtn.style.color = '#10b981';
                }, 2000);
              } catch (err) {
                console.error('Failed to copy:', err);
                copyBtn.innerHTML = '❌ Failed';
                copyBtn.style.color = '#ef4444';

                setTimeout(() => {
                  copyBtn.innerHTML = '📋 Copy';
                  copyBtn.style.color = '#10b981';
                }, 2000);
              }
            };

            // Insert button after the header text
            headerElement.appendChild(copyBtn);
          }
        });
      };

      // Delay to ensure DOM is ready
      setTimeout(addCopyButtons, 150);
    }
  }, [markdown, loading]);

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center text-slate-400">
          <div className="animate-pulse">Loading...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-red-800 bg-red-950/20 p-8">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Document Not Found</h2>
          <p className="text-slate-300 mb-4">{error}</p>
          <a href="/" className="text-brand hover:text-indigo-400">← Back to Home</a>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <article className="prose prose-invert prose-slate max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            // Style code blocks
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const lang = match ? match[1] : '';

              if (inline) {
                return (
                  <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm" {...props}>
                    {children}
                  </code>
                );
              }

              return (
                <pre className={`bg-slate-900 rounded-lg p-4 overflow-x-auto ${className || ''}`}>
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              );
            },
            // Style links
            a({ node, children, href, ...props }) {
              const isExternal = href?.startsWith('http');
              return (
                <a
                  href={href}
                  className="text-brand hover:text-indigo-400 underline"
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  {...props}
                >
                  {children}
                </a>
              );
            },
            // Style tables
            table({ node, children, ...props }) {
              return (
                <div className="overflow-x-auto my-6">
                  <table className="min-w-full border border-slate-700 rounded-lg" {...props}>
                    {children}
                  </table>
                </div>
              );
            },
            thead({ node, children, ...props }) {
              return (
                <thead className="bg-slate-900" {...props}>
                  {children}
                </thead>
              );
            },
            th({ node, children, ...props }) {
              return (
                <th className="border border-slate-700 px-4 py-2 text-left font-semibold text-brand" {...props}>
                  {children}
                </th>
              );
            },
            td({ node, children, ...props }) {
              return (
                <td className="border border-slate-800 px-4 py-2 text-slate-300" {...props}>
                  {children}
                </td>
              );
            },
            // Style headings
            h1({ node, children, ...props }) {
              return (
                <h1 className="text-4xl font-bold mt-8 mb-4 text-white" {...props}>
                  {children}
                </h1>
              );
            },
            h2({ node, children, ...props }) {
              return (
                <h2 className="text-3xl font-bold mt-8 mb-4 text-white" {...props}>
                  {children}
                </h2>
              );
            },
            h3({ node, children, ...props }) {
              return (
                <h3 className="text-2xl font-bold mt-6 mb-3 text-white" {...props}>
                  {children}
                </h3>
              );
            },
            // Style blockquotes
            blockquote({ node, children, ...props }) {
              return (
                <blockquote className="border-l-4 border-brand pl-4 my-4 italic text-slate-400" {...props}>
                  {children}
                </blockquote>
              );
            },
            // Style lists
            ul({ node, children, ...props }) {
              return (
                <ul className="list-disc list-inside space-y-2 text-slate-300 my-4" {...props}>
                  {children}
                </ul>
              );
            },
            ol({ node, children, ...props }) {
              return (
                <ol className="list-decimal list-inside space-y-2 text-slate-300 my-4" {...props}>
                  {children}
                </ol>
              );
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </main>
  );
}
