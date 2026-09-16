'use strict';

/**
 * Deterministic chapter-prose generator for the showcase seed.
 *
 * Sentences are assembled from short fragments — an optional opener, a
 * (human) subject, a verb phrase and an object drawn from matching banks, plus
 * a tail — so combinations run into the millions and consecutive chapters
 * share almost no six-word runs. The platform's repeated-text guard treats a
 * paragraph as copied at 50 % shared shingles; this generator is validated in
 * the seed to stay far below it. A seeded RNG per chapter keeps output stable.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const stripThe = (s) => String(s).replace(/^the\s+/i, '');
// "the studio on the eleventh floor" → "the studio"; "platform four" → "platform four".
const lastNoun = (s) => {
  const head = stripThe(s).split(/\s+(?:on|at|in|of|behind|under|beneath|by|near)\s+/)[0];
  const words = head.split(/\s+/);
  const last = words[words.length - 1];
  if (/^(one|two|three|four|five|six|seven|eight|nine|ten)$/i.test(last) && words.length > 1) {
    return `${words[words.length - 2]} ${last}`;
  }
  return `the ${last}`;
};

// ── shared banks ─────────────────────────────────────────────────────────────

const WEATHER = ['a thin rain', 'a wind off the water', 'the last of the light', 'a cold that came up through the floor', 'heat that had not broken since noon', 'a fog at the far end of the street', 'a sky the colour of pewter', 'the first frost of the year', 'a low sun', 'a wet, patient dusk', 'a haze that flattened everything', 'weather that could not decide'];
const TIME = ['just after dawn', 'a little before midnight', 'in the dead middle of the afternoon', 'when the lamps came on', 'before anyone else was awake', 'as the bells rang the half hour', 'long past the hour for sleeping', 'at the grey edge of morning', 'at the tail end of the day', 'somewhere around noon', 'on the second evening', 'an hour after the rain stopped'];
const EMOTION = ['a tiredness that had nothing to do with sleep', 'something close to hope', 'the old, familiar dread', 'a calm {she} did not trust', 'an anger with no obvious target', 'relief, and then guilt about the relief', 'a curiosity that felt like hunger', 'the particular loneliness of being right', 'a stubbornness {she} had inherited', 'the quiet after a decision', 'a patience {she} was not sure {she} had', 'the sense of a page being turned'];
const SOUND = ['the creak of a door below', 'water moving where it should not', 'footsteps that stopped when {hers} did', 'a distant, patient tapping', 'the hum of something old and electrical', 'laughter from a room {she} could not see', 'a bell, once, and then nothing', 'paper being folded carefully', 'a chair scraping overhead', 'the wind finding a gap', 'a voice, too far to place', 'the small noises a building makes at night'];
const SMALL = ['a cup gone cold on the sill', 'a chair pushed back from the table', 'a coat on the wrong hook', 'a line of light under the door', 'a stain shaped like a coastline', 'a chipped saucer nobody would throw away', 'a note pinned over an older note', 'a key that fitted nothing', 'two glasses, one unused', 'a lamp left burning', 'a bootprint drying on the boards', 'a page torn at the corner'];
const GESTURE = ['pressed a thumb into {her} palm', 'counted the exits without meaning to', 'turned it over twice before speaking', 'let the silence run until it broke', 'looked anywhere but the door', 'folded the paper into quarters', 'breathed out slowly', 'checked the time and forgot it', 'set {her} shoulders', 'smoothed a page that was already flat', 'did not sit down', 'rubbed the ache out of one wrist'];
const OPENERS = ['', '', '', '', '', '', '', '', '', '', '', '', 'For a moment, ', 'Later, ', 'Without meaning to, ', 'After that, ', 'Eventually, ', 'Even so, ', 'By then, ', 'In the end, ', 'Instead, ', 'All the same, ', 'Then, ', 'Quietly, ', 'For once, ', 'Against {her} better judgement, ', 'Somewhere below, ', 'Twice more, ', 'Halfway through, '];

// human subjects only
const PEOPLE = ['{hero}', '{hero}', '{hero}', '{she}', '{ally}', '{ally}', '{rival}', '{mentor}', 'one of {group}', 'the two of them', 'neither of them'];

// physical verb + physical object
const ACT_VERBS = ['reached for', 'picked up', 'put down', 'carried', 'set aside', 'held on to', 'turned over', 'went back for', 'left behind', 'pushed away', 'hid', 'found', 'lost', 'wrapped up', 'kept hold of', 'passed across', 'checked', 'opened', 'closed', 'lifted', 'weighed', 'counted'];
const ACT_OBJECTS = ['{object}', '{object}', '{object2}', 'the lamp', 'the map', 'a coat', '{her} bag', 'the last of the bread', 'the letter', 'a candle', 'the ledger', 'the door', 'the shutter', 'the {noun}', 'the {noun}', 'a chipped cup', 'the blanket', 'the note', 'the box'];

// thought / perception verb + abstract object
const THINK_VERBS = ['thought about', 'could not stop thinking about', 'kept returning to', 'had learned to distrust', 'refused to name', 'remembered', 'argued with {herself} about', 'made peace with', 'had already forgotten', 'listened for', 'waited for', 'was afraid of', 'said nothing about', 'was ready for', 'had stopped expecting', 'circled', 'wanted', 'doubted', 'tried not to hear', 'understood, finally,'];
const THINK_OBJECTS = ['the question nobody had asked', 'what {ally} had said', 'the shape of the morning', 'the wrong answer', 'the name on the stone', 'the sound from {p2}', 'a promise made {time}', 'the thing under the table', 'the {noun}', 'the {motif}', 'the way the light fell in {p1}', 'the {creature}', 'whatever came next', 'the version of tonight that was not this one', '{rival}’s silence', 'the last thing {mentor} said', 'the door at the end of {p3}', 'the arithmetic of it', 'the {noun} again', 'the cost of being right'];

// movement verb + place
const MOVE_VERBS = ['crossed', 'went down to', 'came back from', 'stood at the edge of', 'waited at', 'walked the length of', 'circled', 'avoided', 'returned to', 'left', 'watched from', 'reached'];
const PLACES = ['{p1}', '{p2}', '{p3}', '{p1}', '{p2}', 'the far door', 'the stair', 'the window', 'the yard', 'the road'];

const TAILS = ['', '', '', '', ', and the day went on regardless', ' before the light changed', ', which was its own kind of answer', ' until {ally} spoke', ', and did not explain', ' the way {she} always did', ', as if it might change its mind', ' for the third time that week', ', and something in {p1} shifted', ' with more care than the moment deserved', ', slowly', ' while the {creature} watched', ', and the {motif} closed over it', ' without a word', ', and that was that', ' because there was nothing else to do', ', mostly to have something to do with {her} hands', ' the way you might hold a bird'];

const ENV_SUBJ = ['the light in {p1}', 'the {motif}', 'the {creature}', '{weather}', 'the quiet', 'the whole of {p2}', 'the cold', 'the room', 'the hour', 'the {noun}'];
const ENV_VERBS = ['had gone thin', 'settled over everything', 'kept its own counsel', 'moved, or seemed to', 'waited', 'did not change', 'found the gaps', 'gathered at the edges', 'came and went', 'held', 'pressed in', 'thinned to nothing'];
const ENV_TAILS = [' by the time {she} looked up.', ', as it had every night that week.', ' until {sound}.', ', and nobody remarked on it.', ' in the way of old places.', ', which {mentor} would have called a sign.', '.', ' while they worked.', ' long after they had stopped talking.', ', indifferent to all of them.'];

const OPEN_SUBJ = ['{Hero} woke {time}', 'It was {time} when {hero} reached {p1}', 'The day began {time}', '{Hero} came down to {p1} {time}', 'Nobody had warned {hero} about {p2}', 'There was {small} in {p1}', '{Hero} found {ally} at {p3}', 'By {time} {weather} had settled over {p1}', '{Ally} was already at {p2}', 'The {creature} were the first sign', 'Morning, when it came, came sideways', '{Hero} had not slept'];
const OPEN_TAIL = [', and {sound} followed {herO} in.', ' to {sound}.', ', with {weather} at {her} back.', ', and {she} knew at once that {ally} had been there.', ', and the {creature} had gone quiet.', '. {Small}; nothing else.', ', which was not where {she} had left {herO}.', ', carrying {emotion}.', ', and the {motif} was everywhere.', ', {time}, with {small} for company.'];

const LINES = ['You came back.', 'Tell me what you saw.', 'Not here.', 'How long?', 'Say it plainly.', 'I said I would.', 'That is not the problem.', 'It moved.', 'Sit down.', 'We are out of time.', 'Look at the door.', 'Again.', 'You knew.', 'Only when it matters.', 'Then we go now.', 'Leave it.', 'Count them.', 'I heard it too.', 'Do not open that.', 'Tomorrow, then.', 'It was never the {motif}.', 'Ask {mentor}.', '{Rival} is here.', 'Give me {object}.', 'Wait.', 'I am not asking.', 'Since when?', 'You are shaking.', 'Read it again.', 'That was not there this morning.', 'Nobody sent for you.', 'Keep your voice down.'];
const SAID = ['{ally} said', 'said {hero}', '{hero} said, not turning', '{ally} said, too quickly', 'said {mentor}', '{rival} said', 'said {ally}, after a while', '{hero} said', 'said {rival}, pleasantly', '{mentor} said, without looking up'];
const AFTER_LINE = ['', '', '', ' {She} {gesture}.', ' The words sat in {p1} a moment.', ' Outside, {sound}.', ' Neither of them moved.', ' {Ally} {gesture}.', ' Nobody laughed.', ' It was not a question.'];

const INTERIORS = [
  'There was a version of tonight in which {she} walked away from {object}, and it was not this one.',
  'Some part of {herO} was still in {p3}, listening to {sound}.',
  'What {she} felt, mostly, was {emotion}, and beneath it the knowledge that the work was not done.',
  'The trouble with the {motif} was that it got into everything, even the words you had meant to say.',
  'It would have been easier to be afraid; fear at least told you where to stand.',
  'Somewhere between {p1} and {p2} the story changed shape, and only {she} noticed.',
  '{She} had assumed that {p1} would be the end of it, and it looked like the beginning.',
  'The thing about {ally} was that {he2} noticed first and said so last.',
  'If {mentor} had been there, {she} would have been told to eat something first.',
  'The honest answer was that {she} did not know, and had not for some time.',
  '{She} had a rule about {p3}, and tonight {she} broke it.',
  'Whatever {rival} wanted, it was not this, and that was the frightening part.',
  '{She} was carrying {emotion} and had been since {time}, without once setting it down.',
  'There are things you learn in {p1} that you cannot unlearn in {p2}.',
  'It occurred to {herO}, not for the first time, that {ally} had been right.',
  'Nothing about {object} had changed. Everything about the way {she} held it had.',
];

const TRANSITIONS = ['Later, {time}, {weather} had cleared and the argument had not.', 'They did not speak again until {p3}.', 'The rest of the hour went the way hours do when nobody wants to move first.', 'Afterwards there was tea, because {mentor} had trained them too well for there not to be.', 'It took the better part of the evening to say the next thing.', 'The {creature} settled; the {motif} did not.', 'A door opened somewhere and closed again, and the moment went with it.', 'Nothing happened for a while, which was its own kind of event.'];
const CLOSERS = ['When {hero} finally slept, {object} was still within reach, and {sound} had stopped, and neither felt like an ending.', 'Behind {herO}, in {p3}, something began — very quietly — to count.', '{Ally} was still at the window when the light went. “Tomorrow,” {he2} said, and {hero} let the word stand.', 'The {creature} had gone. The {motif} remained. {Hero} wrote both down, because that was the job.', 'It was {time}. It had been {time} for a long while, and {p1} seemed to prefer it that way.', '{Hero} did not look back at {p2}. Looking back, {mentor} always said, was how a place learned your face.', '{Rival} would know by morning. {Hero} found, to {her} surprise, that {she} wanted that.', 'The last thing {she} heard before sleep was {sound}, and the last thing {she} thought was {ally}’s name.', '{Hero} left the lamp burning. Some nights you did.'];
const BEAT_FRAMES = ['That was the shape of the day: {beat}', 'By nightfall it was simple enough to say, if not to believe. {beat}', 'Later {hero} would put it in a single line, and the line was this: {beat}', '{Ally} said it first, because somebody had to. {beat}', 'It came down to one thing, and {hero} turned it over until it was smooth. {beat}', 'Written down, it looked almost reasonable. {beat}'];

const GENRE = {
  fantasy: { nouns: ['old road', 'ward-stones', 'sending', 'river crossing', 'bone lanterns', 'third watch', 'sworn word', 'tithe', 'hollow hills', 'salt line', 'bell-rope', 'oath-mark'] },
  scifi: { nouns: ['telemetry', 'airlock cycle', 'recalculated burn', 'pressure seal', 'backup array', 'cold-sleep schedule', 'hull ping', 'reserve tank', 'comms window', 'coolant loop', 'manifest', 'checklist'] },
  romance: { nouns: ['late shift', 'shared umbrella', 'last table by the window', 'unsent message', 'second cup', 'borrowed jacket', 'wrong bus', 'walk back', 'playlist', 'rooftop', 'text {she} deleted', 'spare seat'] },
  mystery: { nouns: ['timeline', 'second set of prints', 'missing hour', 'stairwell camera', 'receipt', 'neighbour’s statement', 'inventory', 'bank draft', 'locked drawer', 'evidence bag', 'appointment book', 'bus ticket'] },
  thriller: { nouns: ['second exit', 'dropped call', 'fire stairs', 'burner', 'last camera on the block', 'licence plate', 'service corridor', 'count', 'safe word', 'dead line', 'spare magazine', 'route out'] },
  literary: { nouns: ['empty platform', 'borrowed word', 'space between trains', 'grandmother’s handwriting', 'shape of a week', 'returned thing', 'last light in the shop', 'name said twice', 'folded map', 'timetable', 'unopened envelope', 'season'] },
  historical: { nouns: ['customs ledger', 'morning tide', 'sealed dispatch', 'mission bell', 'quay-side crane', 'carbon copy', 'governor’s carriage', 'wet season', 'bill of lading', 'harbour master', 'muster roll', 'ink pot'] },
};

function ctxFor(book, beat) {
  const w = book.world;
  const male = book.leadingGender === 'male';
  const genre = GENRE[book.tone] || GENRE.literary;
  return {
    hero: w.hero, ally: w.ally, rival: w.rival, mentor: w.mentor, group: w.group,
    p1: lastNoun(w.place), p2: lastNoun(w.place2), p3: lastNoun(w.place3),
    object: w.object, object2: w.object2, motif: stripThe(w.motif), creature: stripThe(w.creature),
    beat,
    noun: genre.nouns,
    weather: WEATHER, time: TIME, emotion: EMOTION, sound: SOUND, small: SMALL, gesture: GESTURE,
    she: male ? 'he' : 'she', her: male ? 'his' : 'her', herO: male ? 'him' : 'her', hers: male ? 'his' : 'hers',
    herself: male ? 'himself' : 'herself', he2: 'she',
  };
}

function fill(template, ctx, rng, depth = 0) {
  return template.replace(/\{(\w+)\}/g, (_m, key) => {
    const lower = key.charAt(0).toLowerCase() + key.slice(1);
    let value = ctx[lower];
    if (value === undefined) return key;
    if (Array.isArray(value)) value = pick(rng, value);
    if (depth < 3 && /\{\w+\}/.test(value)) value = fill(value, ctx, rng, depth + 1);
    return key.charAt(0) === key.charAt(0).toUpperCase() ? cap(value) : value;
  });
}

function actSentence(ctx, rng) {
  const kind = rng();
  let core;
  if (kind < 0.36) core = `${pick(rng, PEOPLE)} ${pick(rng, ACT_VERBS)} ${pick(rng, ACT_OBJECTS)}`;
  else if (kind < 0.72) core = `${pick(rng, PEOPLE)} ${pick(rng, THINK_VERBS)} ${pick(rng, THINK_OBJECTS)}`;
  else core = `${pick(rng, PEOPLE)} ${pick(rng, MOVE_VERBS)} ${pick(rng, PLACES)}`;
  const s = `${pick(rng, OPENERS)}${core}${pick(rng, TAILS)}.`;
  const out = cap(fill(s, ctx, rng));
  // Avoid "Vikram thought about Vikram's silence".
  const names = [ctx.hero, ctx.ally, ctx.rival, ctx.mentor].filter(Boolean);
  const dup = names.some((n) => out.split(n).length > 2);
  return dup ? actSentence(ctx, rng) : out;
}

function envSentence(ctx, rng) {
  return cap(fill(`${pick(rng, ENV_SUBJ)} ${pick(rng, ENV_VERBS)}${pick(rng, ENV_TAILS)}`, ctx, rng));
}

function dialogue(ctx, rng) {
  const lines = 1 + Math.floor(rng() * 3);
  const out = [];
  for (let i = 0; i < lines; i += 1) {
    const line = fill(pick(rng, LINES), ctx, rng);
    const said = fill(pick(rng, SAID), ctx, rng);
    const after = fill(pick(rng, AFTER_LINE), ctx, rng);
    const trimmed = line.replace(/[.]$/, '');
    out.push(rng() < 0.55 ? `“${trimmed},” ${said}.${after}` : `${cap(said)}, “${line}”${after}`);
  }
  return out;
}

function interior(ctx, rng) {
  return cap(fill(pick(rng, INTERIORS), ctx, rng));
}

function opener(ctx, rng) {
  return cap(`${fill(pick(rng, OPEN_SUBJ), ctx, rng)}${fill(pick(rng, OPEN_TAIL), ctx, rng)}`);
}

function wordCount(text) {
  return text.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

/**
 * Build one chapter's HTML.
 * @param {object} book   showcase book definition (world, tone, slug, leadingGender)
 * @param {number} idx    chapter number (1-based)
 * @param {string} beat   arc line for the chapter
 * @param {number} target approximate word count
 */
function generateChapterHtml(book, idx, beat, target = 1200) {
  const rng = mulberry32(hashString(`${book.slug}#${idx}`));
  const ctx = ctxFor(book, beat);
  const paragraphs = [];

  paragraphs.push([opener(ctx, rng), actSentence(ctx, rng), envSentence(ctx, rng), interior(ctx, rng)].join(' '));

  const kinds = ['prose', 'dialogue', 'prose', 'interior', 'prose', 'dialogue', 'transition', 'prose', 'interior', 'dialogue', 'prose', 'env'];
  let cycle = 0;
  let words = wordCount(paragraphs.join(' '));
  while (words < target - 80 && cycle < 70) {
    const kind = kinds[cycle % kinds.length];
    cycle += 1;
    if (kind === 'prose') {
      const n = 3 + Math.floor(rng() * 3);
      const lines = [];
      for (let i = 0; i < n; i += 1) lines.push(rng() < 0.22 ? envSentence(ctx, rng) : actSentence(ctx, rng));
      if (rng() < 0.3) lines.push(interior(ctx, rng));
      paragraphs.push(lines.join(' '));
    } else if (kind === 'dialogue') {
      paragraphs.push(...dialogue(ctx, rng));
    } else if (kind === 'interior') {
      paragraphs.push(`${interior(ctx, rng)} ${actSentence(ctx, rng)} ${actSentence(ctx, rng)}`);
    } else if (kind === 'env') {
      paragraphs.push(`${envSentence(ctx, rng)} ${actSentence(ctx, rng)}`);
    } else {
      paragraphs.push(fill(pick(rng, TRANSITIONS), ctx, rng));
    }
    if (cycle === 4) paragraphs.push(fill(pick(rng, BEAT_FRAMES), ctx, rng));
    words = wordCount(paragraphs.join(' '));
  }
  paragraphs.push(fill(pick(rng, CLOSERS), ctx, rng));

  const html = paragraphs.map((p) => `<p>${p}</p>`).join('');
  return { html, wordCount: wordCount(html) };
}

/** Occasional author's note under a chapter. */
function authorThought(book, idx) {
  const rng = mulberry32(hashString(`${book.slug}-thought-${idx}`));
  const w = book.world;
  const notes = [
    `Thank you for reading. Chapter ${idx + 1} is drafted and goes up on schedule — tell me in the comments what you think ${w.hero} should do next.`,
    `This chapter took three rewrites. The ${stripThe(w.motif)} imagery kept getting away from me. Let me know if it landed.`,
    `A quieter one this week. Big things coming in ${w.place3}.`,
    'If you have made it this far: thank you, genuinely. Reviews and ratings keep the serial on the front page.',
    `Fun fact: ${w.place} is based on a real place I visited last year. The ${stripThe(w.creature)} are real too.`,
  ];
  return pick(rng, notes);
}

module.exports = { generateChapterHtml, authorThought, mulberry32, hashString, pick };
