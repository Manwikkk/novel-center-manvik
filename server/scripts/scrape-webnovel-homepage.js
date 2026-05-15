'use strict';

// Scrapes WebNovel homepage HTML into { weekly, featured, ranking, new_arrivals, completed }.
// Save JSON (--out), then seed the app DB:
//   npm run db:seed:webnovel -- --input ./scraped.json

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs/promises');

const BASE_URL = 'https://www.webnovel.com';
const DEFAULT_URL = `${BASE_URL}/`;

const SECTION_DEFINITIONS = [
  {
    key: 'weekly',
    labels: ['weekly book', 'weekly books'],
  },
  {
    key: 'featured',
    labels: ['featured', 'weekly featured'],
  },
  {
    key: 'ranking',
    labels: ['ranking'],
  },
  {
    key: 'new_arrivals',
    labels: ['new arrivals', 'new arrival'],
  },
  {
    key: 'completed',
    labels: ['completed novel', 'completed novels'],
  },
];

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeLabel(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function absoluteUrl(value, baseUrl = BASE_URL) {
  if (!value) return '';

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return '';
  }
}

function getImageUrl($, scope) {
  const image = scope.find('img').first();
  const attrs = [
    'src',
    'data-src',
    'data-original',
    'data-lazy',
    'data-url',
  ];

  for (const attr of attrs) {
    const value = image.attr(attr);
    if (value) return absoluteUrl(value);
  }

  const source = scope.find('source').first();
  return absoluteUrl(source.attr('srcset') || source.attr('data-srcset'));
}

function getMetaText($, scope, patterns) {
  const selectors = [
    '[class*="author" i]',
    '[class*="desc" i]',
    '[class*="intro" i]',
    '[class*="summary" i]',
    '[class*="synopsis" i]',
    '[class*="abstract" i]',
    'p',
    'span',
  ];

  const seen = new Set();

  for (const selector of selectors) {
    const match = scope.find(selector).toArray().find((element) => {
      const text = normalizeWhitespace($(element).text());
      if (!text || seen.has(text)) return false;
      seen.add(text);
      return patterns.some((pattern) => pattern.test(text));
    });

    if (match) return normalizeWhitespace($(match).text());
  }

  return '';
}

function cleanAuthor(value) {
  return normalizeWhitespace(value)
    .replace(/^author\s*[:：-]?\s*/i, '')
    .replace(/^by\s+/i, '');
}

function getAuthor($, scope) {
  const authorByClass = scope.find('[class*="author" i]').first().text();
  if (authorByClass) return cleanAuthor(authorByClass);

  const authorText = getMetaText($, scope, [/^(author|by)\b/i]);
  return cleanAuthor(authorText);
}

function getDescription($, scope, title, author) {
  const descriptionByClass = scope
    .find('[class*="desc" i], [class*="intro" i], [class*="summary" i], [class*="synopsis" i], [class*="abstract" i]')
    .toArray()
    .map((element) => normalizeWhitespace($(element).text()))
    .find((text) => text && text !== title && text !== author);

  if (descriptionByClass) return descriptionByClass;

  return scope
    .find('p')
    .toArray()
    .map((element) => normalizeWhitespace($(element).text()))
    .find((text) => text.length > 40 && text !== title && text !== author) || '';
}

function isBookLink(href) {
  return /\/(book|comic)\//i.test(href || '');
}

function compactTitle(value) {
  const text = normalizeWhitespace(value);
  if (!text) return '';

  const lines = text.split(/\s{2,}|[\r\n]+/).map(normalizeWhitespace).filter(Boolean);
  return lines.find((line) => line.length <= 140) || text.slice(0, 140).trim();
}

function getBookTitle($, anchor, scope) {
  const titleSelectors = [
    '[class*="title" i]',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'strong',
  ];

  const explicitTitle = anchor.attr('title') || anchor.attr('aria-label');
  if (explicitTitle) return compactTitle(explicitTitle);

  const anchorText = compactTitle(anchor.text());
  if (anchorText) return anchorText;

  for (const selector of titleSelectors) {
    const text = compactTitle(scope.find(selector).first().text());
    if (text) return text;
  }

  return '';
}

function findBookCard($, anchor) {
  let best = anchor;

  for (const element of anchor.parents().toArray()) {
    const scope = $(element);
    const bookLinkCount = scope.find('a[href*="/book/"], a[href*="/comic/"]').length;
    const hasImage = scope.find('img, source').length > 0;

    best = scope;

    if (bookLinkCount <= 3 && (hasImage || normalizeWhitespace(scope.text()).length > 20)) {
      return scope;
    }
  }

  return best;
}

function collectBookLinks($, scope) {
  const links = [];
  const seen = new Set();

  scope.find('a[href]').each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr('href');

    if (!isBookLink(href)) return;

    const link = absoluteUrl(href);
    if (!link || seen.has(link)) return;

    seen.add(link);
    links.push(anchor);
  });

  return links;
}

function parseBooksFromScope($, scope, limit = 24) {
  const books = [];
  const seen = new Set();

  for (const anchor of collectBookLinks($, scope)) {
    const card = findBookCard($, anchor);
    const link = absoluteUrl(anchor.attr('href'));
    const title = getBookTitle($, anchor, card);

    if (!link || !title || seen.has(link)) continue;
    seen.add(link);

    const author = getAuthor($, card);

    books.push({
      title,
      cover_image: getImageUrl($, card),
      link,
      author,
      short_description: getDescription($, card, title, author),
    });

    if (books.length >= limit) break;
  }

  return books;
}

function headingMatches(text, labels) {
  const normalized = normalizeLabel(text);
  return labels.some((label) => normalized === label || normalized.includes(label));
}

function findSectionHeading($, labels) {
  const headingSelector = [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    '[role="heading"]',
    '.section-title',
    '[class*="section" i][class*="title" i]',
  ].join(',');

  return $(headingSelector)
    .toArray()
    .find((element) => headingMatches($(element).text(), labels));
}

function getSectionScope($, headingElement) {
  const heading = $(headingElement);
  const nodes = [];
  const startTag = headingElement.tagName ? headingElement.tagName.toLowerCase() : '';
  const headingLevel = /^h[1-6]$/.test(startTag) ? Number(startTag.slice(1)) : 3;

  nodes.push(headingElement);

  let current = heading.next();
  while (current.length) {
    const tagName = current.get(0).tagName ? current.get(0).tagName.toLowerCase() : '';
    const currentLevel = /^h[1-6]$/.test(tagName) ? Number(tagName.slice(1)) : null;

    if (currentLevel && currentLevel <= headingLevel) break;
    nodes.push(current.get(0));
    current = current.next();
  }

  const boundedScope = $('<div></div>');
  for (const node of nodes) boundedScope.append($(node).clone());

  if (boundedScope.find('a[href*="/book/"], a[href*="/comic/"]').length) {
    return boundedScope;
  }

  for (const element of heading.parents().toArray()) {
    const scope = $(element);
    if (scope.is('html, body')) break;
    if (scope.find('a[href*="/book/"], a[href*="/comic/"]').length) return scope;
  }

  return heading.parent();
}

function parseHomepage(html) {
  const $ = cheerio.load(html);
  const output = {
    weekly: [],
    featured: [],
    ranking: [],
    new_arrivals: [],
    completed: [],
  };

  for (const section of SECTION_DEFINITIONS) {
    const heading = findSectionHeading($, section.labels);
    if (!heading) continue;

    output[section.key] = parseBooksFromScope($, getSectionScope($, heading));
  }

  return output;
}

function assertPublicHtml(status, html) {
  const lower = String(html || '').toLowerCase();
  const blocked =
    status === 403 ||
    lower.includes('just a moment') ||
    lower.includes('cf-chl') ||
    lower.includes('cloudflare');

  if (!blocked) return;

  throw new Error(
    'WebNovel did not return publicly parseable homepage HTML for this request. ' +
      'The response appears to be a protection/challenge page, so the script stopped without bypassing it.'
  );
}

async function fetchHomepage(url = DEFAULT_URL) {
  const response = await axios.get(url, {
    responseType: 'text',
    validateStatus: () => true,
    timeout: 15000,
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'NovelCenterEducationalScraper/1.0 (+https://www.webnovel.com)',
    },
  });

  assertPublicHtml(response.status, response.data);

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Unexpected HTTP status ${response.status} while fetching ${url}`);
  }

  return response.data;
}

function parseArgs(argv) {
  const args = {
    url: DEFAULT_URL,
    input: '',
    out: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--url') {
      args.url = argv[index + 1] || DEFAULT_URL;
      index += 1;
      continue;
    }

    if (arg === '--input') {
      args.input = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (arg === '--out') {
      args.out = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (!arg.startsWith('--')) {
      args.url = arg;
    }
  }

  return args;
}

async function loadHtml(args) {
  if (args.input) {
    return fs.readFile(args.input, 'utf8');
  }

  return fetchHomepage(args.url);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const html = await loadHtml(args);
  const data = parseHomepage(html);
  const json = JSON.stringify(data, null, 2);

  if (args.out) {
    await fs.writeFile(args.out, `${json}\n`, 'utf8');
    console.log(`Saved WebNovel data to ${args.out}`);
    return;
  }

  console.log(json);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  parseHomepage,
  fetchHomepage,
  parseArgs,
};
