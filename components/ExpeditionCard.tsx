import Link from 'next/link'

interface Props {
  id: number
  name: string
  date_start: string
  county: string | null
  region: string | null
  leader: string | null
}

export function ExpeditionCard({ id, name, date_start, county, region, leader }: Props) {
  return (
    <Link href={`/expedition/${id}`} className="exp-card">
      <div className="exp-card-name">{name}</div>
      <div className="exp-card-meta">
        <span>{date_start}</span>
        {county && <span>{county}{region ? ` · ${region}` : ''}</span>}
        {leader && <span>{leader}</span>}
      </div>
    </Link>
  )
}
