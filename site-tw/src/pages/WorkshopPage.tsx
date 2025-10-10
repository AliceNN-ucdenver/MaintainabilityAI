import React from 'react';
import { Link } from 'react-router-dom';

export default function WorkshopPage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-12">
        <Link to="/" className="text-brand hover:text-indigo-400 inline-flex items-center gap-2 mb-6">
          ← Back to Home
        </Link>
        <h1 className="text-5xl md:text-6xl font-black">Workshop: Agentic, Secure AI Engineering</h1>
        <p className="mt-4 text-xl text-slate-300 max-w-3xl">
          An 8-part, hands-on workshop for teams learning security-first AI-assisted development.
          From vibe coding to production-grade agentic workflows with OWASP + Maintainability integration.
        </p>
      </div>

      {/* Workshop Info Cards */}
      <div className="mt-8 grid md:grid-cols-3 gap-4 mb-12">
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-brand font-bold text-sm mb-1">Duration</div>
          <div className="text-2xl font-bold">8 × 90min</div>
          <div className="text-slate-400 text-sm mt-1">Full-day or weekly series</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-brand font-bold text-sm mb-1">Audience</div>
          <div className="text-2xl font-bold">Jr → Sr</div>
          <div className="text-slate-400 text-sm mt-1">Developers & architects</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-brand font-bold text-sm mb-1">Format</div>
          <div className="text-2xl font-bold">Hands-On</div>
          <div className="text-slate-400 text-sm mt-1">70% lab, 30% lecture</div>
        </div>
      </div>

      {/* Call to Action for Workshop Overview */}
      <div className="rounded-2xl border-2 border-brand bg-gradient-to-br from-indigo-950/50 to-slate-900 p-8 mb-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Start the Workshop</h2>
            <p className="text-slate-300">
              Get hands-on with our 4-part workshop series. Learn security-first AI development with real code examples.
            </p>
          </div>
          <Link to="/docs/workshop" className="px-8 py-4 rounded-xl bg-brand text-slate-900 font-bold text-lg hover:bg-indigo-400 transition whitespace-nowrap">
            Begin Workshop →
          </Link>
        </div>
      </div>

      {/* Full agenda content - render as markdown for now */}
      <div className="text-slate-300">

        <div className="rounded-2xl border-2 border-brand bg-gradient-to-br from-indigo-950/50 to-slate-900 p-8 mb-12">
          <h2 className="text-3xl font-bold mb-6">Workshop Overview</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-xl mb-3 text-brand">What You'll Learn</h3>
              <ul className="space-y-2 text-slate-300">
                <li>✓ Security-first prompt engineering (OWASP integration)</li>
                <li>✓ Maintainability-first prompting (fitness functions, complexity limits)</li>
                <li>✓ OWASP Top 10 remediation with AI</li>
                <li>✓ Fitness function implementation</li>
                <li>✓ Multi-agent security workflows</li>
                <li>✓ CodeQL + Snyk integration</li>
                <li>✓ Golden Rules governance</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-3 text-brand">What You'll Take Home</h3>
              <ul className="space-y-2 text-slate-300">
                <li>✓ Complete OWASP A01-A10 prompt pack</li>
                <li>✓ Maintainability prompt packs (fitness functions, dependency hygiene, Strangler Fig, technical debt)</li>
                <li>✓ Team prompt library starter kit</li>
                <li>✓ CodeQL + Snyk CI/CD workflows</li>
                <li>✓ Fitness function test suite</li>
                <li>✓ Multi-agent orchestration templates</li>
              </ul>
            </div>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">8-Part Curriculum</h2>
          <div className="space-y-4">
            <Link to="/docs/workshop/part1-spectrum" className="block rounded-xl border border-slate-800 bg-slate-900/30 p-6 hover:border-brand/50 transition">
              <h3 className="font-bold text-xl mb-2">Part 1: The Spectrum (Vibe → AI-Assisted → Agentic)</h3>
              <p className="text-slate-400">Understand the three modes of AI-assisted development and when to use each.</p>
            </Link>

            <Link to="/docs/workshop/part2-security-prompting" className="block rounded-xl border border-slate-800 bg-slate-900/30 p-6 hover:border-brand/50 transition">
              <h3 className="font-bold text-xl mb-2">Part 2: Security-First Prompting with OWASP</h3>
              <p className="text-slate-400">Master the anatomy of security-first prompts with OWASP Top 10 integration.</p>
            </Link>

            <Link to="/docs/workshop/part3-live-remediation" className="block rounded-xl border border-slate-800 bg-slate-900/30 p-6 hover:border-brand/50 transition">
              <h3 className="font-bold text-xl mb-2">Part 3: Live Remediation (A03 Injection)</h3>
              <p className="text-slate-400">Step-by-step SQL injection remediation using real vulnerable code.</p>
            </Link>

            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
              <h3 className="font-bold text-xl mb-2">Part 4: Fitness Functions (Automated Quality Gates)</h3>
              <p className="text-slate-400">Implement Evolutionary Architecture fitness functions to prevent technical debt.</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
              <h3 className="font-bold text-xl mb-2">Part 5: CodeQL + Snyk (Full Security Pipeline)</h3>
              <p className="text-slate-400">Master both CodeQL (SAST) and Snyk (SCA + SAST) for comprehensive security scanning.</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
              <h3 className="font-bold text-xl mb-2">Part 6: Building Your Team Prompt Library</h3>
              <p className="text-slate-400">Create hybrid prompts combining security + maintainability requirements.</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
              <h3 className="font-bold text-xl mb-2">Part 7: Multi-Agent Security Orchestration</h3>
              <p className="text-slate-400">Coordinate multiple AI agents for complex security workflows.</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
              <h3 className="font-bold text-xl mb-2">Part 8: Governance & Golden Rules</h3>
              <p className="text-slate-400">Implement the Golden Rules framework for responsible AI-assisted development.</p>
            </div>
          </div>
        </section>

        <section className="mt-16 text-center border-t border-slate-800 pt-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Team?</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Available for on-site or remote delivery. Customizable to your tech stack and team size.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:hello@maintainability.ai?subject=Workshop%20Inquiry" className="px-8 py-4 rounded-xl bg-brand text-slate-900 font-bold text-lg hover:bg-indigo-400 transition">
              Schedule a Workshop
            </a>
            <Link to="/" className="px-8 py-4 rounded-xl border-2 border-slate-700 hover:bg-slate-900 font-semibold text-lg transition">
              Learn More
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
