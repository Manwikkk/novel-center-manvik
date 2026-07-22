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
    { value: 'urban', label: 'Urban' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'history', label: 'History' },
    { value: 'horror', label: 'Horror' },
    { value: 'sci_fi', label: 'Sci-fi' },
    { value: 'sports', label: 'Sports' },
    { value: 'games', label: 'Games' },
  ],
  female: [
    { value: 'urban', label: 'Urban' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'history', label: 'History' },
    { value: 'horror', label: 'Horror' },
    { value: 'sci_fi', label: 'Sci-fi' },
    { value: 'sports', label: 'Sports' },
    { value: 'games', label: 'Games' },
  ],
};

export const BOOK_LENGTHS = [
  { value: 'novels', label: 'Novels' },
  { value: 'short_stories', label: 'Short stories' },
];

export const WARNING_NOTICES = [
  { value: 'general_audiences', label: 'General audiences' },
  { value: 'parental_guidance', label: 'Parental guidance' },
  { value: 'parents_cautioned', label: 'Parents cautioned' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'no_one_17', label: 'No one 17 and under' },
];

export const PUBLISH_CHOICES = [
  { value: 'draft', label: 'Save as draft' },
  { value: 'published', label: 'Publish now' },
];

export const TITLE_MAX = 70;

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
