import fs from 'fs';
import path from 'path';
import MarkdownIt from 'markdown-it';
import { getHighlighter } from 'shiki';

const md = new MarkdownIt({ html: true, linkify: true });

const docsDir = path.resolve('docs');
const outDir = path.resolve('site-tw/dist/docs');

const template = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<link rel="stylesheet" href="/styles.css"/>
</head>
<body class="min-h-screen bg-slate-950 text-slate-100">
  <div class="max-w-5xl mx-auto px-6 py-10">
    <a href="/" class="text-indigo-300 hover:text-indigo-200">← Back to Home</a>
    <article class="prose prose-invert max-w-none mt-6">${body}</article>
  </div>
</body>
</html>`;

async function build() {
  const highlighter = await getHighlighter({ theme: 'github-dark' });
  md.set({
    highlight: (code, lang) => {
      try { return highlighter.codeToHtml(code, { lang }); }
      catch { return `<pre><code>${md.utils.escapeHtml(code)}</code></pre>`; }
    }
  });

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const src = path.join(dir, entry.name);
      const rel = path.relative(docsDir, src);
      const dst = path.join(outDir, rel.replace(/\.md$/, '.html'));
      if (entry.isDirectory()) {
        fs.mkdirSync(path.join(outDir, rel), { recursive: true });
        walk(src);
      } else if (entry.isFile() && src.endsWith('.md')) {
        const raw = fs.readFileSync(src, 'utf-8');
        const html = md.render(raw);
        const page = template(entry.name.replace('.md',''), html);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.writeFileSync(dst, page);
      }
    }
  };

  if (!fs.existsSync(docsDir)) return;
  walk(docsDir);
}

build().catch(e => { console.error(e); process.exit(1); });
