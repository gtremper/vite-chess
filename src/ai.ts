import { Chess, Move } from 'chess.js';
import { evaluate } from './evaluation.js';

const SEARCH_DEPTH = 3;
const NEG_INFINITY = -99999;
const POS_INFINITY = 99999;

/** Order moves for better alpha-beta pruning (captures first, then checks, then others). */
function orderMoves(moves: Move[]): Move[] {
  const captureValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  return [...moves].sort((a, b) => {
    if (a.captured && !b.captured) return -1;
    if (!a.captured && b.captured) return 1;
    if (a.captured && b.captured) {
      const aScore = captureValues[a.captured] - captureValues[a.piece];
      const bScore = captureValues[b.captured] - captureValues[b.piece];
      return bScore - aScore;
    }
    if (a.promotion && !b.promotion) return -1;
    if (!a.promotion && b.promotion) return 1;
    const aCheck = a.san.endsWith('+') || a.san.endsWith('#');
    const bCheck = b.san.endsWith('+') || b.san.endsWith('#');
    if (aCheck && !bCheck) return -1;
    if (!aCheck && bCheck) return 1;
    return 0;
  });
}

/** Minimax with alpha-beta pruning. */
function minimax(game: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluate(game.fen());
  }
  const moves = orderMoves(game.moves({ verbose: true }));
  if (isMaximizing) {
    let maxEval = NEG_INFINITY;
    for (const move of moves) {
      game.move(move);
      const ev = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = POS_INFINITY;
    for (const move of moves) {
      game.move(move);
      const ev = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

/** Find the best move for the AI (Black). Returns the move in SAN notation. */
export function findBestMove(game: Chess, depth: number = SEARCH_DEPTH): string | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  const orderedMoves = orderMoves(moves);
  let bestMove: Move | null = null;
  let bestEval = POS_INFINITY;
  const candidates: { move: Move; eval: number }[] = [];

  for (const move of orderedMoves) {
    game.move(move);
    const ev = minimax(game, depth - 1, NEG_INFINITY, POS_INFINITY, true);
    game.undo();

    if (ev < bestEval - 5) {
      bestEval = ev;
      bestMove = move;
      candidates.length = 0;
      candidates.push({ move, eval: ev });
    } else if (ev <= bestEval + 5) {
      candidates.push({ move, eval: ev });
    }
  }

  // Add variety by picking randomly among equally good moves
  if (candidates.length > 1 && Math.random() < 0.3) {
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx].move.san;
  }

  return bestMove?.san ?? orderedMoves[0].san;
}
