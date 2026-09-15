/**
 * How a member uses Novel Centre — chosen at sign-up and changeable in Settings.
 *
 *   reader  → reading navigation (Browse, Library, Ranking)
 *   creator → author studio first (Dashboard, My novels, Create, Income)
 *   both    → reading navigation plus a Studio menu
 *
 * The API stores it on the user (`experience`); accounts created before the
 * field existed fall back to their role.
 */
export const EXPERIENCE_OPTIONS = [
  { value: 'reader', label: 'Read', hint: 'Discover novels, build your library, follow authors.', icon: 'auto_stories' },
  { value: 'creator', label: 'Write', hint: 'Publish chapters, track readers and earnings.', icon: 'edit_note' },
  { value: 'both', label: 'Read & write', hint: 'Reader tools and the author studio, side by side.', icon: 'auto_awesome' },
];

export function experienceOf(user) {
  if (!user) return 'reader';
  if (['reader', 'creator', 'both'].includes(user.experience)) return user.experience;
  return user.role === 'author' || user.role === 'admin' ? 'both' : 'reader';
}

/** Role the API assigns for an experience choice at sign-up. */
export function roleForExperience(experience) {
  return experience === 'creator' || experience === 'both' ? 'author' : 'user';
}

/** Author studio available and wanted (creator / both experiences on an author account). */
export function isCreator(user) {
  if (!user) return false;
  const canWrite = user.role === 'author' || user.role === 'admin';
  return canWrite && experienceOf(user) !== 'reader';
}

/** Reading tools (library, continue reading) are part of every experience except creator-only. */
export function hasReaderTools(user) {
  return !!user && experienceOf(user) !== 'creator';
}

/** Where a member lands after signing in or registering. */
export function landingFor(user) {
  if (!user) return '/';
  if (user.role === 'admin') return '/admin';
  return isCreator(user) && experienceOf(user) === 'creator' ? '/author' : '/';
}

export const STUDIO_LINKS = [
  { href: '/author', label: 'Dashboard', icon: 'space_dashboard', exact: true },
  { href: '/author/books', label: 'My novels', icon: 'menu_book' },
  { href: '/author/books/new', label: 'New novel', icon: 'add_circle' },
  { href: '/author/earnings', label: 'Income', icon: 'payments' },
];

/**
 * Primary (top bar) navigation for a member. Items with `menu` render as a
 * dropdown containing the given links.
 */
export function primaryNavFor(user) {
  if (!user) {
    return [
      { href: '/discover', label: 'Browse' },
      { href: '/ranking', label: 'Ranking' },
      { href: '/author/books/new', label: 'Create' },
    ];
  }
  const exp = experienceOf(user);
  if (isCreator(user) && exp === 'creator') {
    return [
      { href: '/author', label: 'Dashboard', exact: true },
      { href: '/author/books', label: 'My novels' },
      { href: '/author/books/new', label: 'Create' },
      { href: '/author/earnings', label: 'Income' },
      { href: '/discover', label: 'Browse' },
    ];
  }
  if (isCreator(user)) {
    return [
      { href: '/discover', label: 'Browse' },
      { href: '/library', label: 'Library' },
      { href: '/ranking', label: 'Ranking' },
      { label: 'Studio', menu: STUDIO_LINKS, activePrefix: '/author' },
    ];
  }
  return [
    { href: '/discover', label: 'Browse' },
    { href: '/library', label: 'Library' },
    { href: '/ranking', label: 'Ranking' },
    { href: '/author/books/new', label: 'Create' },
  ];
}
