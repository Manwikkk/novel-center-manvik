/** Comments shown in threads — excludes deleted (and hidden) entries. */
export function visibleComments(list) {
  const visible = (list || []).filter((c) => c.status === 'visible');
  const ids = new Set(visible.map((c) => c.id));
  return visible.filter((c) => !c.parentId || ids.has(c.parentId));
}

export function buildCommentTree(list) {
  const filtered = visibleComments(list);
  const map = new Map();
  filtered.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots = [];
  filtered.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId).children.push(map.get(c.id));
    else roots.push(map.get(c.id));
  });
  const sortRec = (arr) => {
    arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}
