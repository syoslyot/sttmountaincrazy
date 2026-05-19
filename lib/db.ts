import Database from 'better-sqlite3'
import path from 'path'

const _dbName = (process.env.DB_ENV ?? process.env.NODE_ENV) === 'production' ? 'sttmountain.db' : 'sttmountain_dev.db'
const DB_PATH = path.resolve(process.cwd(), `../sttmountain/db/${_dbName}`)

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: true })
  }
  return _db
}

export interface Expedition {
  id: number
  name: string
  date_start: string
  date_end: string | null
  county: string | null
  region: string | null
  region_exit: string | null
  leader: string | null
  description: string | null
  preview_image: string | null
  created_at: string
  all_counties: string | null
  gpx_paths: string | null
}

export interface ExpeditionDetail extends Expedition {
  records: { filename: string; content: string }[]
}
