import { A, useLocation } from "@solidjs/router"
import "./Header.css"

export function Header() {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/"
    return location.pathname.startsWith(path)
  }

  return (
    <header class="header">
      <A href="/" class="header__logo">
        <span class="header__logo-text">Serious</span>
        <span class="header__logo-tagline">SRS</span>
      </A>

      <nav class="header__nav" aria-label="Main navigation">
        <A
          href="/"
          class="header__link"
          data-active={isActive("/") && !isActive("/stats") ? "" : undefined}
        >
          Decks
        </A>
        <A
          href="/stats"
          class="header__link"
          data-active={isActive("/stats") ? "" : undefined}
        >
          Statistics
        </A>
      </nav>
    </header>
  )
}
