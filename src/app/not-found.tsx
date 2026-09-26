import Link from 'next/link'
export default function NotFound() {
  return (
    <div className="container empty-state">
      <p className="eyebrow">404 · SIDEN FINDES IKKE</p>
      <h1>Et lille sidespor.</h1>
      <p>Vi kan ikke finde siden. Lad os hjælpe dig videre til udvalget.</p>
      <Link className="button" href="/produkter">
        Udforsk produkter
      </Link>
    </div>
  )
}
