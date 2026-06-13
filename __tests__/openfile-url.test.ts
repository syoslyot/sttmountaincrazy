import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { openFile } from '../lib/openFile'

describe('openFile URL construction', () => {
  let opened: string[]

  beforeEach(() => {
    opened = []
    vi.stubGlobal('window', {
      open: (url: string) => { opened.push(url) },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds bucket/path/displayName URL', () => {
    openFile('35/track.gpx', '丹大溫泉.gpx', 'records')
    expect(opened[0]).toBe('/api/file/records/35/track.gpx/%E4%B8%B9%E5%A4%A7%E6%BA%AB%E6%B3%89.gpx')
  })

  it('encodes the display name', () => {
    openFile('1/a.pdf', 'plan 2024?.pdf', 'previews')
    expect(opened[0]).not.toContain('?')
    expect(opened[0]).not.toContain(' ')
  })

  it('keeps the file path routable when it contains reserved URL characters', () => {
    // filePath is interpolated without per-segment encoding; '#' or '?'
    // in a stored path would truncate the route on the client
    openFile('35/地圖 v2.jpg', 'map.jpg', 'maps')
    const url = new URL(opened[0], 'http://localhost')
    expect(url.hash).toBe('')
    expect(url.search).toBe('')
    expect(url.pathname.startsWith('/api/file/maps/35/')).toBe(true)
  })

  it('does not let "#" in the path truncate the URL', () => {
    openFile('35/route#1.gpx', 'route.gpx', 'records')
    const url = new URL(opened[0], 'http://localhost')
    // desired: the whole path reaches the API route
    expect(url.pathname).toContain('route')
    expect(url.pathname).toContain('1.gpx')
  })
})
