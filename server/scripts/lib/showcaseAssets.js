'use strict';

/**
 * Builds the HTML sheet the seed screenshots into cover / avatar / banner
 * images (client/public/stitch/seed). Each element carries data-shot="name".
 */

const { AUTHORS, BOOKS } = require('./showcaseData');

const TONE_STYLES = {
  fantasy: { bg: ['#1c1a2e', '#3b2f5c', '#0f0e1a'], accent: '#e0c27a', pattern: 'rings' },
  scifi: { bg: ['#061225', '#0e2a4a', '#02070f'], accent: '#7dd3fc', pattern: 'grid' },
  romance: { bg: ['#5b1a34', '#b0405f', '#2b0d1a'], accent: '#ffd6e0', pattern: 'circles' },
  mystery: { bg: ['#1f2937', '#374151', '#0b1220'], accent: '#d1d5db', pattern: 'stripes' },
  thriller: { bg: ['#1a0505', '#5c1212', '#050202'], accent: '#fca5a5', pattern: 'bars' },
  literary: { bg: ['#f4efe6', '#e7dfd0', '#d9cfbc'], accent: '#3f3a33', pattern: 'line', dark: false },
  historical: { bg: ['#3b2a1a', '#6b4a2b', '#1f150c'], accent: '#f5deb3', pattern: 'rule' },
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function patternSvg(kind, accent) {
  const a = accent;
  switch (kind) {
    case 'rings':
      return `<svg viewBox="0 0 600 900" preserveAspectRatio="none"><g fill="none" stroke="${a}" stroke-opacity="0.16" stroke-width="1.5">${[120, 200, 280, 360, 440, 520].map((r) => `<circle cx="480" cy="720" r="${r}"/>`).join('')}</g></svg>`;
    case 'grid':
      return `<svg viewBox="0 0 600 900"><defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${a}" stroke-opacity="0.12"/></pattern></defs><rect width="600" height="900" fill="url(#g)"/>${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 137) % 600}" cy="${(i * 211) % 900}" r="${1 + (i % 3)}" fill="${a}" fill-opacity="${0.35 + (i % 4) * 0.12}"/>`).join('')}</svg>`;
    case 'circles':
      return `<svg viewBox="0 0 600 900"><g fill="${a}" fill-opacity="0.10">${[[520, 160, 180], [90, 760, 220], [470, 840, 120]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g></svg>`;
    case 'stripes':
      return `<svg viewBox="0 0 600 900"><defs><pattern id="s" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="26" stroke="${a}" stroke-opacity="0.10" stroke-width="6"/></pattern></defs><rect width="600" height="900" fill="url(#s)"/></svg>`;
    case 'bars':
      return `<svg viewBox="0 0 600 900"><g fill="${a}" fill-opacity="0.12">${Array.from({ length: 14 }, (_, i) => `<rect x="0" y="${i * 66}" width="${120 + ((i * 97) % 420)}" height="10"/>`).join('')}</g></svg>`;
    case 'line':
      return `<svg viewBox="0 0 600 900" fill="none" stroke="${a}" stroke-opacity="0.35" stroke-width="2"><path d="M60 700 C 200 640, 260 760, 380 690 S 520 640, 560 700"/><path d="M60 740 C 200 680, 260 800, 380 730 S 520 680, 560 740" stroke-opacity="0.18"/></svg>`;
    case 'rule':
      return `<svg viewBox="0 0 600 900" stroke="${a}" stroke-opacity="0.14">${Array.from({ length: 26 }, (_, i) => `<line x1="60" y1="${120 + i * 28}" x2="540" y2="${120 + i * 28}"/>`).join('')}</svg>`;
    default:
      return '';
  }
}

function coverHtml(book, author) {
  const t = TONE_STYLES[book.tone] || TONE_STYLES.literary;
  const dark = t.dark !== false;
  const fg = dark ? '#fbf7ef' : '#1e1b15';
  const sub = dark ? 'rgba(251,247,239,0.72)' : 'rgba(30,27,21,0.7)';
  return `
  <div class="cover" data-shot="cover-${esc(book.slug)}" style="background:linear-gradient(160deg, ${t.bg[0]} 0%, ${t.bg[1]} 55%, ${t.bg[2]} 100%); color:${fg}">
    <div class="pattern">${patternSvg(t.pattern, t.accent)}</div>
    <div class="frame" style="border-color:${t.accent}"></div>
    <div class="top"><span>Novel Centre</span><span style="color:${sub}">${esc(book.category)}</span></div>
    <div class="body">
      <h1 style="font-size:${book.title.length > 24 ? 62 : 74}px">${esc(book.title)}</h1>
      <div class="bar" style="background:${t.accent}"></div>
      <p class="by" style="color:${sub}">a novel by</p>
      <p class="author">${esc(author.displayName)}</p>
    </div>
    <div class="bottom"><span class="mark" style="border-color:${t.accent}; color:${t.accent}">NC</span><span class="line" style="background:${t.accent}"></span></div>
  </div>`;
}

function avatarHtml(author) {
  const initials = author.displayName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return `
  <div class="avatar" data-shot="avatar-${esc(author.key)}" style="background:radial-gradient(circle at 30% 25%, ${author.palette[1]} 0%, ${author.palette[0]} 70%)">
    <span class="ring"></span>
    <span class="initials">${esc(initials)}</span>
  </div>`;
}

function bannerHtml(author) {
  const [a, b] = author.palette;
  return `
  <div class="banner" data-shot="banner-${esc(author.key)}" style="background:linear-gradient(110deg, ${a} 0%, ${b} 140%)">
    <svg viewBox="0 0 1400 560" preserveAspectRatio="none"><g fill="none" stroke="#fff" stroke-opacity="0.12" stroke-width="2">${[60, 140, 220, 300, 380, 460].map((r) => `<circle cx="1180" cy="120" r="${r}"/>`).join('')}${[0, 1, 2, 3].map((i) => `<path d="M0 ${380 + i * 40} C 350 ${330 + i * 40}, 700 ${430 + i * 40}, 1400 ${360 + i * 40}"/>`).join('')}</g></svg>
    <p class="bname">${esc(author.displayName)}</p>
  </div>`;
}

function buildAssetsHtml() {
  const byKey = Object.fromEntries(AUTHORS.map((a) => [a.key, a]));
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;0,600;1,400&family=Manrope:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  body { margin: 0; background: #ddd; font-family: Manrope, sans-serif; }
  .sheet { display: flex; flex-wrap: wrap; gap: 24px; padding: 24px; }
  .cover { position: relative; width: 600px; height: 900px; overflow: hidden; box-sizing: border-box; }
  .cover .pattern, .cover .pattern svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .cover .frame { position: absolute; inset: 26px; border: 1px solid; opacity: 0.55; }
  .cover .top { position: absolute; top: 58px; left: 64px; right: 64px; display: flex; justify-content: space-between; font-size: 18px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
  .cover .body { position: absolute; left: 64px; right: 64px; top: 250px; }
  .cover h1 { font-family: Newsreader, Georgia, serif; font-weight: 600; line-height: 1.05; margin: 0 0 30px; letter-spacing: -0.01em; }
  .cover .bar { width: 84px; height: 4px; margin-bottom: 26px; }
  .cover .by { font-family: Newsreader, Georgia, serif; font-style: italic; font-size: 24px; margin: 0 0 8px; }
  .cover .author { font-size: 26px; font-weight: 700; margin: 0; letter-spacing: 0.02em; }
  .cover .bottom { position: absolute; left: 64px; right: 64px; bottom: 58px; display: flex; align-items: center; gap: 18px; }
  .cover .mark { font-family: Newsreader, serif; font-size: 28px; font-weight: 600; border-bottom: 2px solid; padding-bottom: 2px; }
  .cover .line { height: 1px; flex: 1; opacity: 0.6; }
  .avatar { position: relative; width: 400px; height: 400px; display: flex; align-items: center; justify-content: center; }
  .avatar .ring { position: absolute; inset: 22px; border: 3px solid rgba(255,255,255,0.35); border-radius: 50%; }
  .avatar .initials { font-family: Newsreader, Georgia, serif; font-size: 168px; font-weight: 500; color: rgba(255,255,255,0.92); letter-spacing: -0.02em; }
  .banner { position: relative; width: 1400px; height: 560px; overflow: hidden; }
  .banner svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .banner .bname { position: absolute; left: 70px; bottom: 56px; margin: 0; font-family: Newsreader, Georgia, serif; font-size: 72px; color: rgba(255,255,255,0.22); font-weight: 500; }
</style></head><body><div class="sheet">
${BOOKS.map((b) => coverHtml(b, byKey[b.author])).join('\n')}
${AUTHORS.map(avatarHtml).join('\n')}
${AUTHORS.map(bannerHtml).join('\n')}
</div></body></html>`;
}

module.exports = { buildAssetsHtml };
