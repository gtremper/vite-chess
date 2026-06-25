import { Chess, Move } from 'chess.js';
import { findBestMove } from './ai.js';
import './style.css';

// Unicode chess pieces
const PIECES: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function getPieceSymbol(piece: { type: string; color: string }): string {
  return PIECES[`${piece.color === 'w' ? 'w' : 'b'}${piece.type.toUpperCase()}`] || '';
}

function sq(r: number, f: number): string { return `${FILES[f]}${RANKS[r]}`; }
function isLight(r: number, f: number): boolean { return (r + f) % 2 === 0; }

class ChessApp {
  private game: Chess;
  private selectedSquare: string | null = null;
  private validMoves: Move[] = [];
  private aiThinking = false;
  private gameOver = false;
  private moveHistory: string[] = [];

  private appEl: HTMLElement;
  private statusEl: HTMLElement;
  private boardEl: HTMLElement;
  private movesEl: HTMLElement;

  constructor() {
    this.game = new Chess();
    this.appEl = document.getElementById('app')!;
    this.statusEl = document.createElement('div');
    this.boardEl = document.createElement('div');
    this.movesEl = document.createElement('div');
    this.render();
  }

  private render() {
    this.appEl.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'flex flex-col items-center gap-6 p-6';

    // Title
    const title = document.createElement('h1');
    title.textContent = '♟ Chess vs AI';
    title.className = 'text-4xl font-bold text-white tracking-wide';
    container.appendChild(title);

    // Status
    this.statusEl.className = 'text-center text-lg font-semibold min-h-[2rem]';
    container.appendChild(this.statusEl);

    // Board
    this.boardEl.className = 'flex flex-col items-center';
    container.appendChild(this.boardEl);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'flex gap-3';

    const newBtn = this.makeBtn('🔄 New Game', 'bg-emerald-700 hover:bg-emerald-600', () => this.newGame());
    const undoBtn = this.makeBtn('↩️ Undo', 'bg-gray-700 hover:bg-gray-600', () => this.undoMove());
    controls.appendChild(newBtn);
    controls.appendChild(undoBtn);
    container.appendChild(controls);

    // Move history
    const histLabel = document.createElement('div');
    histLabel.className = 'text-gray-400 text-sm font-semibold';
    histLabel.textContent = 'Moves';
    container.appendChild(histLabel);

    this.movesEl.className = 'bg-gray-800/80 rounded-lg p-3 min-h-[2rem] max-h-[6rem] w-72 overflow-y-auto text-sm font-mono text-gray-300';
    container.appendChild(this.movesEl);

    this.appEl.appendChild(container);
    this.renderBoard();
    this.updateStatus();
    this.renderMoveHistory();
  }

  private makeBtn(text: string, cls: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = `px-5 py-2 ${cls} text-white rounded-lg font-semibold transition-colors cursor-pointer active:opacity-80`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private renderBoard() {
    this.boardEl.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'border-4 border-amber-950 rounded shadow-2xl overflow-hidden';
    const board = document.createElement('div');
    board.className = 'grid grid-cols-8';

    const rows = this.game.fen().split(' ')[0].split('/');

    for (let r = 0; r < 8; r++) {
      let col = 0;
      for (const ch of rows[r]) {
        if (/\d/.test(ch)) { col += parseInt(ch, 10); continue; }

        const square = sq(r, col);
        const piece = this.game.get(square as any);

        const cell = document.createElement('div');
        cell.className = `w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl cursor-pointer select-none transition-colors duration-100 ${isLight(r, col) ? 'bg-amber-100' : 'bg-amber-700'}`;

        // Selected square
        if (square === this.selectedSquare) {
          cell.className = cell.className.replace('bg-amber-100', 'bg-sky-400').replace('bg-amber-700', 'bg-sky-600');
        }

        // Last move highlight
        if (this.moveHistory.length > 0) {
          const last = this.moveHistory[this.moveHistory.length - 1];
          if (square === last.slice(0, 2) || square === last.slice(2, 4)) {
            cell.classList.add(isLight(r, col) ? 'bg-yellow-200' : 'bg-yellow-600');
          }
        }

        // Valid move indicators
        const isValidTarget = this.validMoves.some(m => m.to === square);
        if (isValidTarget) {
          if (piece) {
            cell.style.outline = '3px solid rgba(239, 68, 68, 0.8)';
            cell.style.outlineOffset = '-3px';
          } else {
            const dot = document.createElement('div');
            dot.className = 'w-3 h-3 rounded-full bg-gray-900/30 absolute';
            cell.appendChild(dot);
          }
        }

        // Piece
        if (piece) {
          const span = document.createElement('span');
          span.textContent = getPieceSymbol(piece);
          span.style.textShadow = piece.color === 'w'
            ? '0 1px 3px rgba(0,0,0,0.6)'
            : '0 0 4px rgba(255,255,255,0.4)';
          span.style.lineHeight = '1';
          cell.appendChild(span);
        }

        cell.addEventListener('click', () => this.onSquareClick(square));
        board.appendChild(cell);
        col++;
      }
    }

    wrapper.appendChild(board);

    // File labels
    const fileLabels = document.createElement('div');
    fileLabels.className = 'flex';
    FILES.forEach(f => {
      const label = document.createElement('div');
      label.className = 'w-12 sm:w-14 md:w-16 text-center text-xs text-gray-500 font-mono py-1';
      label.textContent = f;
      fileLabels.appendChild(label);
    });

    this.boardEl.appendChild(wrapper);
    this.boardEl.appendChild(fileLabels);
  }

  private onSquareClick(sqStr: string) {
    if (this.aiThinking || this.gameOver) return;

    const piece = this.game.get(sqStr as any);

    // If we have a selected square, try to move
    if (this.selectedSquare) {
      const move = this.validMoves.find(m => m.to === sqStr);
      if (move) {
        // Auto-promote to queen

        const fromPiece = this.game.get(this.selectedSquare as any);
        const promo = (fromPiece?.type === 'p' && (sqStr[1] === '1' || sqStr[1] === '8')) ? 'q' : undefined;

        try {
          const m = this.game.move({ from: this.selectedSquare, to: sqStr, promotion: promo });
          if (m) this.moveHistory.push(m.from + m.to);
        } catch { /* invalid move */ }

        this.selectedSquare = null;
        this.validMoves = [];
        this.renderBoard();
        this.updateStatus();
        this.renderMoveHistory();

        // AI responds
        setTimeout(() => this.doAiMove(), 300);
        return;
      }
    }

    // Select a new piece
    if (piece && piece.color === 'w') {
      this.selectedSquare = sqStr;
      this.validMoves = this.game.moves({ verbose: true }).filter(m => m.from === sqStr);
    } else {
      this.selectedSquare = null;
      this.validMoves = [];
    }
    this.renderBoard();
  }

  private async doAiMove() {
    this.aiThinking = true;
    this.updateStatus();

    const best = await new Promise<string | null>(resolve =>
      setTimeout(() => resolve(findBestMove(this.game)), 100)
    );

    if (best) {
      try {
        const m = this.game.move(best);
        if (m) this.moveHistory.push(m.from + m.to);
      } catch { /* shouldn't happen */ }
    }

    this.aiThinking = false;
    this.selectedSquare = null;
    this.validMoves = [];
    this.renderBoard();
    this.updateStatus();
    this.renderMoveHistory();
  }

  private updateStatus() {
    if (this.aiThinking) {
      this.statusEl.textContent = '🤔 AI is thinking...';
      this.statusEl.className = 'text-center text-lg font-semibold min-h-[2rem] text-amber-300 animate-pulse';
      return;
    }

    if (this.game.isCheckmate()) {
      this.gameOver = true;
      this.statusEl.textContent = '👑 Checkmate! You win!';
      this.statusEl.className = 'text-center text-xl font-bold min-h-[2rem] text-green-400';
      return;
    }

    if (this.game.isStalemate()) {
      this.gameOver = true;
      this.statusEl.textContent = '🤝 Stalemate — Draw!';
      this.statusEl.className = 'text-center text-xl font-bold min-h-[2rem] text-yellow-400';
      return;
    }

    if (this.game.isDraw()) {
      this.gameOver = true;
      this.statusEl.textContent = '🤝 Draw!';
      this.statusEl.className = 'text-center text-xl font-bold min-h-[2rem] text-gray-400';
      return;
    }

    const isPlayerTurn = this.game.turn() === 'w';
    const turnText = isPlayerTurn ? 'Your turn (White)' : "AI's turn (Black)";
    const check = this.game.inCheck() ? ' ⚠️ Check!' : '';
    this.statusEl.textContent = `${turnText}${check}`;
    this.statusEl.className = `text-center text-lg font-semibold min-h-[2rem] ${this.game.inCheck() ? 'text-red-400' : 'text-white'}`;
  }

  private renderMoveHistory() {
    if (this.moveHistory.length === 0) {
      this.movesEl.textContent = 'No moves yet';
      return;
    }
    const lines: string[] = [];
    for (let i = 0; i < this.moveHistory.length; i += 2) {
      const n = Math.floor(i / 2) + 1;
      const w = this.moveHistory[i] || '';
      const b = this.moveHistory[i + 1] || '';
      lines.push(`${n}. ${w}  ${b}`);
    }
    this.movesEl.textContent = lines.join('\n');
    this.movesEl.style.whiteSpace = 'pre-line';
  }

  private newGame() {
    this.game.reset();
    this.selectedSquare = null;
    this.validMoves = [];
    this.aiThinking = false;
    this.gameOver = false;
    this.moveHistory = [];
    this.renderBoard();
    this.updateStatus();
    this.renderMoveHistory();
  }

  private undoMove() {
    if (this.aiThinking || this.gameOver || this.moveHistory.length < 2) return;
    this.game.undo();
    this.game.undo();
    this.moveHistory.splice(-2, 2);
    this.selectedSquare = null;
    this.validMoves = [];
    this.renderBoard();
    this.updateStatus();
    this.renderMoveHistory();
  }
}

// Start the app
new ChessApp();
