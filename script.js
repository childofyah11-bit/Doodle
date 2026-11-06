/* Shared design system for Project Bob */
:root {
  --bg: #f5f7ff;
  --panel: rgba(255, 255, 255, 0.8);
  --card: #ffffff;
  --card-strong: #111827;
  --card-soft: #f3f4f6;
  --primary: #4f46e5;
  --primary-2: #7c3aed;
  --accent: #10b981;
  --text: #111827;
  --muted: #5b6476;
  --line: #e5e7eb;
  --shadow: 0 20px 42px rgba(17, 24, 39, 0.08);
  --radius: 18px;
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  font-family: "Inter", sans-serif;
  background:
    radial-gradient(circle at top left, rgba(79, 70, 229, 0.12), transparent 28%),
    linear-gradient(180deg, #f7f9ff 0%, #eef3ff 100%);
  color: var(--text);
}

a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }
button, input, select, textarea { font: inherit; }

.page-shell { min-height: 100vh; }
.container {
  width: min(1200px, calc(100% - 32px));
  margin: 0 auto;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(18px);
  background: rgba(245, 247, 255, 0.74);
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.nav-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 74px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.brand-mark {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: white;
  box-shadow: 0 10px 18px rgba(79, 70, 229, 0.28);
}

.main-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 14px;
  font-size: 0.93rem;
  color: var(--muted);
}

.main-nav a {
  padding: 10px 8px;
  transition: color 0.2s ease;
}

.main-nav a:hover,
.main-nav a.active {
  color: var(--text);
  font-weight: 700;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.primary-btn,
.secondary-btn,
.link-btn,
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  padding: 0.8rem 1.1rem;
  font-weight: 700;
  border: 1px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary-btn {
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  color: white;
  box-shadow: 0 12px 22px rgba(79, 70, 229, 0.25);
}

.secondary-btn {
  background: white;
  border-color: var(--line);
  color: var(--text);
}

.link-btn {
  padding-inline: 0.85rem;
  color: var(--muted);
}

.primary-btn:hover,
.secondary-btn:hover,
.link-btn:hover {
  transform: translateY(-1px);
}

.full { width: 100%; }

.hero {
  padding: 72px 0 38px;
}

.hero-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  align-items: center;
  gap: 28px;
}

.eyebrow {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--primary);
  margin-bottom: 12px;
}

.hero-copy h1,
.page-hero h1 {
  margin: 0;
  font-size: clamp(2.7rem, 4vw, 4.4rem);
  line-height: 0.95;
  letter-spacing: -0.06em;
}

.hero-copy p,
.info-card p,
.use-card p,
.lesson-card p,
.story-grid p,
.panel-copy,
.contact-card p,
.pricing-card ul,
.faq-list p,
.roadmap-item p {
  color: var(--muted);
  line-height: 1.7;
  font-size: 1rem;
}

.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.mini-stats {
  list-style: none;
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
  padding: 0;
  margin: 26px 0 0;
}

.mini-stats li {
  display: grid;
  gap: 4px;
}

.mini-stats strong {
  font-size: 1.4rem;
}

.mini-stats span {
  color: var(--muted);
  font-size: 0.9rem;
}

.hero-visual {
  display: flex;
  justify-content: center;
}

.visual-card {
  width: min(560px, 100%);
  background: rgba(17, 24, 39, 0.95);
  border-radius: 28px;
  padding: 18px;
  box-shadow: 0 30px 60px rgba(17, 24, 39, 0.22);
}

.window-bar {
  display: flex;
  gap: 8px;
  padding-bottom: 14px;
}

.window-bar span {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255,255,255,0.7);
}

.canvas-preview {
  position: relative;
  height: 420px;
  border-radius: 22px;
  background: linear-gradient(135deg, #f5f3ff, #dfe9ff 30%, #ecfeff 100%);
  overflow: hidden;
}

.preview-image {
  position: absolute;
  inset: 14% 14% 18% 14%;
  border-radius: 26px;
  background:
    radial-gradient(circle at 35% 28%, rgba(255,255,255,0.9), rgba(255,255,255,0) 26%),
    linear-gradient(135deg, #c7d2fe, #a5b4fc 40%, #86efac 100%);
  box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.06);
}

.floating-panel {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(17, 24, 39, 0.8);
  color: white;
  padding: 8px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
}

.panel-one { top: 20px; right: 30px; }
.panel-two { bottom: 26px; left: 36px; }
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.dot.green { background: #4ade80; }
.dot.purple { background: #a78bfa; }

.section-sm { padding: 0 0 24px; }
.logos p,
.section-heading {
  text-align: center;
  color: var(--muted);
}

.logo-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 18px;
  margin-top: 20px;
  text-align: center;
  color: #7a8599;
  font-weight: 700;
}

.section {
  padding: 76px 0;
}

.alt-bg {
  background: rgba(255, 255, 255, 0.35);
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.section-heading {
  margin-bottom: 28px;
}

.section-heading.center { text-align: center; }

.section-heading h2 {
  margin: 0;
  font-size: clamp(2rem, 2.8vw, 3rem);
  letter-spacing: -0.05em;
}

.card-grid {
  display: grid;
  gap: 20px;
}

.three-up { grid-template-columns: repeat(3, minmax(0, 1fr)); }

.four-up { grid-template-columns: repeat(4, minmax(0, 1fr)); }

.info-card,
.use-card,
.pricing-card,
.lesson-card,
.contact-card,
.auth-card,
.roadmap-item,
.faq-list details {
  background: rgba(255,255,255,0.82);
  border: 1px solid rgba(148,163,184,0.18);
  border-radius: 20px;
  box-shadow: var(--shadow);
}

.info-card,
.use-card {
  padding: 22px;
}

.icon-wrap {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-weight: 800;
  margin-bottom: 14px;
}

.icon-wrap.purple { background: #ede9fe; color: #5b21b6; }
.icon-wrap.blue { background: #dbeafe; color: #1d4ed8; }
.icon-wrap.green { background: #dcfce7; color: #15803d; }
.icon-wrap.orange { background: #ffedd5; color: #c2410c; }
.icon-wrap.pink { background: #fce7f3; color: #be185d; }
.icon-wrap.gray { background: #f3f4f6; color: #374151; }

.split-layout {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 24px;
  align-items: center;
}

.check-list {
  list-style: none;
  margin: 22px 0 0;
  padding: 0;
  display: grid;
  gap: 12px;
  color: var(--muted);
  font-weight: 600;
}

.check-list li::before {
  content: "✓";
  display: inline-block;
  margin-right: 10px;
  color: var(--accent);
}

.mini-showcase {
  display: flex;
  justify-content: center;
}

.showcase-card {
  width: min(100%, 420px);
  padding: 18px;
  background: rgba(17,24,39,0.95);
  border-radius: 22px;
  box-shadow: 0 20px 40px rgba(17,24,39,0.18);
}

.tag-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  color: rgba(255,255,255,0.8);
  font-size: 0.8rem;
}

.mini-canvas {
  height: 260px;
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04)),
    linear-gradient(135deg, #e0e7ff, #bfdbfe 42%, #bbf7d0 100%);
  position: relative;
  overflow: hidden;
}

.mini-canvas::before,
.mini-canvas::after {
  content: "";
  position: absolute;
  background: rgba(17,24,39,0.7);
  border-radius: 999px;
}

.mini-canvas::before {
  width: 46%;
  height: 46%;
  left: 25%;
  top: 26%;
  transform: rotate(-18deg);
  border: 3px solid rgba(255,255,255,0.4);
  background: rgba(17,24,39,0.24);
}

.mini-canvas::after {
  width: 52%;
  height: 18%;
  left: 28%;
  bottom: 22%;
  background: rgba(17,24,39,0.3);
}

.details-demo::before { width: 50%; height: 60%; left: 24%; top: 18%; }

.cta-band { padding-top: 10px; }
.cta-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #1f2937, #312e81);
  color: white;
  border-radius: 26px;
  padding: 28px 30px;
  box-shadow: 0 30px 60px rgba(49, 46, 129, 0.3);
}

.site-footer {
  padding: 24px 0 36px;
  border-top: 1px solid rgba(148,163,184,0.16);
}

.footer-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  color: var(--muted);
}

.footer-links {
  display: flex;
  gap: 20px;
}

.page-hero {
  padding: 64px 0 18px;
}

.small-hero {
  text-align: center;
}

.narrow {
  max-width: 760px;
}

.center { text-align: center; }

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.gallery-item {
  min-height: 220px;
  border-radius: 18px;
  background: linear-gradient(135deg, #dbeafe, #c4b5fd, #bbf7d0);
  box-shadow: var(--shadow);
}

.gallery-item.tall { grid-row: span 2; min-height: 440px; }
.gallery-item.wide { grid-column: span 2; }

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.pricing-card {
  padding: 26px 22px;
}

.pricing-card.featured {
  background: linear-gradient(180deg, rgba(79, 70, 229, 0.06), #ffffff);
  border-color: rgba(79, 70, 229, 0.2);
}

.price {
  font-size: 2.3rem;
  font-weight: 800;
  letter-spacing: -0.06em;
  margin: 18px 0;
}

.price span {
  font-size: 1rem;
  color: var(--muted);
}

.pricing-card ul {
  list-style: none;
  padding: 0;
  margin: 0 0 22px;
  display: grid;
  gap: 10px;
}

.pricing-card li::before {
  content: "•";
  color: var(--primary);
  margin-right: 8px;
}

.badge {
  display: inline-block;
  background: #eef2ff;
  color: var(--primary);
  border-radius: 999px;
  padding: 6px 8px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.tutorial-list {
  display: grid;
  gap: 18px;
}

.lesson-card {
  padding: 22px 24px;
  display: flex;
  align-items: start;
  gap: 18px;
}

.lesson-card span {
  display: inline-grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #eef2ff;
  color: var(--primary);
  font-weight: 800;
}

.story-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 24px;
}

.stat-boxes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.stat-box {
  background: rgba(255,255,255,0.82);
  border: 1px solid rgba(148,163,184,0.18);
  border-radius: 20px;
  padding: 20px 18px;
  text-align: center;
  box-shadow: var(--shadow);
}

.stat-box strong {
  display: block;
  font-size: 2rem;
  margin-bottom: 8px;
}

.roadmap {
  display: grid;
  gap: 18px;
}

.roadmap-item {
  display: grid;
  grid-template-columns: 84px 1fr;
  gap: 18px;
  padding: 18px 22px;
}

.roadmap-item span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  border-radius: 14px;
  background: #eef2ff;
  color: var(--primary);
  font-weight: 800;
}

.faq-list {
  display: grid;
  gap: 14px;
}

.faq-list details {
  padding: 18px 20px;
}

.faq-list summary {
  cursor: pointer;
  font-weight: 700;
}

.contact-wrap {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 24px;
}

.contact-form,
.auth-form {
  display: grid;
  gap: 16px;
}

.contact-form label,
.auth-form label {
  display: grid;
  gap: 8px;
  color: var(--muted);
  font-weight: 600;
}

.contact-form input,
.contact-form select,
.contact-form textarea,
.auth-form input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.9rem 1rem;
  background: white;
  color: var(--text);
}

.contact-card {
  padding: 22px;
  height: fit-content;
}

.auth-page {
  padding-top: 56px;
}

.auth-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

.auth-panel { padding: 28px; }
.auth-visual { background: linear-gradient(135deg, #eef2ff, #dbeafe); min-height: 360px; display: grid; place-items: center; }
.auth-box {
  width: min(280px, 70%);
  aspect-ratio: 1;
  border-radius: 30px;
  background: linear-gradient(135deg, rgba(79,70,229,0.9), rgba(124,58,237,0.7));
  box-shadow: 0 32px 44px rgba(79, 70, 229, 0.28);
}

.studio-page {
  padding: 44px 0 42px;
}

.studio-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 22px;
}

.studio-sidebar,
.studio-stage {
  background: rgba(255,255,255,0.8);
  border: 1px solid rgba(148,163,184,0.2);
  border-radius: 22px;
  box-shadow: var(--shadow);
}

.studio-sidebar { padding: 18px; }
.panel-block h2 { margin: 8px 0 0; }
.tool-group {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.tool-item {
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 700;
  text-align: left;
}

.tool-item.active {
  background: #eef2ff;
  border-color: rgba(79,70,229,0.2);
  color: var(--primary);
}

.compact label {
  display: grid;
  gap: 7px;
  color: var(--muted);
  font-weight: 700;
}

.compact input { accent-color: var(--primary); }

.studio-stage { padding: 12px; }
.studio-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 8px 14px;
  color: var(--muted);
  font-weight: 700;
}
.stage-actions {
  display: flex;
  gap: 10px;
}

.studio-canvas-wrap {
  background: linear-gradient(180deg, #f7f9ff, #eef5ff);
  border-radius: 18px;
  min-height: 620px;
  padding: 16px;
  border: 1px solid rgba(148,163,184,0.18);
}

.studio-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 590px;
  border-radius: 16px;
  background:
    linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px),
    linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px),
    #ffffff;
  background-size: 22px 22px, 22px 22px, 100% 100%;
  overflow: hidden;
}

.trace-layer,
.draw-layer {
  position: absolute;
  inset: 0;
}

.trace-layer {
  background: linear-gradient(135deg, rgba(59,130,246,0.18), rgba(167,139,250,0.2));
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 14px;
  inset: 10% 12%;
}

.draw-layer {
  inset: 14% 16%;
  background: radial-gradient(circle at 50% 40%, rgba(17,24,39,0.18), rgba(17,24,39,0.02) 45%, transparent 55%);
  border-radius: 18px;
  box-shadow: inset 0 0 0 1px rgba(17,24,39,0.08);
}

@media (max-width: 1024px) {
  .main-nav {
    display: none;
  }
  .hero-grid,
  .split-layout,
  .story-grid,
  .contact-wrap,
  .auth-card,
  .studio-layout,
  .three-up,
  .four-up,
  .pricing-grid {
    grid-template-columns: 1fr;
  }

  .gallery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .logo-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .nav-wrap,
  .footer-wrap,
  .cta-box {
    flex-direction: column;
    align-items: flex-start;
  }
  .logo-row,
  .stat-boxes,
  .gallery-grid {
    grid-template-columns: 1fr;
  }
  .hero-copy h1,
  .page-hero h1 { font-size: 2.4rem; }
  .site-header { position: static; }
}


























