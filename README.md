# Chess vs AI

A Vite + TypeScript + Tailwind CSS chess game with an AI opponent powered by **chess.js** and **minimax with alpha-beta pruning**.

## Features

- ♟️ Full chess rules (castling, en passant, promotion, check/checkmate/stalemate detection)
- 🤔 AI opponent using minimax (depth 3) with alpha-beta pruning
- 📊 Piece-square tables for positional evaluation
- 🎨 Clean UI with Tailwind CSS — click to select & move pieces
- ↩️ Undo button (undoes your move and the AI's response)
- 🔄 New Game button to reset

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build for production
npm run build
```

## AI Engine

The AI evaluates positions using:

1. **Material count** — standard piece values (Pawn=100, Knight/Bishop≈320-330, Rook=500, Queen=900)
2. **Piece-square tables** — positional bonuses (centralized pieces, advanced pawns, etc.)
3. **Minimax with alpha-beta pruning** — searches 3 plies deep for strong tactical play
4. **Move ordering** — captures and checks evaluated first for better pruning

The AI plays as Black by default and picks randomly among equally-good moves for variety.
