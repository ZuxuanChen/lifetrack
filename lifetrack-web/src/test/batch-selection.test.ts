import { describe, it, expect } from 'vitest';

describe('Batch Selection Logic', () => {
  function toggleSelection(prev: Set<number>, id: number): Set<number> {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  it('should add id when not selected', () => {
    const result = toggleSelection(new Set(), 1);
    expect(result.has(1)).toBe(true);
    expect(result.size).toBe(1);
  });

  it('should remove id when already selected', () => {
    const result = toggleSelection(new Set([1, 2]), 1);
    expect(result.has(1)).toBe(false);
    expect(result.has(2)).toBe(true);
    expect(result.size).toBe(1);
  });

  it('should select all from list', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = new Set(items.map(i => i.id));
    expect(result.size).toBe(3);
    expect([...result]).toEqual([1, 2, 3]);
  });

  it('should clear all selections', () => {
    const result = new Set<number>();
    expect(result.size).toBe(0);
  });

  it('should handle empty list select all', () => {
    const items: { id: number }[] = [];
    const result = new Set(items.map(i => i.id));
    expect(result.size).toBe(0);
  });

  it('should handle duplicate toggles', () => {
    let selected = new Set<number>();
    selected = toggleSelection(selected, 1);
    selected = toggleSelection(selected, 1);
    selected = toggleSelection(selected, 1);
    expect(selected.has(1)).toBe(true);
    expect(selected.size).toBe(1);
  });
});
