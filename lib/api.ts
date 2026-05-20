const STTMOUNTAIN_URL = (process.env.STTMOUNTAIN_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export function sttFetch(path: string): Promise<Response> {
  return fetch(`${STTMOUNTAIN_URL}${path}`)
}
