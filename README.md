# Serious

A full-featured **Spaced Repetition System (SRS)** for language learning built with modern TypeScript and the Effect ecosystem.

## Features

- **FSRS-6 Algorithm** - Industry-standard spaced repetition scheduling with 21 configurable weights
- **Fluent Forever Methodology** - Personal notes and diverse card types for enhanced memory
- **Multi-Card Types** - Basic, minimal-pair, cloze, image-word, IPA, and spelling cards
- **Media Support** - Audio references and images for immersive learning
- **Analytics** - Retention tracking, daily progress, and streak monitoring
- **Multi-Client** - Web UI, CLI, and TUI interfaces sharing a common core

## Architecture

```
serious/
├── packages/
│   ├── core/          # Business logic & FSRS algorithm
│   ├── api/           # HTTP API definitions
│   └── shared/        # Shared types & schemas
├── apps/
│   ├── server/        # HTTP server (port 3000)
│   ├── web/           # SolidJS web UI (port 5173)
│   ├── cli/           # Command-line interface
│   └── tui/           # Terminal UI
└── turbo.json         # Monorepo config
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Monorepo | Turborepo + Bun workspaces |
| Core Logic | Effect TypeScript |
| Validation | @effect/schema |
| HTTP Server | @effect/platform |
| Database | SQLite (Bun native) |
| Web UI | SolidJS + Vite |
| CLI | @effect/cli |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+

### Installation

```bash
# Clone the repository
git clone https://github.com/cvr/serious.git
cd serious

# Install dependencies
bun install
```

### Development

```bash
# Start the API server
cd apps/server && bun run dev

# In another terminal, start the web UI
cd apps/web && bun run dev
```

- Web UI: http://localhost:5173
- API Server: http://localhost:3000

### CLI Usage

```bash
# Build the CLI
cd apps/cli && bun run build

# Run commands
srs deck list
srs stats
srs review start <deck-id>
```

## API Endpoints

### Decks
- `GET /decks` - List all decks
- `POST /decks` - Create a deck
- `GET /decks/:id` - Get deck details
- `GET /decks/:id/stats` - Get deck statistics
- `PATCH /decks/:id` - Update deck
- `DELETE /decks/:id` - Delete deck

### Cards
- `GET /decks/:id/cards` - List cards (with pagination, filtering)
- `POST /decks/:id/cards` - Create card
- `GET /cards/:id` - Get card
- `PATCH /cards/:id` - Update card
- `DELETE /cards/:id` - Delete card

### Reviews
- `GET /decks/:id/due` - Get cards due for review
- `POST /cards/:id/review` - Submit review rating
- `GET /cards/:id/history` - Get review history

### Statistics
- `GET /stats` - Aggregate statistics
- `GET /stats/daily` - Daily progress
- `GET /stats/retention` - Retention data

## Design

The web UI follows a **Scholarly Brutalism** aesthetic:

- Warm paper tones with bold red accents
- High-contrast brutalist offset shadows
- Typography: Playfair Display (headings), IBM Plex Sans (body), IBM Plex Mono (code)
- Dark mode and reduced motion support

## License

MIT
