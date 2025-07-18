const canvas = document.getElementById('game');
const context = canvas.getContext('2d');
context.scale(30, 30); // each block = 30px

const arena = createMatrix(10, 20);

const colors = [
    null,
    '#ff005b', // I
    '#009dff', // J
    '#ff2c00', // L
    '#fff200', // O
    '#00d8ff', // S (neon blue)
    '#ff00ff', // T
    '#00ffea'  // Z
];

// Preview canvas and next piece setup
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;
if (nextCtx) {
    nextCtx.scale(30, 30);
}

const pieces = 'TJLOSZI';
let nextPiece = createPiece(pieces[Math.floor(Math.random() * pieces.length)]);

// --- Particle effect setup ---
const particles = []; // {x,y,vx,vy,alpha}

// --- Background Music ---
const bgm = new Audio('bgm.wav');
bgm.loop = true;
bgm.volume = 0.5;
let bgmStarted = false;


const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0
};

function createLineClearParticles(rowIndex){
    for (let x = 0; x < arena[0].length; ++x){
        for (let i=0;i<4;i++){ // particles per block
            particles.push({
                x: x + Math.random(),
                y: rowIndex + Math.random(),
                vx: (Math.random()-0.5)*0.3,
                vy: (Math.random()-1)*0.3,
                alpha: 1
            });
        }
    }
}

function arenaSweep(){
    outer: for (let y = arena.length -1; y > 0; --y){
        for (let x = 0; x < arena[y].length; ++x){
            if (arena[y][x] === 0){
                continue outer;
            }
        }
        createLineClearParticles(y);
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        player.score += 10;
    }
}

function collide(arena, player){
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y){
        for (let x = 0; x < m[y].length; ++x){
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0){
                return true;
            }
        }
    }
    return false;
}

function createMatrix(w, h){
    const matrix = [];
    while (h--){
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type){
    switch (type){
        case 'I':
            return [
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0]
            ];
        case 'J':
            return [
                [0, 2, 0],
                [0, 2, 0],
                [2, 2, 0]
            ];
        case 'L':
            return [
                [0, 3, 0],
                [0, 3, 0],
                [0, 3, 3]
            ];
        case 'O':
            return [
                [4, 4],
                [4, 4]
            ];
        case 'S':
            return [
                [0, 5, 5],
                [5, 5, 0],
                [0, 0, 0]
            ];
        case 'T':
            return [
                [0, 6, 0],
                [6, 6, 6],
                [0, 0, 0]
            ];
        case 'Z':
            return [
                [7, 7, 0],
                [0, 7, 7],
                [0, 0, 0]
            ];
    }
}

function drawMatrix(matrix, offset, ctx = context){
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0){
                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 0.05;
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

// Draw next piece preview
function drawNext(){
    if (!nextCtx) return;
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    const offsetX = (4 - nextPiece[0].length) / 2;
    const offsetY = (4 - nextPiece.length) / 2;
    drawMatrix(nextPiece, {x: offsetX, y: offsetY}, nextCtx);
}

function updateParticles(delta){
    for (let i = particles.length-1; i>=0; --i){
        const p = particles[i];
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.vy += 0.0005 * delta; // gravity
        p.alpha -= 0.0015 * delta;
        if (p.alpha <= 0){
            particles.splice(i,1);
        }
    }
}

function drawParticles(){
    particles.forEach(p=>{
        context.fillStyle = `rgba(0,216,255,${p.alpha})`;
        context.fillRect(p.x, p.y, 0.15, 0.15);
    });
}

function draw(){
    if (nextCtx) drawNext();
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, {x:0, y:0});
    drawMatrix(player.matrix, player.pos);
    drawParticles();
}

function merge(arena, player){
    player.matrix.forEach((row, y)=>{
        row.forEach((value, x)=>{
            if (value !== 0){
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function playerDrop(){
    player.pos.y++;
    if (collide(arena, player)){
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerHardDrop(){
    while(!collide(arena, player)){
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
    dropCounter = 0;
}

function playerMove(dir){
    player.pos.x += dir;
    if (collide(arena, player)){
        player.pos.x -= dir;
    }
}

function playerReset(){
    player.matrix = nextPiece;
    nextPiece = createPiece(pieces[Math.floor(Math.random() * pieces.length)]);

    player.pos.y = 0;
    player.pos.x = Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);

    if (collide(arena, player)){
        arena.forEach(row => row.fill(0));
        player.score = 0;
        updateScore();
        alert('GAME OVER');
    }

    if (nextCtx) drawNext();
}

function rotate(matrix, dir){
    for (let y = 0; y < matrix.length; ++y){
        for (let x = 0; x < y; ++x){
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0){
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerRotate(dir){
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)){
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length){
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

let dropCounter = 0;
let dropInterval = 1000; // ms
let lastTime = 0;
function update(time = 0){
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    updateParticles(deltaTime);
    if (dropCounter > dropInterval){
        playerDrop();
    }
    draw();
    requestAnimationFrame(update);
}

function updateScore(){
    document.getElementById('score').innerText = `SCORE: ${player.score}`;
}

// Start BGM on first user interaction to satisfy autoplay policies
function startBgm(){
    if(!bgmStarted){
        bgm.play().catch(()=>{});
        bgmStarted = true;
        document.removeEventListener('keydown', startBgm);
        document.removeEventListener('mousedown', startBgm);
    }
}

document.addEventListener('keydown', startBgm);
document.addEventListener('mousedown', startBgm);

// Touch controls handlers
if (window.matchMedia('(max-width: 600px)').matches) {
    document.getElementById('touch-controls').addEventListener('click', e=>{
        if(!(e.target instanceof HTMLElement)) return;
        const action = e.target.getAttribute('data-act');
        switch(action){
            case 'left': playerMove(-1); break;
            case 'right': playerMove(1); break;
            case 'down': playerDrop(); break;
            case 'rotateCW': playerRotate(1); break;
            case 'rotateCCW': playerRotate(-1); break;
            case 'hard': playerHardDrop(); break;
        }
    });
}

document.addEventListener('keydown', event => {
    switch (event.keyCode) {
        case 37: // Left Arrow
            playerMove(-1);
            break;
        case 39: // Right Arrow
            playerMove(1);
            break;
        case 40: // Down Arrow
            playerDrop();
            break;
        case 38: // Up Arrow (rotate clockwise)
        case 88: // X key (rotate clockwise)
        case 87: // W key (rotate clockwise)
            playerRotate(1);
            break;
        case 32: // Space - Hard Drop
            playerHardDrop();
            break;
        case 90: // Z key (rotate counter-clockwise)
        case 81: // Q key (rotate counter-clockwise)
            playerRotate(-1);
            break;
    }
});

playerReset();
updateScore();
update();
