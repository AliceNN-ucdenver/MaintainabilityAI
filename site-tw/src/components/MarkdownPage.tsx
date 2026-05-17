import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { markdownPathForRoute } from '../lib/docsRouting';
import PageLoading from './PageLoading';

interface MarkdownPageProps {
  path?: string;
}

export default function MarkdownPage({ path }: MarkdownPageProps) {
  const location = useLocation();
  const markdownPath = useMemo(
    () => markdownPathForRoute(path, location.pathname),
    [location.pathname, path]
  );
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMarkdown = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(markdownPath);

        if (!response.ok) {
          throw new Error(`Failed to load ${markdownPath}: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        setMarkdown(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    loadMarkdown();
  }, [markdownPath]);

  useEffect(() => {
    if (!loading && markdown && location.hash) {
      const timeoutId = setTimeout(() => {
        const id = location.hash.slice(1);
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [markdown, loading, location.hash]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const resetTimeouts: ReturnType<typeof setTimeout>[] = [];

    if (!loading && markdown) {
      const addCopyButtons = () => {
        if (!isMounted) return;

        const promptBoxes = document.querySelectorAll<HTMLElement>('.prose div, .prose details');

        promptBoxes.forEach((box) => {
          const codeBlock = box.querySelector('pre code');
          if (!codeBlock) return;

          if (box.querySelector('.copy-prompt-btn')) return;

          const promptText = codeBlock.textContent || '';

          const headerElements = box.querySelectorAll('strong');
          let headerElement: Element | null = null;

          headerElements.forEach((el) => {
            if (el.textContent?.includes('Copy this prompt')) {
              headerElement = el.parentElement;
            }
          });

          if (headerElement && document.contains(headerElement)) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-prompt-btn';
            copyBtn.innerHTML = '📋 Copy';

            copyBtn.onclick = async () => {
              try {
                await navigator.clipboard.writeText(promptText);

                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '✅ Copied!';
                copyBtn.classList.add('is-success');

                const resetTimeout = setTimeout(() => {
                  if (isMounted && document.contains(copyBtn)) {
                    copyBtn.innerHTML = originalText;
                    copyBtn.classList.remove('is-success');
                  }
                }, 2000);
                resetTimeouts.push(resetTimeout);
              } catch (err) {
                console.error('Failed to copy:', err);
                copyBtn.innerHTML = '❌ Failed';
                copyBtn.classList.add('is-error');

                const resetTimeout = setTimeout(() => {
                  if (isMounted && document.contains(copyBtn)) {
                    copyBtn.innerHTML = '📋 Copy';
                    copyBtn.classList.remove('is-error');
                  }
                }, 2000);
                resetTimeouts.push(resetTimeout);
              }
            };

            headerElement.appendChild(copyBtn);
          }
        });
      };

      timeoutId = setTimeout(addCopyButtons, 150);
    }

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      resetTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [markdown, loading]);

  if (loading) {
    return <PageLoading label="Loading document..." />;
  }

  if (error) {
    return (
      <main className="site-shell py-12">
        <div className="site-error-card">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Document Not Found</h2>
          <p className="text-slate-300 mb-4">{error}</p>
          <a href="/" className="markdown-link">← Back to Home</a>
        </div>
      </main>
    );
  }

  return (
    <main className="docs-page-main">
      <article className="docs-article prose prose-slate">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSlug]}
          components={{
            // Style code and pre separately so inline code never becomes block markup.
            code({ node: _node, className, children, ...props }) {
              return (
                <code className={['markdown-inline-code', className].filter(Boolean).join(' ')} {...props}>
                  {children}
                </code>
              );
            },
            pre({ node: _node, className, children, ...props }) {
              return (
                <pre className={['markdown-pre', className].filter(Boolean).join(' ')} {...props}>
                  {children}
                </pre>
              );
            },
            // Style links
            a({ node: _node, children, href, ...props }) {
              const isExternal = href?.startsWith('http');
              return (
                <a
                  href={href}
                  className="markdown-link"
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  {...props}
                >
                  {children}
                </a>
              );
            },
            // Style tables
            table({ node: _node, children, ...props }) {
              return (
                <div className="markdown-table-wrap">
                  <table className="markdown-table" {...props}>
                    {children}
                  </table>
                </div>
              );
            },
            thead({ node: _node, children, ...props }) {
              return (
                <thead className="markdown-thead" {...props}>
                  {children}
                </thead>
              );
            },
            th({ node: _node, children, ...props }) {
              return (
                <th className="markdown-th" {...props}>
                  {children}
                </th>
              );
            },
            td({ node: _node, children, ...props }) {
              return (
                <td className="markdown-td" {...props}>
                  {children}
                </td>
              );
            },
            // Style headings
            h1({ node: _node, children, ...props }) {
              return (
                <h1 className="markdown-h1" {...props}>
                  {children}
                </h1>
              );
            },
            h2({ node: _node, children, ...props }) {
              return (
                <h2 className="markdown-h2" {...props}>
                  {children}
                </h2>
              );
            },
            h3({ node: _node, children, ...props }) {
              return (
                <h3 className="markdown-h3" {...props}>
                  {children}
                </h3>
              );
            },
            // Style blockquotes
            blockquote({ node: _node, children, ...props }) {
              return (
                <blockquote className="markdown-blockquote" {...props}>
                  {children}
                </blockquote>
              );
            },
            // Style lists
            ul({ node: _node, children, ...props }) {
              return (
                <ul className="markdown-list list-disc" {...props}>
                  {children}
                </ul>
              );
            },
            ol({ node: _node, children, ...props }) {
              return (
                <ol className="markdown-list list-decimal" {...props}>
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
