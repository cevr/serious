import { Router, Route } from "@solidjs/router"
import { AppLayout } from "@/components/layout"
import { Home, DeckDetail, Review, Stats } from "@/routes"

export function App() {
  return (
    <Router>
      <Route path="/decks/:deckId/review" component={Review} />
      <Route path="/" component={AppLayout}>
        <Route path="/" component={Home} />
        <Route path="/decks/:deckId" component={DeckDetail} />
        <Route path="/stats" component={Stats} />
      </Route>
    </Router>
  )
}
