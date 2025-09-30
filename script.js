
// Extender la funcionalidad base de JavaScript
Array.prototype.last = function () {
  return this[this.length - 1];
};

Math.sinus = function (degree) {
  return Math.sin((degree / 180) * Math.PI);
};

// Datos del juego
let phase = "waiting"; // waiting | stretching | turning | walking | transitioning | falling
let lastTimestamp; // El timestamp del ciclo anterior de requestAnimationFrame

let heroX; // Cambia al moverse hacia adelante
let heroY; // Solo cambia al caer
let sceneOffset; // Mueve todo el juego

let platforms = [];
let sticks = [];
let trees = [];
let particles = []; // Partículas para efectos

// TODO: Guardar high score en localStorage (?)

let score = 0;
let highScore = 0;
let highName = "";
let level = 1;
let perfectCount = 0;
let achievements = { perfect100: false };

// Configuración
const canvasWidth = 375;
const canvasHeight = 375;
const platformHeight = 100;
const heroDistanceFromEdge = 10; // Mientras espera
const paddingX = 100; // La posición de espera del héroe desde el tamaño original del canvas
const perfectAreaSize = 10;

// El fondo se mueve más lento que el héroe
const backgroundSpeedMultiplier = 0.2;

const hill1BaseHeight = 100;
const hill1Amplitude = 10;
const hill1Stretch = 1;
const hill2BaseHeight = 70;
const hill2Amplitude = 20;
const hill2Stretch = 0.5;

const stretchingSpeed = 4; // Milisegundos que toma dibujar un píxel
const turningSpeed = 4; // Milisegundos que toma girar un grado
const walkingSpeed = 4;
const transitioningSpeed = 2;
const fallingSpeed = 2;

const heroWidth = 17; // 24
const heroHeight = 30; // 40

const canvas = document.getElementById("game");
canvas.width = window.innerWidth; // Hacer el Canvas de pantalla completa
canvas.height = window.innerHeight;

const ctx = canvas.getContext("2d");

const introductionElement = document.getElementById("introduction");
const perfectElement = document.getElementById("perfect");
const restartButton = document.getElementById("restart");
const scoreElement = document.getElementById("score");
const achievementsElement = document.getElementById("achievements");

// Inicializar layout
resetGame();

// Resetea variables del juego y layouts pero no inicia el juego (el juego inicia al presionar tecla)
function resetGame() {
  // Resetear progreso del juego
  phase = "waiting";
  lastTimestamp = undefined;
  sceneOffset = 0;
  score = 0;
  level = 1;
  perfectCount = 0; // Resetear contador de perfectos por partida

  // Cargar high score desde localStorage
  const savedHigh = localStorage.getItem('heroHighScore');
  if (savedHigh) {
    const highData = JSON.parse(savedHigh);
    highScore = highData.score || 0;
    highName = highData.name || "";
  } else {
    highScore = 0;
    highName = "";
  }

  // Cargar achievements
  const savedAchievements = localStorage.getItem('heroAchievements');
  if (savedAchievements) {
    achievements = JSON.parse(savedAchievements);
  }
  perfectCount = parseInt(localStorage.getItem('heroPerfectCount')) || 0;

  introductionElement.style.opacity = 1;
  perfectElement.style.opacity = 0;
  restartButton.style.display = "none";
  scoreElement.innerText = `Puntuación: ${score} | Máximo: ${highName ? highName + ' - ' : ''}${highScore}`;
  achievementsElement.innerText = achievements.perfect100 ? "🏆 100 Perfectos 🏆" : "";

  // La primera plataforma es siempre la misma
  // x + w tiene que coincidir con paddingX
  const stoneSize = Math.max(8, Math.min(15, window.innerWidth / 40));
  const totalHeight = platformHeight + (window.innerHeight - canvasHeight) / 2;
  const numCols = Math.ceil(50 / stoneSize);
  const numRows = Math.ceil(totalHeight / stoneSize);
  const firstColors = [];
  const stoneColors = ["#666", "#777", "#888", "#999"];
  for (let i = 0; i < numCols; i++) {
    firstColors[i] = [];
    for (let j = 0; j < numRows; j++) {
      firstColors[i][j] = stoneColors[Math.floor(Math.random() * stoneColors.length)];
    }
  }
  platforms = [{ x: 50, w: 50, colors: firstColors, stoneSize }];
  generatePlatform();
  generatePlatform();
  generatePlatform();
  generatePlatform();

  sticks = [{ x: platforms[0].x + platforms[0].w, length: 0, rotation: 0 }];

  trees = [];
  generateTree();
  generateTree();
  generateTree();
  generateTree();
  generateTree();
  generateTree();
  generateTree();
  generateTree();
  generateTree();
  generateTree();

  particles = []; // Resetear partículas

  heroX = platforms[0].x + platforms[0].w - heroDistanceFromEdge;
  heroY = 0;

  draw();
}

function generateTree() {
  const minimumGap = 30;
  const maximumGap = 150;

  // Coordenada X del borde derecho del árbol más lejano
  const lastTree = trees[trees.length - 1];
  let furthestX = lastTree ? lastTree.x : 0;

  const x =
    furthestX +
    minimumGap +
    Math.floor(Math.random() * (maximumGap - minimumGap));

  const treeColors = ["#628308ff", "#acd62fff", "#658100ff"];
  const color = treeColors[Math.floor(Math.random() * 3)];

  trees.push({ x, color });
}

function generatePlatform() {
  const minimumGap = 40;
  const maximumGap = 200;
  const minimumWidth = 20;
  const maximumWidth = 100;

  // Coordenada X del borde derecho de la plataforma más lejana
  const lastPlatform = platforms[platforms.length - 1];
  let furthestX = lastPlatform.x + lastPlatform.w;

  const x =
    furthestX +
    minimumGap +
    Math.floor(Math.random() * (maximumGap - minimumGap));
  const w =
    minimumWidth + Math.floor(Math.random() * (maximumWidth - minimumWidth));

  const stoneSize = Math.max(8, Math.min(15, window.innerWidth / 40));
  const totalHeight = platformHeight + (window.innerHeight - canvasHeight) / 2;
  const numCols = Math.ceil(w / stoneSize);
  const numRows = Math.ceil(totalHeight / stoneSize);
  const colors = [];
  const stoneColors = ["#666", "#777", "#888", "#999"];
  for (let i = 0; i < numCols; i++) {
    colors[i] = [];
    for (let j = 0; j < numRows; j++) {
      colors[i][j] = stoneColors[Math.floor(Math.random() * stoneColors.length)];
    }
  }

  platforms.push({ x, w, colors, stoneSize });
}

resetGame();

// Función para crear partículas
function createParticles(x, y, type) {
  const numParticles = type === 'spark' ? 10 : 15; // Más para humo
  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 20, // Variación en x
      y: y + (Math.random() - 0.5) * 20, // Variación en y
      vx: (Math.random() - 0.5) * 4, // Velocidad x
      vy: (Math.random() - 0.5) * 4 - 2, // Velocidad y (hacia arriba)
      life: 60, // Vida en frames
      type: type
    });
  }
}
window.addEventListener("keydown", function (event) {
  if (event.key == " ") {
    event.preventDefault();
    if (phase == "waiting") {
      lastTimestamp = undefined;
      introductionElement.style.opacity = 0;
      phase = "stretching";
      window.requestAnimationFrame(animate);
    }
    return;
  }
  if (event.key == "r" || event.key == "R") {
    event.preventDefault();
    resetGame();
    return;
  }
  if (event.key == "Enter" && phase == "waiting") {
    event.preventDefault();
    lastTimestamp = undefined;
    introductionElement.style.opacity = 0;
    phase = "stretching";
    window.requestAnimationFrame(animate);
  }
});

window.addEventListener("keyup", function (event) {
  if (event.key == " ") {
    event.preventDefault();
    if (phase == "stretching") {
      phase = "turning";
    }
    return;
  }
});

window.addEventListener("mousedown", function (event) {
  if (phase == "waiting") {
    lastTimestamp = undefined;
    introductionElement.style.opacity = 0;
    phase = "stretching";
    window.requestAnimationFrame(animate);
  }
});

window.addEventListener("mouseup", function (event) {
  if (phase == "stretching") {
    phase = "turning";
  }
});

window.addEventListener("resize", function (event) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
});

window.requestAnimationFrame(animate);

// El bucle principal del juego
function animate(timestamp) {
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
    window.requestAnimationFrame(animate);
    return;
  }

  switch (phase) {
    case "waiting":
      return; // Detener el bucle
    case "stretching": {
      sticks.last().length += (timestamp - lastTimestamp) / stretchingSpeed;
      break;
    }
    case "turning": {
      sticks.last().rotation += (timestamp - lastTimestamp) / turningSpeed;

      if (sticks.last().rotation > 90) {
        sticks.last().rotation = 90;

        const [nextPlatform, perfectHit] = thePlatformTheStickHits();
        if (nextPlatform) {
          // Aumentar score
          score += perfectHit ? 2 : 1;
          if (score >= 10 && level == 1) {
            level = 2;
          }
          scoreElement.innerText = `Puntuación: ${score} | Máximo: ${highName ? highName + ' - ' : ''}${highScore}`;

          if (perfectHit) {
            perfectElement.style.opacity = 1;
            setTimeout(() => (perfectElement.style.opacity = 0), 1000);
            // Crear partículas de chispas
            const stickFarX = sticks.last().x + sticks.last().length;
            createParticles(stickFarX, canvasHeight - platformHeight, 'spark');
            // Contar perfect
            perfectCount++;
            if (perfectCount >= 100 && !achievements.perfect100) {
              achievements.perfect100 = true;
              localStorage.setItem('heroAchievements', JSON.stringify(achievements));
              localStorage.setItem('heroPerfectCount', perfectCount);
              achievementsElement.innerText = "🏆 100 Perfectos";
            }
          }

          generatePlatform();
          generateTree();
          generateTree();
        }

        phase = "walking";
      }
      break;
    }
    case "walking": {
      heroX += (timestamp - lastTimestamp) / walkingSpeed;

      const [nextPlatform] = thePlatformTheStickHits();
      if (nextPlatform) {
        // Si el héroe llegará a otra plataforma entonces limitar su posición en su borde
        const maxHeroX = nextPlatform.x + nextPlatform.w - heroDistanceFromEdge;
        if (heroX > maxHeroX) {
          heroX = maxHeroX;
          phase = "transitioning";
        }
      } else {
        // Si el héroe no llegará a otra plataforma entonces limitar su posición al final del palo
        const maxHeroX = sticks.last().x + sticks.last().length + heroWidth;
        if (heroX > maxHeroX) {
          heroX = maxHeroX;
          phase = "falling";
        }
      }
      break;
    }
    case "transitioning": {
      sceneOffset += (timestamp - lastTimestamp) / transitioningSpeed;

      const [nextPlatform] = thePlatformTheStickHits();
      if (sceneOffset > nextPlatform.x + nextPlatform.w - paddingX) {
        // Agregar el siguiente paso
        sticks.push({
          x: nextPlatform.x + nextPlatform.w,
          length: 0,
          rotation: 0
        });
        phase = "waiting";
      }
      break;
    }
    case "falling": {
      if (sticks.last().rotation < 180)
        sticks.last().rotation += (timestamp - lastTimestamp) / turningSpeed;

      heroY += (timestamp - lastTimestamp) / fallingSpeed;
      const maxHeroY =
        platformHeight + 100 + (window.innerHeight - canvasHeight) / 2;
      if (heroY > maxHeroY) {
        // Crear partículas de humo
        createParticles(heroX, heroY + canvasHeight - platformHeight, 'smoke');
        // Guardar high score si es nuevo record
        if (score > highScore) {
          let name = prompt("¡Nuevo record! Ingresa 3 letras para tu nombre:", "");
          if (name) {
            name = name.toUpperCase().substring(0, 3);
            highScore = score;
            highName = name;
            localStorage.setItem('heroHighScore', JSON.stringify({score: highScore, name: highName}));
          }
        }
        restartButton.style.display = "block";
        return;
      }
      break;
    }
    default:
      throw Error("Fase incorrecta");
  }

  // Actualizar partículas
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1; // Gravedad
    p.life--;
  });
  particles = particles.filter(p => p.life > 0);

  draw();
  window.requestAnimationFrame(animate);

  lastTimestamp = timestamp;
}

// Devuelve la plataforma que el palo golpeó (si no golpeó ninguna palo entonces devuelve undefined)
function thePlatformTheStickHits() {
  if (sticks.last().rotation != 90)
    throw Error(`El palo está ${sticks.last().rotation}°`);
  const stickFarX = sticks.last().x + sticks.last().length;

  const platformTheStickHits = platforms.find(
    (platform) => platform.x < stickFarX && stickFarX < platform.x + platform.w
  );

  // Si el palo golpea el área perfecta
  if (
    platformTheStickHits &&
    platformTheStickHits.x + platformTheStickHits.w / 2 - perfectAreaSize / 2 <
      stickFarX &&
    stickFarX <
      platformTheStickHits.x + platformTheStickHits.w / 2 + perfectAreaSize / 2
  )
    return [platformTheStickHits, true];

  return [platformTheStickHits, false];
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  drawBackground();

  // Centrar el área principal del canvas en el medio de la pantalla
  ctx.translate(
    (window.innerWidth - canvasWidth) / 2 - sceneOffset,
    (window.innerHeight - canvasHeight) / 2
  );

  // Dibujar escena
  drawPlatforms();
  drawHero();
  drawSticks();
  drawParticles();

  // Restaurar transformación
  ctx.restore();
}

restartButton.addEventListener("click", function (event) {
  event.preventDefault();
  resetGame();
  restartButton.style.display = "none";
});

function drawPlatforms() {
  platforms.forEach((platform) => {
    const { x, w, colors, stoneSize } = platform;
    const platformX = (window.innerWidth - canvasWidth) / 2 - sceneOffset + x;
    if (platformX + w > 0 && platformX < window.innerWidth) { // Solo visibles
      drawStonePlatform(x, w, colors, stoneSize);
    }
  });
}

function drawStonePlatform(x, w, colors, stoneSize = 15) {
  const totalHeight = platformHeight + (window.innerHeight - canvasHeight) / 2;
  for (let i = 0; i < Math.ceil(w / stoneSize); i++) {
    for (let j = 0; j < Math.ceil(totalHeight / stoneSize); j++) {
      ctx.fillStyle = colors[i] && colors[i][j] ? colors[i][j] : "#666";
      ctx.fillRect(x + i * stoneSize, canvasHeight - platformHeight + j * stoneSize, stoneSize, stoneSize);
    }
  }

  // Dibujar área perfecta solo si el héroe no ha llegado aún a la plataforma
  if (sticks.last().x < x) {
    ctx.fillStyle = "red";
    ctx.fillRect(
      x + w / 2 - perfectAreaSize / 2,
      canvasHeight - platformHeight,
      perfectAreaSize,
      perfectAreaSize
    );
  }
}

function drawHero() {
  ctx.save();
  ctx.fillStyle = "black";
  ctx.translate(
    heroX - heroWidth / 2,
    heroY + canvasHeight - platformHeight - heroHeight / 3
  );

  // Cuerpo de la rana (óvalo verde)
  ctx.fillStyle = "#4CAF50"; // Verde rana
  drawRoundedRect(
    -heroWidth / 2,
    -heroHeight / 2,
    heroWidth,
    heroHeight - 4,
    8
  );

  // Patas traseras
  ctx.fillStyle = "#388E3C";
  ctx.beginPath();
  ctx.arc(-6, 8, 4, 0, Math.PI * 2, false);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6, 8, 4, 0, Math.PI * 2, false);
  ctx.fill();

  // Patas delanteras
  ctx.beginPath();
  ctx.arc(-4, 2, 3, 0, Math.PI * 2, false);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, 2, 3, 0, Math.PI * 2, false);
  ctx.fill();

  // Ojos
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(-3, -5, 4, 0, Math.PI * 2, false);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3, -5, 4, 0, Math.PI * 2, false);
  ctx.fill();

  // Pupilas
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(-3, -5, 2, 0, Math.PI * 2, false);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3, -5, 2, 0, Math.PI * 2, false);
  ctx.fill();

  // Boca
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -1, 3, 0, Math.PI, false);
  ctx.stroke();

  // Bandolera roja (mantener como estaba)
  ctx.fillStyle = "red";
  ctx.fillRect(-heroWidth / 2 - 1, -12, heroWidth + 2, 4.5);
  ctx.beginPath();
  ctx.moveTo(-9, -14.5);
  ctx.lineTo(-17, -18.5);
  ctx.lineTo(-14, -8.5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10, -10.5);
  ctx.lineTo(-15, -3.5);
  ctx.lineTo(-5, -7);
  ctx.fill();

  ctx.restore();
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x, y + radius);
  ctx.lineTo(x, y + height - radius);
  ctx.arcTo(x, y + height, x + radius, y + height, radius);
  ctx.lineTo(x + width - radius, y + height);
  ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
  ctx.lineTo(x + width, y + radius);
  ctx.arcTo(x + width, y, x + width - radius, y, radius);
  ctx.lineTo(x + radius, y);
  ctx.arcTo(x, y, x, y + radius, radius);
  ctx.fill();
}

function drawSticks() {
  sticks.forEach((stick) => {
    ctx.save();

    // Mover el punto de anclaje al inicio del palo y rotar
    ctx.translate(stick.x, canvasHeight - platformHeight);
    ctx.rotate((Math.PI / 180) * stick.rotation);

    // Dibujar palo
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -stick.length);
    ctx.stroke();

    // Restaurar transformaciones
    ctx.restore();
  });
}

function drawBackground() {
  // Dibujar cielo
  var gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  if (level == 1) {
    gradient.addColorStop(0, "#94a37bff");
    gradient.addColorStop(1, "#FEF1E1");
  } else {
    // Noche
    gradient.addColorStop(0, "#2C3E50");
    gradient.addColorStop(1, "#34495E");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  // Dibujar sol o estrellas
  if (level == 1) {
    drawSun(sceneOffset * 0.05 + 100, 80);
  } else {
    drawStars();
  }

  // Dibujar colinas
  drawHill(hill1BaseHeight, hill1Amplitude, hill1Stretch, level == 1 ? "#95C629" : "#1ABC9C");
  drawHill(hill2BaseHeight, hill2Amplitude, hill2Stretch, level == 1 ? "#659F1C" : "#16A085");

  // Dibujar árboles
  trees.forEach((tree) => {
    const treeX = (-sceneOffset * backgroundSpeedMultiplier + tree.x) * hill1Stretch;
    if (treeX > -50 && treeX < window.innerWidth + 50) { // Solo visibles
      drawTree(tree.x, tree.color);
    }
  });
}

// Una colina es una forma bajo una onda sinusoidal estirada
function drawHill(baseHeight, amplitude, stretch, color) {
  ctx.beginPath();
  ctx.moveTo(0, window.innerHeight);
  ctx.lineTo(0, getHillY(0, baseHeight, amplitude, stretch));
  for (let i = 0; i < window.innerWidth; i++) {
    ctx.lineTo(i, getHillY(i, baseHeight, amplitude, stretch));
  }
  ctx.lineTo(window.innerWidth, window.innerHeight);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawTree(x, color) {
  ctx.save();
  ctx.translate(
    (-sceneOffset * backgroundSpeedMultiplier + x) * hill1Stretch,
    getTreeY(x, hill1BaseHeight, hill1Amplitude)
  );

  const treeTrunkHeight = 5;
  const treeTrunkWidth = 2;
  const treeCrownHeight = 25;
  const treeCrownWidth = 10;

  // Dibujar tronco
  ctx.fillStyle = "#7D833C";
  ctx.fillRect(
    -treeTrunkWidth / 2,
    -treeTrunkHeight,
    treeTrunkWidth,
    treeTrunkHeight
  );

  // Dibujar corona
  ctx.beginPath();
  ctx.moveTo(-treeCrownWidth / 2, -treeTrunkHeight);
  ctx.lineTo(0, -(treeTrunkHeight + treeCrownHeight));
  ctx.lineTo(treeCrownWidth / 2, -treeTrunkHeight);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}

function getHillY(windowX, baseHeight, amplitude, stretch) {
  const sineBaseY = window.innerHeight - baseHeight;
  return (
    Math.sinus((sceneOffset * backgroundSpeedMultiplier + windowX) * stretch) *
      amplitude +
    sineBaseY
  );
}

function getTreeY(x, baseHeight, amplitude) {
  const sineBaseY = window.innerHeight - baseHeight;
  return Math.sinus(x) * amplitude + sineBaseY;
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life / 60; // Fade out
    if (p.type === 'spark') {
      ctx.fillStyle = 'yellow';
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    } else if (p.type === 'smoke') {
      ctx.fillStyle = 'gray';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawSun(x, y) {
  ctx.save();
  ctx.fillStyle = 'yellow';
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();

  // Rayos
  ctx.strokeStyle = 'yellow';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * 35, y + Math.sin(angle) * 35);
    ctx.lineTo(x + Math.cos(angle) * 45, y + Math.sin(angle) * 45);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStars() {
  ctx.fillStyle = 'white';
  for (let i = 0; i < 100; i++) {
    const x = (i * 37) % window.innerWidth;
    const y = (i * 23) % (window.innerHeight / 2);
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  }
}