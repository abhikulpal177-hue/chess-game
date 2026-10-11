// chess.js library ko internet se load karo, phir game shuru karo
const libScript = document.createElement('script');
libScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js';
libScript.onload = startGame;
libScript.onerror = () => {
  document.getElementById('status').textContent = 'chess.js load nahi hui. Internet check karo.';
};
document.head.appendChild(libScript);

function startGame() {
  const game = new Chess();

  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const glyph = t => GLYPH[t] + '\uFE0E';
  const files = 'abcdefgh';

  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const promoEl = document.getElementById('promo');
  const promoChoices = document.getElementById('promoChoices');

  let selected = null;
  let targets = [];
  let lastMove = null;

  function updateStatus() {
    const turn = game.turn() === 'w' ? 'White' : 'Black';
    if (game.in_checkmate()) {
      statusEl.textContent = `Checkmate. ${game.turn() === 'w' ? 'Black' : 'White'} wins.`;
    } else if (game.in_stalemate()) {
      statusEl.textContent = 'Stalemate. The game is a draw.';
    } else if (game.in_draw()) {
      statusEl.textContent = 'Draw.';
    } else {
      statusEl.textContent = `${turn} to move${game.in_check() ? ' (check)' : ''}`;
    }
  }

  function render() {
    updateStatus();
    boardEl.innerHTML = '';
    const board = game.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const name = files[c] + (8 - r);
        const p = board[r][c];

        const sq = document.createElement('button');
        sq.className = 'sq ' + ((r + c) % 2 ? 'dark' : 'light');
        sq.setAttribute('aria-label', name);

        if (lastMove && (lastMove.from === name || lastMove.to === name)) sq.classList.add('last');
        if (selected === name) sq.classList.add('selected');
        if (p && p.type === 'k' && p.color === game.turn() && game.in_check()) sq.classList.add('check');

        const tm = targets.find(m => m.to === name);
        if (tm) {
          sq.classList.add('target');
          if (tm.flags.includes('c') || tm.flags.includes('e')) sq.classList.add('capture');
        }

        if (c === 0) sq.insertAdjacentHTML('beforeend', `<span class="coord rank">${8 - r}</span>`);
        if (r === 7) sq.insertAdjacentHTML('beforeend', `<span class="coord file">${files[c]}</span>`);
        if (p) sq.insertAdjacentHTML('beforeend', `<span class="piece ${p.color}">${glyph(p.type)}</span>`);

        sq.addEventListener('click', () => onSquare(name));
        boardEl.appendChild(sq);
      }
    }
  }

  function onSquare(name) {
    if (game.game_over()) return;

    const move = targets.find(m => m.to === name);
    if (selected && move) {
      if (move.flags.includes('p')) askPromotion(move);
      else play(move.from, move.to);
      return;
    }

    const piece = game.get(name);
    if (piece && piece.color === game.turn()) {
      selected = name;
      targets = game.moves({ square: name, verbose: true });
    } else {
      selected = null;
      targets = [];
    }
    render();
  }

  function play(from, to, promotion) {
    lastMove = game.move({ from, to, promotion });
    selected = null;
    targets = [];
    render();
  }

  function askPromotion(move) {
    const color = game.turn();
    promoChoices.innerHTML = '';
    for (const t of ['q', 'r', 'b', 'n']) {
      const b = document.createElement('button');
      b.textContent = glyph(t);
      b.style.color = color === 'w' ? '#fff' : '#151a20';
      b.style.textShadow = color === 'w' ? '0 0 2px #000, 0 0 2px #000' : 'none';
      b.onclick = () => {
        promoEl.classList.remove('open');
        play(move.from, move.to, t);
      };
      promoChoices.appendChild(b);
    }
    promoEl.classList.add('open');
  }
  

  document.getElementById('newBtn').onclick = () => {
    game.reset();
    selected = null;
    targets = [];
    lastMove = null;
    promoEl.classList.remove('open');
    render();
  };

  document.getElementById('undoBtn').onclick = () => {
  game.undo();   // sirf ek move wapas
  const h = game.history({ verbose: true });
  lastMove = h[h.length - 1] || null;
  selected = null;
  targets = [];
  promoEl.classList.remove('open');
  render();
};

  render();
}