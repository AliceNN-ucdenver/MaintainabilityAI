import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen">
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-extrabold text-2xl tracking-tight">
            <span className="text-brand">Maintainability</span>.ai
          </Link>
          <nav className="space-x-6 text-slate-300">
            <Link className="hover:text-white" to="/agenda">Workshop</Link>
            <Link className="hover:text-white" to="/docs/">Docs</Link>
            <a className="hover:text-white" href="https://github.com/AliceNN-ucdenver/MaintainabilityAI">GitHub</a>
            <a className="px-4 py-2 rounded-lg bg-brand text-slate-900 font-semibold hover:bg-indigo-400" href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      <Outlet />

      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-lg mb-4 text-brand">Maintainability.ai</h4>
              <p className="text-slate-400 text-sm">
                Security-first AI-assisted engineering. From prompt to production.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link to="/docs/" className="hover:text-white">Documentation</Link></li>
                <li><Link to="/agenda" className="hover:text-white">Workshop</Link></li>
                <li><a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI" className="hover:text-white">GitHub</a></li>
                <li><Link to="/docs/governance/vibe-golden-rules" className="hover:text-white">Golden Rules</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Framework</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link to="/docs/sdlc/" className="hover:text-white">SDLC Phases</Link></li>
                <li><Link to="/docs/prompts/owasp/" className="hover:text-white">OWASP Prompts</Link></li>
                <li><Link to="/docs/prompts/maintainability/" className="hover:text-white">Maintainability Prompts</Link></li>
                <li><Link to="/docs/framework" className="hover:text-white">Framework Guide</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
            <p>© 2025 Maintainability.ai — Built with Tailwind + Vite. Licensed under MIT.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
