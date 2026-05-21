import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="navbar">
      <Link href="/" className="navbar-logo">成大山協</Link>
      <Link href="/" className="navbar-link">出隊紀錄</Link>
    </nav>
  )
}
