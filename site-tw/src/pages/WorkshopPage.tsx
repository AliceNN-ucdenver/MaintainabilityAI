import React from 'react';
import { Link } from 'react-router-dom';
import { workshopOutcomes, workshopRoadmapParts } from '../content/siteContent';

export default function WorkshopPage() {
  return (
    <main>
      <section className="site-hero">
        <div className="site-shell relative py-12 md:py-20">
          <Link to="/" className="site-link mb-6 inline-flex items-center gap-2 text-sm sm:text-base">
            Back to Home
          </Link>

          <div className="workshop-hero-grid">
            <div className="site-shell-narrow">
              <p className="site-eyebrow-cyan">Workshop agenda</p>
              <h1 className="site-page-title">Agentic engineering, secure by design.</h1>
              <p className="site-lede max-w-3xl md:text-xl">
                A team workshop that moves developers from AI experimentation into governed delivery: prompt discipline, OWASP remediation, fitness functions, and architecture-aware agent control.
              </p>
            </div>

            <figure className="workshop-hero-figure">
              <img
                src="/images/alice-bot.png"
                alt="MaintainabilityAI workshop guide"
                className="workshop-hero-image"
              />
              <figcaption className="workshop-hero-caption">
                A guided path from prompt discipline to governed agentic delivery.
              </figcaption>
            </figure>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-4">
            <div className="site-card-compact">
              <div className="text-brand font-bold text-sm mb-1">Delivery</div>
              <div className="text-2xl font-bold">Flexible</div>
              <div className="text-slate-400 text-sm mt-1">Full-day, weekly series, or custom team path</div>
            </div>
            <div className="site-card-compact">
              <div className="text-brand font-bold text-sm mb-1">Audience</div>
              <div className="text-2xl font-bold">Developers + architects</div>
              <div className="text-slate-400 text-sm mt-1">Junior to senior, with security partners welcome</div>
            </div>
            <div className="site-card-compact">
              <div className="text-brand font-bold text-sm mb-1">Current status</div>
              <div className="text-2xl font-bold">All 8 parts live</div>
              <div className="text-slate-400 text-sm mt-1">Complete agentic SDLC, orientation through capstone</div>
            </div>
          </div>
        </div>
      </section>

      <section className="site-shell site-section-tight">
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10">
          <div>
            <p className="site-eyebrow">Learner path</p>
            <h2 className="site-heading">The docs workshop is the canonical path.</h2>
            <p className="site-lede text-base">
              This page explains the team journey and delivery shape. The workshop docs carry the actual step-by-step learner experience, exercises, resources, and next steps.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/docs/workshop" className="site-button-primary">
                Open Workshop Docs
              </Link>
              <a href="https://chiefarcheologist.com/contact" className="site-button-secondary">
                Discuss Delivery
              </a>
            </div>
          </div>

          <div className="site-card">
            <h3 className="text-2xl font-bold mb-4">What teams take away</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {workshopOutcomes.map((outcome) => (
                <div key={outcome} className="border-l-2 border-brand pl-4 text-slate-300">
                  {outcome}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="site-band-top">
        <div className="site-shell site-section-tight">
          <div className="grid lg:grid-cols-[1fr_0.9fr] gap-10 items-center">
            <div>
              <p className="site-eyebrow">Capstone direction</p>
              <h2 className="site-heading">One coherent finish line.</h2>
              <p className="site-lede">
                The final arc should converge on one app, one threat model, one prompt library, one PR, one fitness gate, and one governance review. That gives learners a memorable path from concept to controlled agentic delivery.
              </p>
            </div>
            <div className="site-card-muted">
              <h3 className="text-2xl font-bold mb-4">Recommended next step</h3>
              <p className="text-slate-300 mb-6">
                Start with Part 1 if your team is new to the framework. Jump to Part 4 if your team already uses AI coding tools and needs measurable quality gates.
              </p>
              <Link to="/docs/workshop/part1-spectrum" className="site-button-primary w-full">
                Start Part 1
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="site-shell site-section-tight">
        <div className="max-w-3xl">
          <p className="site-eyebrow-cyan">Roadmap</p>
          <h2 className="site-heading">Next: Research + PRD agents.</h2>
          <p className="site-lede text-base">
            With all 8 workshop parts live, the framework now extends upstream of implementation. Two new mesh-side agents take a plain-English brief and produce an audit-grade research doc and a grounded PRD — the inputs Cheshire turns into RCTRO issues for the coding agents.
          </p>
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-4">
          {workshopRoadmapParts.map(({ part, title, subtitle, body, href }) => {
            const card = (
              <div className="site-card-compact border-cyan-400/25 bg-cyan-400/5 h-full">
                <div className="text-xs text-cyan-300 font-semibold uppercase tracking-[0.18em]">{part}</div>
                <h3 className="mt-2 text-xl font-bold text-white">{title}</h3>
                {subtitle ? <div className="mt-1 text-xs text-cyan-200/80">{subtitle}</div> : null}
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{body}</p>
              </div>
            );
            return href
              ? <Link key={part + title} to={href} className="block hover:opacity-95 transition-opacity">{card}</Link>
              : <div key={part + title}>{card}</div>;
          })}
        </div>
      </section>
    </main>
  );
}
