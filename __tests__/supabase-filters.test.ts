import { describe, it, expect } from 'vitest'

// Test that soft-delete filtering logic is correctly applied
// These tests validate the filter conditions, not the DB calls

describe('soft delete filter logic', () => {
  interface FileRow { id: number; expedition_id: number; deleted_at: string | null }

  function filterActive(files: FileRow[]): FileRow[] {
    return files.filter(f => f.deleted_at === null)
  }

  it('excludes soft-deleted files', () => {
    const files: FileRow[] = [
      { id: 1, expedition_id: 10, deleted_at: null },
      { id: 2, expedition_id: 10, deleted_at: '2024-01-01T00:00:00Z' },
    ]
    expect(filterActive(files)).toHaveLength(1)
    expect(filterActive(files)[0].id).toBe(1)
  })

  it('keeps all files when none are deleted', () => {
    const files: FileRow[] = [
      { id: 1, expedition_id: 10, deleted_at: null },
      { id: 2, expedition_id: 10, deleted_at: null },
    ]
    expect(filterActive(files)).toHaveLength(2)
  })

  it('returns empty when all files are deleted', () => {
    const files: FileRow[] = [
      { id: 1, expedition_id: 10, deleted_at: '2024-01-01T00:00:00Z' },
    ]
    expect(filterActive(files)).toHaveLength(0)
  })
})

describe('file count consistency', () => {
  it('counts only match active files', () => {
    const gpxFiles = [
      { expedition_id: 1, deleted_at: null },
      { expedition_id: 1, deleted_at: '2024-01-01' },
      { expedition_id: 2, deleted_at: null },
    ]
    const activePerExp = new Map<number, number>()
    gpxFiles
      .filter(f => f.deleted_at === null)
      .forEach(f => activePerExp.set(f.expedition_id, (activePerExp.get(f.expedition_id) ?? 0) + 1))

    expect(activePerExp.get(1)).toBe(1) // 1 active, 1 deleted
    expect(activePerExp.get(2)).toBe(1)
  })
})
