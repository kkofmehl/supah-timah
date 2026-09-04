/** Move an item one step up (-1) or down (+1). Returns the original array if out of bounds. */
export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const newIndex = index + direction;
  if (index < 0 || index >= items.length) return items;
  if (newIndex < 0 || newIndex >= items.length) return items;

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(newIndex, 0, item!);
  return next;
}
