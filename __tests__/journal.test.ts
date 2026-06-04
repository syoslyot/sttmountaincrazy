import { describe, it, expect } from 'vitest'
import { blocksToJournalDays, type JournalBlock } from '../components/themes/formal/FormalJournal'

describe('blocksToJournalDays', () => {
  it('returns empty array for empty input', () => {
    expect(blocksToJournalDays([])).toEqual([])
  })

  it('groups text blocks under their day header', () => {
    const blocks: JournalBlock[] = [
      { type: 'day', day: 'D1', label: '接駁', date: '07/06' },
      { type: 'text', text: '早上出發' },
      { type: 'text', text: '到登山口' },
      { type: 'day', day: 'D2', label: '上山', date: '07/07' },
      { type: 'text', text: '攻頂' },
    ]
    const days = blocksToJournalDays(blocks)
    expect(days).toHaveLength(2)
    expect(days[0].day).toBe('D1')
    expect(days[0].blocks).toHaveLength(2)
    expect(days[1].day).toBe('D2')
    expect(days[1].blocks).toHaveLength(1)
  })

  it('filters out day headers with no content and no day label', () => {
    const blocks: JournalBlock[] = [
      { type: 'day', day: '', label: '', date: '' },
    ]
    const days = blocksToJournalDays(blocks)
    // day is '' (falsy) and blocks.length is 0 — should be filtered out
    expect(days).toHaveLength(0)
  })

  it('keeps day headers that have a day label even with no content blocks', () => {
    const blocks: JournalBlock[] = [
      { type: 'day', day: 'D1', label: '', date: '07/06' },
      { type: 'day', day: 'D2', label: '上山', date: '07/07' },
      { type: 'text', text: '攻頂' },
    ]
    const days = blocksToJournalDays(blocks)
    // D1 has no content blocks, but day='D1' is truthy → kept
    // D2 has 1 content block → kept
    expect(days).toHaveLength(2)
    expect(days[0].day).toBe('D1')
    expect(days[0].blocks).toHaveLength(0)
    expect(days[1].blocks).toHaveLength(1)
  })

  it('handles blocks before first day header (orphans)', () => {
    const blocks: JournalBlock[] = [
      { type: 'text', text: '前言' },
      { type: 'day', day: 'D1', label: '', date: '07/06' },
    ]
    const days = blocksToJournalDays(blocks)
    // First group has no day label but has a text block → kept
    // D1 group has no content block but day='D1' truthy → kept
    expect(days).toHaveLength(2)
    expect(days[0].day).toBe('')
    expect(days[0].blocks).toHaveLength(1)
    expect(days[1].day).toBe('D1')
  })

  it('correctly sets label and date from day block', () => {
    const blocks: JournalBlock[] = [
      { type: 'day', day: 'D3', label: '茶茶牙頓主稜', date: '05/01' },
      { type: 'text', text: '長天' },
    ]
    const days = blocksToJournalDays(blocks)
    expect(days[0].label).toBe('茶茶牙頓主稜')
    expect(days[0].date).toBe('05/01')
  })

  it('handles image and twincol block types', () => {
    const blocks: JournalBlock[] = [
      { type: 'day', day: 'D1', label: '', date: '07/06' },
      { type: 'image', cap: '山頂' },
      { type: 'twincol', a: { cap: '左' }, b: { cap: '右' } },
    ]
    const days = blocksToJournalDays(blocks)
    expect(days[0].blocks).toHaveLength(2)
    expect(days[0].blocks[0].type).toBe('image')
    expect(days[0].blocks[1].type).toBe('twincol')
  })
})
