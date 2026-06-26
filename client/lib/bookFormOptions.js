export const BOOK_TYPES = [
  { value: 'novel', label: 'Novel' },
  { value: 'fan_fic', label: 'Fan-fic' },
];

export const LEADING_GENDERS = [
  { value: 'male', label: 'Male oriented' },
  { value: 'female', label: 'Female oriented' },
];

export const GENRE_OPTIONS = {
  male: [
    { value: 'urban', label: 'Urban(-Male Oriented)' },
    { value: 'fantasy', label: 'Fantasy(-Male Oriented)' },
    { value: 'history', label: 'History(-Male Oriented)' },
    { value: 'horror', label: 'Horror(-Male Oriented)' },
    { value: 'sci_fi', label: 'Sci-fi(-Male Oriented)' },
    { value: 'sports', label: 'Sports(-Male Oriented)' },
    { value: 'games', label: 'Games(-Male Oriented)' },
  ],
  female: [
    { value: 'urban', label: 'Urban(-Female Oriented)' },
    { value: 'fantasy', label: 'Fantasy(-Female Oriented)' },
    { value: 'history', label: 'History(-Female Oriented)' },
    { value: 'horror', label: 'Horror(-Female Oriented)' },
    { value: 'sci_fi', label: 'Sci-fi(-Female Oriented)' },
    { value: 'sports', label: 'Sports(-Female Oriented)' },
    { value: 'games', label: 'Games(-Female Oriented)' },
  ],
};

export const BOOK_LENGTHS = [
  { value: 'novels', label: 'Novels' },
  { value: 'short_stories', label: 'Short Stories' },
];

export const WARNING_NOTICES = [
  { value: 'general_audiences', label: 'General Audiences' },
  { value: 'parental_guidance', label: 'Parental Guidance Suggested' },
  { value: 'parents_cautioned', label: 'Parents Strongly Cautioned' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'no_one_17', label: 'No One 17 and Under Admitted' },
];

export const TITLE_MAX = 70;

export function genreLabel(genre, leadingGender) {
  if (!genre || !leadingGender) return '';
  return GENRE_OPTIONS[leadingGender]?.find((g) => g.value === genre)?.label || genre;
}

export const PUBLISH_CHOICES = [
  { value: 'draft', label: 'Save as draft', hint: 'Only you can see it. Publish when you are ready.' },
  { value: 'published', label: 'Publish now', hint: 'Make it visible to readers on Novel Centre.' },
];

export function emptyBookForm(book) {
  return {
    title: book?.title || '',
    synopsis: book?.synopsis || '',
    bookType: book?.bookType || 'novel',
    leadingGender: book?.leadingGender || 'male',
    genre: book?.genre || '',
    languageId: book?.languageId != null ? String(book.languageId) : '',
    categoryId: book?.categoryId != null ? String(book.categoryId) : '',
    contentTagIds: new Set((book?.contentTags || []).map((t) => t.id)),
    bookLength: book?.bookLength || '',
    warningNotice: book?.warningNotice || '',
    publishChoice: book?.status === 'published' ? 'published' : 'draft',
  };
}

/** Metadata fields only — status is set at create or via publish bar on edit. */
export function formToPayload(form, { includeStatus = false } = {}) {
  const payload = {
    title: form.title.trim(),
    synopsis: form.synopsis.trim(),
    bookType: form.bookType,
    leadingGender: form.leadingGender,
    genre: form.genre || null,
    languageId: form.languageId ? Number(form.languageId) : null,
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    contentTagIds: Array.from(form.contentTagIds),
    bookLength: form.bookLength || null,
    warningNotice: form.warningNotice || null,
  };
  if (includeStatus) {
    payload.status = form.publishChoice === 'published' ? 'published' : 'draft';
  }
  return payload;
}
