import { describe, it, expect } from 'vitest';
import { moveItem } from './moveItem';

describe('moveItem', () => {
  it('moves an item up', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
  });

  it('moves an item down', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });

  it('no-ops at the top when moving up', () => {
    const items = ['a', 'b', 'c'];
    expect(moveItem(items, 0, -1)).toBe(items);
  });

  it('no-ops at the bottom when moving down', () => {
    const items = ['a', 'b', 'c'];
    expect(moveItem(items, 2, 1)).toBe(items);
  });

  it('no-ops for out-of-range index', () => {
    const items = ['a', 'b'];
    expect(moveItem(items, -1, 1)).toBe(items);
    expect(moveItem(items, 5, -1)).toBe(items);
  });
});
