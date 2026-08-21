/* =========================================================
   GOTA A GOTA EL AGUA SE AGOTA
   Versión corregida y comentada.

   Cambios principales respecto a la versión original:
   1) La posición de jugador y eventos se guarda como datos
      (x%, y%) en JavaScript, no se lee del DOM con
      getBoundingClientRect(). Esto evita forzar "reflow" del
      navegador y hace que la detección de cercanía sea
      predecible y no dependa de cómo se vea en pantalla.
   2) La dificultad ahora también acelera la aparición de
      eventos (antes solo acortaba el tiempo para atraparlos).
   3) Los eventos nuevos evitan aparecer pegados a uno
      existente.
   4) El juego se pausa solo si cambias de pestaña.
   5) localStorage está protegido con try/catch (modo
      incógnito puede bloquearlo).
   6) Se agregaron datos educativos sobre cuidado del agua.
========================================================= */


/* -----------------------------
   REFERENCIAS AL DOM
----------------------------- */

const gameArea = document.getElementById("gameArea");
const player = document.getElementById("player");

const scoreElement = document.getElementById("score");
const comboElement = document.getElementById("combo");
const timeElement = document.getElementById("time");
const waterElement = document.getElementById("water");
const waterBar = document.getElementById("waterBar");
const waterBarWrapper = document.getElementById("waterBarWrapper");

const feedback = document.getElementById("feedback");

const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const startTip = document.getElementById("startTip");

const pauseScreen = document.getElementById("pauseScreen");
const resumeButton = document.getElementById("resumeButton");

const gameOver = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");
const finalTitle = document.getElementById("finalTitle");
const finalMessage = document.getElementById("finalMessage");
const finalIcon = document.getElementById("finalIcon");
const finalTip = document.getElementById("finalTip");
const restartButton = document.getElementById("restartButton");

const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");
const actionButton = document.getElementById("actionButton");


/* -----------------------------
   DATOS EDUCATIVOS
   (mensajes reales de cuidado del agua)
----------------------------- */

const WATER_TIPS = [
    "💡 Un grifo goteando puede desperdiciar más de 30 litros al día.",
    "💡 Cerrar la llave mientras te enjabonas ahorra hasta 12 litros por ducha.",
    "💡 Una fuga pequeña en el inodoro puede perder más de 200 litros al día.",
    "💡 Reutilizar el agua de lavar verduras para regar plantas evita desperdicio.",
    "💡 Lavar el auto con balde en vez de manguera ahorra cientos de litros.",
    "💡 En La Paz, cuidar el agua es clave por la dependencia de glaciares y lluvias estacionales."
];

function randomTip() {
    return WATER_TIPS[Math.floor(Math.random() * WATER_TIPS.length)];
}


/* -----------------------------
   ALMACENAMIENTO SEGURO
   (localStorage puede fallar en modo incógnito
   o con almacenamiento deshabilitado)
----------------------------- */

function getBestScore() {
    try {
        return Number(localStorage.getItem("gotaCeroBest")) || 0;
    } catch (error) {
        return 0;
    }
}

function saveBestScore(value) {
    try {
        localStorage.setItem("gotaCeroBest", value);
    } catch (error) {
        // Si no se puede guardar, el juego sigue funcionando igual.
    }
}


/* -----------------------------
   ESTADO DEL JUEGO
----------------------------- */

let score = 0;
let water = 0;
let combo = 0;
let time = 60;

let playerX = 50; // posición en % dentro del área de juego

let playing = false;
let paused = false;

let timer = null;
let spawnTimer = null;

let difficultyTier = 0; // 0,1,2,3 según el tiempo restante
let events = []; // { element, x, y, points, water }

let bestScore = getBestScore();


/* -----------------------------
   CONFIGURACIÓN DE DIFICULTAD
   A menor tiempo restante, mayor tier.
   spawnInterval: cada cuánto aparece un evento nuevo.
   despawnMs: cuánto dura visible antes de "desperdiciarse".
----------------------------- */

const DIFFICULTY_TIERS = [
    { minTime: 45, spawnInterval: 1800, despawnMs: 3500 },
    { minTime: 30, spawnInterval: 1500, despawnMs: 3000 },
    { minTime: 15, spawnInterval: 1200, despawnMs: 2500 },
    { minTime: 0, spawnInterval: 900, despawnMs: 2000 }
];

function getTierForTime(t) {
    for (let i = 0; i < DIFFICULTY_TIERS.length; i++) {
        if (t >= DIFFICULTY_TIERS[i].minTime) {
            return i;
        }
    }
    return DIFFICULTY_TIERS.length - 1;
}


/* -----------------------------
   MOVIMIENTO
----------------------------- */

function movePlayer(direction) {

    if (!playing || paused) return;

    playerX += direction * 5;
    playerX = Math.max(5, Math.min(95, playerX));

    player.style.left = playerX + "%";
}


/* -----------------------------
   ACCIÓN: recolectar el evento más cercano
   Usa distancia matemática sobre datos (x%, y%),
   no measurements del DOM.
----------------------------- */

function playerAction() {

    if (!playing || paused) return;

    const playerY = 77; // posición vertical fija del jugador (bottom: 23%)

    let closest = null;
    let closestDistance = Infinity;

    events.forEach(event => {

        const dx = Math.abs(playerX - event.x);
        const dy = Math.abs(playerY - event.y);

        // Zona de interacción en unidades de % del área de juego.
        // El jugador solo se mueve en horizontal, así que el margen
        // vertical debe cubrir todo el rango donde pueden aparecer
        // los eventos (y entre 25% y 55%).
        if (dx < 22 && dy < 60) {

            const distance = dx + dy;

            if (distance < closestDistance) {
                closestDistance = distance;
                closest = event;
            }
        }
    });

    if (closest) {
        collectEvent(closest);
    } else {
        showFeedback("💧 Acércate al desperdicio");
    }
}


/* -----------------------------
   CREAR EVENTOS
----------------------------- */

const EVENT_TYPES = [
    { icon: "💧", points: 100, water: 5 },
    { icon: "🚰", points: 150, water: 8 },
    { icon: "🚿", points: 200, water: 10 },
    { icon: "💦", points: 300, water: 15 }
];

function findFreePosition() {

    // Intenta hasta 8 veces encontrar un lugar que no se pise
    // con un evento existente. Si no lo logra, usa el último intento.
    let x, y;

    for (let attempt = 0; attempt < 8; attempt++) {

        x = 10 + Math.random() * 80;
        y = 25 + Math.random() * 30;

        const overlaps = events.some(event => {
            return Math.abs(event.x - x) < 18 && Math.abs(event.y - y) < 18;
        });

        if (!overlaps) break;
    }

    return { x, y };
}

function spawnEvent() {

    if (!playing || paused) return;

    const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    const position = findFreePosition();

    const element = document.createElement("div");
    element.className = "event warning";
    element.textContent = type.icon;
    element.style.left = position.x + "%";
    element.style.top = position.y + "%";

    gameArea.appendChild(element);

    const event = {
        element,
        x: position.x,
        y: position.y,
        points: type.points,
        water: type.water
    };

    events.push(event);

    const tier = DIFFICULTY_TIERS[difficultyTier];

    /* SI NADIE LO RECOGE A TIEMPO */
    setTimeout(() => {

        if (events.includes(event)) {

            destroyEvent(event);
            combo = 0;
            showFeedback("💦 ¡AGUA DESPERDICIADA!");
            updateHUD();
        }

    }, tier.despawnMs);
}


/* -----------------------------
   RECOGER EVENTO
----------------------------- */

function collectEvent(event) {

    if (!events.includes(event)) return;

    const comboBonus = combo * 25;

    score += event.points + comboBonus;
    water = Math.min(100, water + event.water);
    combo++;

    event.element.classList.remove("warning");
    event.element.classList.add("good");

    showFeedback(`💧 +${event.water}%   🔥 x${combo}`);
    updateHUD();

    setTimeout(() => destroyEvent(event), 350);
}


/* -----------------------------
   ELIMINAR EVENTO
----------------------------- */

function destroyEvent(event) {

    const index = events.indexOf(event);
    if (index === -1) return;

    event.element.remove();
    events.splice(index, 1);
}


/* -----------------------------
   FEEDBACK
----------------------------- */

function showFeedback(text) {

    feedback.textContent = text;
    feedback.className = "feedback show";

    setTimeout(() => {
        feedback.className = "feedback";
    }, 700);
}


/* -----------------------------
   HUD
----------------------------- */

function updateHUD() {

    scoreElement.textContent = score;
    comboElement.textContent = "x" + combo;
    timeElement.textContent = time;
    waterElement.textContent = water + "%";
    waterBar.style.width = water + "%";
    waterBarWrapper.setAttribute("aria-valuenow", water);
}


/* -----------------------------
   TEMPORIZADOR PRINCIPAL
   También revisa si cambió el nivel de dificultad.
----------------------------- */

function startTimer() {

    timer = setInterval(() => {

        time--;
        updateHUD();
        checkDifficulty();

        if (time <= 0) {
            endGame();
        }

    }, 1000);
}

function checkDifficulty() {

    const newTier = getTierForTime(time);

    if (newTier !== difficultyTier) {
        difficultyTier = newTier;
        restartSpawner(); // aplica el nuevo ritmo de aparición
    }
}


/* -----------------------------
   GENERADOR DE EVENTOS
----------------------------- */

function restartSpawner() {

    clearInterval(spawnTimer);

    const tier = DIFFICULTY_TIERS[difficultyTier];

    spawnTimer = setInterval(spawnEvent, tier.spawnInterval);
}


/* -----------------------------
   PAUSA AL CAMBIAR DE PESTAÑA
----------------------------- */

function pauseGame() {

    if (!playing || paused) return;

    paused = true;
    clearInterval(timer);
    clearInterval(spawnTimer);

    pauseScreen.classList.remove("hidden");
}

function resumeGame() {

    if (!playing || !paused) return;

    paused = false;
    pauseScreen.classList.add("hidden");

    startTimer();
    restartSpawner();
}

document.addEventListener("visibilitychange", () => {

    if (document.hidden) {
        pauseGame();
    }
});


/* -----------------------------
   INICIAR
----------------------------- */

function startGame() {

    score = 0;
    water = 0;
    combo = 0;
    time = 60;
    difficultyTier = 0;
    playerX = 50;
    paused = false;

    events.forEach(event => event.element.remove());
    events = [];

    player.style.left = "50%";

    gameOver.classList.add("hidden");
    pauseScreen.classList.add("hidden");
    startScreen.classList.add("hidden");

    playing = true;

    updateHUD();
    startTimer();
    restartSpawner();

    /* PRIMEROS EVENTOS, para que no empiece vacío */
    spawnEvent();
    setTimeout(spawnEvent, 700);
}


/* -----------------------------
   FINAL
----------------------------- */

function endGame() {

    if (!playing) return;

    playing = false;

    clearInterval(timer);
    clearInterval(spawnTimer);

    events.forEach(event => event.element.remove());
    events = [];

    const newRecord = score > bestScore;

    if (newRecord) {
        bestScore = score;
        saveBestScore(bestScore);
    }

    finalScore.textContent = score;
    finalTip.textContent = randomTip();

    if (newRecord) {
        finalIcon.textContent = "👑";
        finalTitle.textContent = "¡NUEVO RÉCORD!";
        finalMessage.textContent =
            "Recuperaste una cantidad increíble de agua. Tu récord anterior ya fue superado.";
    } else if (score >= 1500) {
        finalIcon.textContent = "🏆";
        finalTitle.textContent = "¡HÉROE DEL AGUA!";
        finalMessage.textContent =
            "Excelente partida. La ciudad todavía necesita más.";
    } else {
        finalIcon.textContent = "💧";
        finalTitle.textContent = "¡BUENA PARTIDA!";
        finalMessage.textContent =
            "Puedes hacerlo mejor. ¡Intenta superar tu puntuación!";
    }

    gameOver.classList.remove("hidden");
}


/* -----------------------------
   TECLADO
----------------------------- */

document.addEventListener("keydown", event => {

    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        movePlayer(-1);
    }

    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        movePlayer(1);
    }

    if (event.code === "Space") {
        event.preventDefault();
        playerAction();
    }
});


/* -----------------------------
   BOTONES
----------------------------- */

leftButton.addEventListener("click", () => movePlayer(-1));
rightButton.addEventListener("click", () => movePlayer(1));
actionButton.addEventListener("click", playerAction);

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
resumeButton.addEventListener("click", resumeGame);


/* -----------------------------
   TIP INICIAL (se ve antes de jugar)
----------------------------- */

startTip.textContent = randomTip();