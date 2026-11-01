
// =====================================
// LOAD CHESS.JS
// =====================================

const libScript = document.createElement('script');

libScript.src =
    'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js';

libScript.onload = startGame;

libScript.onerror = () => {
    document.getElementById('status').textContent =
        'chess.js load nahi hui. Internet check karo.';
};

document.head.appendChild(libScript);


function startGame() {

    const game = new Chess();

    const GLYPH = {
        k: '♚', q: '♛', r: '♜',
        b: '♝', n: '♞', p: '♟'
    };

    const glyph = t => GLYPH[t] + '\uFE0E';
    const files = 'abcdefgh';

    const boardEl = document.getElementById('board');
    const statusEl = document.getElementById('status');
    const promoEl = document.getElementById('promo');
    const promoChoices = document.getElementById('promoChoices');

    const difficultySelect = document.getElementById('difficulty');

    let selected = null;
    let targets = [];
    let lastMove = null;

    let engineReady = false;
    let isThinking = false;
    let gameVersion = 0;
    let shouldAnimate = false;

    // =====================================
    // DIFFICULTY SETTINGS
    // =====================================

    let difficulty = difficultySelect
        ? difficultySelect.value
        : 'medium';

    const difficultySettings = {
        easy: { skill: 3, depth: 5 },
        medium: { skill: 10, depth: 10 },
        hard: { skill: 20, depth: 15 }
    };

    if (difficultySelect) {
        difficultySelect.addEventListener('change', (e) => {
            difficulty = e.target.value;
        });
    }


    // =====================================
    // STOCKFISH ENGINE
    // =====================================

    const stockfish = new Worker(
        './engine/stockfish-19-lite-single.js'
    );

    stockfish.onmessage = (event) => {

        const message = event.data;

        if (message === 'uciok') {
            stockfish.postMessage('isready');
        }

        if (message === 'readyok') {
            engineReady = true;
            updateStatus();
        }

        if (message.startsWith('bestmove')) {

            const bestMove = message.split(' ')[1];

            if (!bestMove || bestMove === '(none)') {
                isThinking = false;
                updateStatus();
                return;
            }

            const currentVersion = gameVersion;

            setTimeout(() => {

                if (currentVersion !== gameVersion) return;

                if (game.game_over()) {
                    isThinking = false;
                    updateStatus();
                    return;
                }

                const move = game.move({
                    from: bestMove.substring(0, 2),
                    to: bestMove.substring(2, 4),
                    promotion: bestMove[4] || 'q'
                });

                if (move) {
                    lastMove = move;
                    selected = null;
                    targets = [];
                    shouldAnimate = true;
                    render();
                }

                isThinking = false;
                updateStatus();

            }, 2000);
        }
    };

    stockfish.postMessage('uci');


    // =====================================
    // COMPUTER MOVE
    // =====================================

    function computerMove() {

        if (!engineReady || isThinking) return;
        if (game.game_over()) return;
        if (game.turn() !== 'b') return;

        isThinking = true;
        updateStatus();

        const settings =
            difficultySettings[difficulty] ||
            difficultySettings.medium;

        stockfish.postMessage(
            `setoption name Skill Level value ${settings.skill}`
        );

        stockfish.postMessage(
            'position fen ' + game.fen()
        );

        stockfish.postMessage(
            `go depth ${settings.depth}`
        );
    }


    // =====================================
    // PIECE ANIMATION
    // =====================================

    function animateLastMove() {

        if (!lastMove || !shouldAnimate) return;

        const fromSquare = boardEl.querySelector(
            `[aria-label="${lastMove.from}"]`
        );

        const toSquare = boardEl.querySelector(
            `[aria-label="${lastMove.to}"]`
        );

        if (!fromSquare || !toSquare) return;

        const piece = toSquare.querySelector('.piece');

        if (!piece) return;

        const from = fromSquare.getBoundingClientRect();
        const to = toSquare.getBoundingClientRect();

        const x = from.left - to.left;
        const y = from.top - to.top;

        piece.animate(
            [
                { transform: `translate(${x}px, ${y}px)` },
                { transform: 'translate(0, 0)' }
            ],
            {
                duration: 350,
                easing: 'ease-in-out'
            }
        );

        shouldAnimate = false;
    }


    // =====================================
    // GAME STATUS
    // =====================================

    function updateStatus() {

        if (game.in_checkmate()) {
            statusEl.textContent =
                `Checkmate. ${game.turn() === 'w' ? 'Black' : 'White'} wins.`;
        }

        else if (game.in_stalemate()) {
            statusEl.textContent = 'Stalemate. Draw.';
        }

        else if (game.in_draw()) {
            statusEl.textContent = 'Draw.';
        }

        else if (isThinking) {
            statusEl.textContent = 'Computer is thinking...';
        }

        else if (!engineReady) {
            statusEl.textContent = 'Loading Stockfish...';
        }

        else {
            const turn = game.turn() === 'w' ? 'White' : 'Black';

            statusEl.textContent =
                `${turn} to move${game.in_check() ? ' (check)' : ''}`;
        }
    }


    // =====================================
    // RENDER BOARD
    // =====================================

    function render() {

        updateStatus();

        boardEl.innerHTML = '';

        const board = game.board();

        for (let r = 0; r < 8; r++) {

            for (let c = 0; c < 8; c++) {

                const name = files[c] + (8 - r);
                const p = board[r][c];

                const sq = document.createElement('button');

                sq.className =
                    'sq ' + ((r + c) % 2 ? 'dark' : 'light');

                sq.setAttribute('aria-label', name);

                if (
                    lastMove &&
                    (lastMove.from === name || lastMove.to === name)
                ) {
                    sq.classList.add('last');
                }

                if (selected === name) {
                    sq.classList.add('selected');
                }

                if (
                    p &&
                    p.type === 'k' &&
                    p.color === game.turn() &&
                    game.in_check()
                ) {
                    sq.classList.add('check');
                }

                const tm = targets.find(m => m.to === name);

                if (tm) {
                    sq.classList.add('target');

                    if (
                        tm.flags.includes('c') ||
                        tm.flags.includes('e')
                    ) {
                        sq.classList.add('capture');
                    }
                }

                if (c === 0) {
                    sq.insertAdjacentHTML(
                        'beforeend',
                        `<span class="coord rank">${8 - r}</span>`
                    );
                }

                if (r === 7) {
                    sq.insertAdjacentHTML(
                        'beforeend',
                        `<span class="coord file">${files[c]}</span>`
                    );
                }

                if (p) {
                    sq.insertAdjacentHTML(
                        'beforeend',
                        `<span class="piece ${p.color}">${glyph(p.type)}</span>`
                    );
                }

                sq.addEventListener('click', () => onSquare(name));

                boardEl.appendChild(sq);
            }
        }

        animateLastMove();
    }


    // =====================================
    // SQUARE CLICK
    // =====================================

    function onSquare(name) {

        if (game.game_over()) return;
        if (isThinking || game.turn() !== 'w') return;

        const move = targets.find(m => m.to === name);

        if (selected && move) {

            if (move.flags.includes('p')) {
                askPromotion(move);
            } else {
                play(move.from, move.to);
            }

            return;
        }

        const piece = game.get(name);

        if (piece && piece.color === game.turn()) {
            selected = name;
            targets = game.moves({
                square: name,
                verbose: true
            });
        } else {
            selected = null;
            targets = [];
        }

        render();
    }


    // =====================================
    // PLAY MOVE
    // =====================================

    function play(from, to, promotion) {

        const move = game.move({
            from,
            to,
            promotion
        });

        if (!move) return;

        lastMove = move;
        selected = null;
        targets = [];
        shouldAnimate = true;

        render();

        if (!game.game_over() && game.turn() === 'b') {
            computerMove();
        }
    }


    // =====================================
    // PROMOTION
    // =====================================

    function askPromotion(move) {

        const color = game.turn();

        promoChoices.innerHTML = '';

        for (const t of ['q', 'r', 'b', 'n']) {

            const b = document.createElement('button');

            b.textContent = glyph(t);

            b.style.color =
                color === 'w' ? '#fff' : '#151a20';

            b.style.textShadow =
                color === 'w'
                    ? '0 0 2px #000, 0 0 2px #000'
                    : 'none';

            b.onclick = () => {
                promoEl.classList.remove('open');
                play(move.from, move.to, t);
            };

            promoChoices.appendChild(b);
        }

        promoEl.classList.add('open');
    }


    // =====================================
    // NEW GAME
    // =====================================

    document.getElementById('newBtn').onclick = () => {

        gameVersion++;

        stockfish.postMessage('stop');

        game.reset();

        selected = null;
        targets = [];
        lastMove = null;

        isThinking = false;
        shouldAnimate = false;

        promoEl.classList.remove('open');

        stockfish.postMessage('ucinewgame');
        stockfish.postMessage('isready');

        render();
    };


    // =====================================
    // UNDO
    // =====================================

    document.getElementById('undoBtn').onclick = () => {

        gameVersion++;

        stockfish.postMessage('stop');

        isThinking = false;

        if (game.history().length === 0) return;

        game.undo();

        if (game.turn() === 'b') {
            game.undo();
        }

        const history = game.history({
            verbose: true
        });

        lastMove = history[history.length - 1] || null;

        selected = null;
        targets = [];

        shouldAnimate = false;

        promoEl.classList.remove('open');

        render();
    };


    // =====================================
    // START GAME
    // =====================================

    render();

}
