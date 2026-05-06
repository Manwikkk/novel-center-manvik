'use strict';

const fs = require('fs/promises');

function sectionKey(title) {
  return String(title || 'untitled')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getBookId(item) {
  return item.id || item.bookId || '';
}

function getTitle(item) {
  return item.name || item.bookName || '';
}

function isBook(item) {
  return Boolean(getBookId(item) && getTitle(item) && item.coverUpdateTime);
}

function coverImageUrl(item) {
  const id = getBookId(item);
  if (!id || !item.coverUpdateTime) return '';

  return `https://book-pic.webnovel.com/bookcover/${id}?imageMogr2/thumbnail/150x&imageId=${item.coverUpdateTime}`;
}

function normalizeBook(item) {
  const id = getBookId(item);

  return {
    title: getTitle(item),
    cover_image: coverImageUrl(item),
    link: `https://www.webnovel.com/book/${id}`,
    author: item.authorName || '',
    short_description: item.description || '',
    category: item.categoryName || '',
    score: item.score || '',
    chapter_num: item.chapterNum || 0,
    book_id: id,
    book_type: item.bookType ?? null,
  };
}

function normalizeWebnovelHome(response) {
  const result = {};
  const blocks = response?.data?.blockItems;

  if (!Array.isArray(blocks)) {
    throw new Error('Input JSON must contain data.blockItems from the WebNovel pcbookcity/page response.');
  }

  function addBooks(sectionTitle, books) {
    if (!books.length) return;

    const key = sectionKey(sectionTitle);
    result[key] = [...(result[key] || []), ...books];
  }

  function walk(node, currentSection) {
    if (!node || typeof node !== 'object') return;

    const nextSection = node.title || currentSection || 'untitled';
    const items = node.contentItems;

    if (!Array.isArray(items)) return;

    addBooks(nextSection, items.filter(isBook).map(normalizeBook));
    items.forEach((child) => walk(child, nextSection));
  }

  blocks.forEach((block) => walk(block, block.title));

  return result;
}

function parseArgs(argv) {
  const args = {
    input: '',
    out: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

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

    if (!arg.startsWith('--') && !args.input) {
      args.input = arg;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.input) {
    throw new Error('Usage: node scripts/normalize-webnovel-json.js --input webnovel-response.json --out webnovel-books.json');
  }

  const raw = await fs.readFile(args.input, 'utf8');
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error(`${args.input} is empty. Copy the JSON response body from DevTools > Network > Response, then paste it into this file.`);
  }

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    throw new Error(`${args.input} does not look like JSON. It starts with: ${JSON.stringify(trimmed.slice(0, 80))}`);
  }

  let response;

  try {
    response = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`Could not parse ${args.input} as JSON: ${error.message}`);
  }
  const normalized = normalizeWebnovelHome(response);
  const json = `${JSON.stringify(normalized, null, 2)}\n`;

  if (args.out) {
    await fs.writeFile(args.out, json, 'utf8');
    console.log(`Saved normalized WebNovel data to ${args.out}`);
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
  normalizeWebnovelHome,
};
