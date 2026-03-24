const ROWS = 16;
const COLS = 8;

const SPEEDS = {
  slow: 1600,
  normal: 1300,
  fast: 1000
};

const START_DIRTY_COUNT = 6;
const DIRTY_ROW_INTERVAL = 35;
const SLUDGE_INTERVAL = 18;
const CLICKABLE_INTERVAL = 12;
const PASSIVE_CONTAM_EVERY = 6;

const CLEAR_SCORE = 25;
const DIRTY_CLEAR_BONUS = 20;
const JERRY_SCORE = 75;
const SLUDGE_CLICK_PENALTY = 10;
const SLUDGE_MISS_PENALTY = 5;
const SPEED_BONUS_BASE = 200;

const FAIL_CONTAM_GAIN = 1;
const FAIL_TUG_LOSS = 2;
const CLEAR_TUG_GAIN = 12;
const CLEAR_PURIFY_GAIN = 16;
const DIRTY_ROW_TUG_LOSS = 8;
const SLUDGE_CONTAM_GAIN = 8;
const DIRTY_ROW_CONTAM_GAIN = 24;

const FLUSH_REMOVE_COUNT = 4;
const CLEAR_ANIMATION_MS = 220;
const GRAVITY_STEP_MS = 85;

const COLORS = ["blue", "light", "white"];

const HEROES = {
  builder: "🧑‍🔧",
  student: "🧑‍🎓",
  field: "🧑‍🚰"
};

const PROFILE_KEY = "purify-drop-profile-v2";
const GAME_PROGRESS_KEY = "purify-drop-game-progress";

let grid = [];
let cells = [];

let currentPiece = null;
let nextPiece = null;

let score = 0;
let contamination = 0;
let purification = 0;
let tug = 0;

let timeLeft = 0;
let gameSpeed = "slow";
let playerName = "Player";
let heroChoice = "builder";
let currentLevel = 1;

let running = false;
let paused = false;
let countingDown = false;

let gravityLoop = null;
let secondLoop = null;
let clickableLoop = null;
let nextCapsuleId = 1;
let boardBusy = false;
let clearingCells = new Set();

let dirtyRowCountdown = DIRTY_ROW_INTERVAL;
let sludgeCountdown = SLUDGE_INTERVAL;
let passiveContamCounter = 0;

const gridEl = document.getElementById("grid");
const floatingItemsEl = document.getElementById("floatingItems");

const scoreText = document.getElementById("scoreText");
const timeText = document.getElementById("timeText");
const dirtyCountText = document.getElementById("dirtyCountText");

const contaminationText = document.getElementById("contaminationText");
const contaminationFill = document.getElementById("contaminationFill");

const purificationText = document.getElementById("purificationText");
const purificationFill = document.getElementById("purificationFill");

const garbageTimerEl = document.getElementById("garbageTimer");
const sludgeTimerEl = document.getElementById("sludgeTimer");

const heroPortrait = document.getElementById("heroPortrait");
const heroNameEl = document.getElementById("heroName");
const topHero = document.getElementById("topHero");
const topHeroName = document.getElementById("topHeroName");
const topTugMarker = document.getElementById("topTugMarker");

const nextPreview = document.getElementById("nextPreview");

const startOverlay = document.getElementById("startOverlay");
const howOverlay = document.getElementById("howOverlay");
const pauseOverlay = document.getElementById("pauseOverlay");
const endOverlay = document.getElementById("endOverlay");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownDisplay = document.getElementById("countdownDisplay");

const profileForm = document.getElementById("profileForm");
const playerNameInput = document.getElementById("playerNameInput");
const speedSelect = document.getElementById("speedSelect");
const characterSelect = document.getElementById("characterSelect");

const endTitle = document.getElementById("endTitle");
const endMessage = document.getElementById("endMessage");
const endScore = document.getElementById("endScore");
const endTimeLabel = document.getElementById("endTimeLabel");
const endTime = document.getElementById("endTime");
const resultVillain = document.getElementById("resultVillain");
const resultHero = document.getElementById("resultHero");
const resultWater = document.getElementById("resultWater");
const resultStage = document.getElementById("resultStage");
const playAgainBtn = document.getElementById("playAgainBtn");

document.getElementById("howBtn").addEventListener("click", () => openOverlay(howOverlay));
document.getElementById("closeHowBtn").addEventListener("click", () => closeOverlay(howOverlay));

document.getElementById("profileBtn").addEventListener("click", () => {
  if (running && !paused) pauseGame();
  loadProfileIntoForm();
  openOverlay(startOverlay);
});

document.getElementById("pauseBtn").addEventListener("click", () => {
  if (!running && !paused) return;
  if (paused) resumeGame();
  else pauseGame();
});

document.getElementById("resumeBtn").addEventListener("click", () => resumeGame());

document.getElementById("editProfileBtn").addEventListener("click", () => {
  closeOverlay(pauseOverlay);
  loadProfileIntoForm();
  openOverlay(startOverlay);
});

document.getElementById("resetBtn").addEventListener("click", () => goToStartScreen());

document.getElementById("saveExitBtn").addEventListener("click", () => {
  saveGameProgress();
  closeOverlay(pauseOverlay);
  goToStartScreen();
});

playAgainBtn.addEventListener("click", () => {
  closeOverlay(endOverlay);
  if (playAgainBtn.dataset.action === "next-level") {
    currentLevel += 1;
    startGame({ preserveScore: true });
    return;
  }

  currentLevel = 1;
  startGame();
});

document.getElementById("leftBtn").addEventListener("click", () => movePiece(0, -1));
document.getElementById("rightBtn").addEventListener("click", () => movePiece(0, 1));
document.getElementById("rotateBtn").addEventListener("click", () => rotatePiece());
document.getElementById("downBtn").addEventListener("click", () => softDrop());

profileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveProfileFromForm();
  closeOverlay(startOverlay);
  startGame();
});

window.addEventListener("keydown", (e) => {
  const typingTarget = isTypingTarget(e.target);

  if (!typingTarget && (e.code === "Space" || e.key.toLowerCase() === "p")) {
    e.preventDefault();
    if (countingDown) return;
    if (running && !paused) pauseGame();
    else if (paused) resumeGame();
    return;
  }

  if (typingTarget) return;

  if (!running || paused || boardBusy) return;

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    movePiece(0, -1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    movePiece(0, 1);
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    softDrop();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    rotatePiece();
  }
});

function openOverlay(el) {
  if (!el) return;
  el.classList.add("open");
}

function closeOverlay(el) {
  if (!el) return;
  el.classList.remove("open");
}

function startLevelCountdown(onDone) {
  clearLoops();
  countingDown = true;
  running = false;
  paused = true;

  let count = 3;
  countdownDisplay.textContent = count;
  openOverlay(countdownOverlay);

  const timer = setInterval(() => {
    count--;

    if (count > 0) {
      countdownDisplay.textContent = count;
    } else if (count === 0) {
      countdownDisplay.textContent = "Go!";
    } else {
      clearInterval(timer);
      closeOverlay(countdownOverlay);
      countingDown = false;
      running = true;
      paused = false;
      onDone();
    }
  }, 1000);
}

function makeCell(color, dirty = false, capsuleId = null) {
  return { color, dirty, capsuleId };
}

function copyCell(cell) {
  return cell ? { color: cell.color, dirty: cell.dirty, capsuleId: cell.capsuleId ?? null } : null;
}

function isEmpty(cell) {
  return cell === null;
}

function createGrid() {
  gridEl.innerHTML = "";
  cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement("div");
      cell.className = "cell empty";
      gridEl.appendChild(cell);
      cells.push(cell);
    }
  }
}

function resetGrid() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function seedDirtyBlobs() {
  const startingDirtyCount = Math.min(START_DIRTY_COUNT + currentLevel - 1, ROWS * COLS);
  let placed = 0;
  while (placed < startingDirtyCount) {
    const r = rand(8, 15);
    const c = rand(0, 7);
    if (isEmpty(grid[r][c])) {
      const color = COLORS[rand(0, COLORS.length - 1)];
      grid[r][c] = makeCell(color, true);
      placed++;
    }
  }
}

function makePiece() {
  const capsuleId = nextCapsuleId;
  nextCapsuleId += 1;

  return {
    r: 0,
    c: 3,
    a: makeCell(COLORS[rand(0, COLORS.length - 1)], false, capsuleId),
    b: makeCell(COLORS[rand(0, COLORS.length - 1)], false, capsuleId),
    rot: 0
  };
}

function getOffset(rot) {
  switch (rot % 4) {
    case 0: return { dr: 0, dc: 1 };
    case 1: return { dr: 1, dc: 0 };
    case 2: return { dr: 0, dc: -1 };
    default: return { dr: -1, dc: 0 };
  }
}

function getBlocks(piece) {
  const off = getOffset(piece.rot);
  return [
    { r: piece.r, c: piece.c, v: piece.a },
    { r: piece.r + off.dr, c: piece.c + off.dc, v: piece.b }
  ];
}

function canPlace(blocks) {
  for (const block of blocks) {
    if (block.c < 0 || block.c >= COLS || block.r >= ROWS) return false;
    if (block.r < 0) continue;
    if (!isEmpty(grid[block.r][block.c])) return false;
  }
  return true;
}

function spawnPiece() {
  currentPiece = nextPiece || makePiece();
  nextPiece = makePiece();

  if (!canPlace(getBlocks(currentPiece))) {
    loseGame("The grid filled up before you could clear all dirty water.");
    return;
  }

  renderNextPreview();
}

function renderNextPreview() {
  const previewCells = nextPreview.querySelectorAll(".preview-cell");
  previewCells.forEach((cell) => {
    cell.className = "preview-cell";
  });

  if (!nextPiece || previewCells.length < 2) return;

  previewCells[0].classList.add(nextPiece.a.color);
  previewCells[1].classList.add(nextPiece.b.color);
}

function classForCell(cell) {
  if (!cell) return "empty";
  return `${cell.color} ${cell.dirty ? "dirty" : "clean"}`;
}

function render() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const index = r * COLS + c;
      const key = `${r}-${c}`;
      const clearingClass = clearingCells.has(key) ? " clearing" : "";
      cells[index].className = `cell ${classForCell(grid[r][c])}${clearingClass}`;
    }
  }

  if (currentPiece) {
    for (const block of getBlocks(currentPiece)) {
      if (block.r >= 0 && block.r < ROWS && block.c >= 0 && block.c < COLS) {
        const index = block.r * COLS + block.c;
        cells[index].className = `cell ${classForCell(block.v)}`;
      }
    }
  }

  scoreText.textContent = String(score);
  timeText.textContent = formatTime(timeLeft);
  dirtyCountText.textContent = String(countDirtyBlobs());

  contaminationText.textContent = `${contamination}/100`;
  purificationText.textContent = `${purification}/100`;
  contaminationFill.style.width = `${contamination}%`;
  purificationFill.style.width = `${purification}%`;

  garbageTimerEl.textContent = `${dirtyRowCountdown}s`;
  sludgeTimerEl.textContent = `${sludgeCountdown}s`;

  const tugPercent = ((tug + 100) / 200) * 100;
  topTugMarker.style.left = `${Math.max(0, Math.min(100, tugPercent))}%`;
}

function movePiece(dr, dc) {
  if (!running || paused || boardBusy || !currentPiece) return false;
  const candidate = { ...currentPiece, r: currentPiece.r + dr, c: currentPiece.c + dc };
  if (canPlace(getBlocks(candidate))) {
    currentPiece = candidate;
    render();
    return true;
  }
  return false;
}

function rotatePiece() {
  if (!running || paused || boardBusy || !currentPiece) return;

  const candidate = { ...currentPiece, rot: (currentPiece.rot + 1) % 4 };
  const kicks = [
    candidate,
    { ...candidate, c: candidate.c - 1 },
    { ...candidate, c: candidate.c + 1 }
  ];

  for (const attempt of kicks) {
    if (canPlace(getBlocks(attempt))) {
      currentPiece = attempt;
      render();
      return;
    }
  }
}

function softDrop() {
  if (!movePiece(1, 0)) {
    lockPiece();
  }
}

function gameStep() {
  if (!running || paused || boardBusy) return;
  if (!movePiece(1, 0)) {
    lockPiece();
  }
}

async function lockPiece() {
  if (!currentPiece || boardBusy) return;

  boardBusy = true;

  try {
    for (const block of getBlocks(currentPiece)) {
      if (block.r >= 0 && block.r < ROWS) {
        grid[block.r][block.c] = copyCell(block.v);
      }
    }

    currentPiece = null;

    const result = await resolveBoard();

    if (result.cleared > 0) {
      score += (result.cleared * CLEAR_SCORE) + (result.dirtyCleared * DIRTY_CLEAR_BONUS);
      purification = clamp(purification + (result.cleared * CLEAR_PURIFY_GAIN), 0, 100);
      tug = clamp(tug + CLEAR_TUG_GAIN + result.dirtyCleared, -100, 100);
    } else {
      contamination = clamp(contamination + FAIL_CONTAM_GAIN, 0, 100);
      tug = clamp(tug - FAIL_TUG_LOSS, -100, 100);
    }

    if (purification >= 100) {
      purification = 0;
      await flushDirtyWater();
    }

    if (countDirtyBlobs() === 0) {
      winGame("You cleared all dirty water from the grid.");
      return;
    }

    if (contamination >= 100) {
      contamination = 0;
      addDirtyBottomRow();
      if (!running) return;
    }

    spawnPiece();
    render();
  } finally {
    boardBusy = false;
  }
}

async function resolveBoard() {
  let cleared = 0;
  let dirtyCleared = 0;

  while (true) {
    const matches = findMatches();
    if (matches.length === 0) break;

    setClearingCells(matches);
    render();
    await wait(CLEAR_ANIMATION_MS);

    for (const { r, c } of matches) {
      if (grid[r][c] && grid[r][c].dirty) dirtyCleared++;
      grid[r][c] = null;
      cleared++;
    }

    releaseSplitCapsules();
    clearingCells.clear();
    render();
    await settleBoard();
  }

  return { cleared, dirtyCleared };
}

function findMatches() {
  const found = new Map();

  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const current = grid[r][c];
      if (!current) {
        c++;
        continue;
      }

      let end = c + 1;
      while (end < COLS && grid[r][end] && grid[r][end].color === current.color) {
        end++;
      }

      if (end - c >= 4) {
        addMatchRange(found, r, c, r, end - 1);
      }

      c = end;
    }
  }

  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const current = grid[r][c];
      if (!current) {
        r++;
        continue;
      }

      let end = r + 1;
      while (end < ROWS && grid[end][c] && grid[end][c].color === current.color) {
        end++;
      }

      if (end - r >= 4) {
        addMatchRange(found, r, c, end - 1, c);
      }

      r = end;
    }
  }

  return [...found.values()];
}

function addMatchRange(found, startR, startC, endR, endC) {
  const rowStep = Math.sign(endR - startR);
  const colStep = Math.sign(endC - startC);
  let r = startR;
  let c = startC;

  while (true) {
    found.set(`${r}-${c}`, { r, c });

    if (r === endR && c === endC) break;
    r += rowStep;
    c += colStep;
  }
}

function countDirtyBlobs() {
  let total = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] && grid[r][c].dirty) total++;
    }
  }
  return total;
}

async function flushDirtyWater() {
  const dirtyCells = [];

  for (let r = ROWS - 1; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] && grid[r][c].dirty) {
        dirtyCells.push({ r, c });
      }
    }
  }

  const removeCount = Math.min(FLUSH_REMOVE_COUNT, dirtyCells.length);
  const flushTargets = dirtyCells.slice(0, removeCount);

  setClearingCells(flushTargets);
  render();
  await wait(CLEAR_ANIMATION_MS);

  for (let i = 0; i < removeCount; i++) {
    const { r, c } = dirtyCells[i];
    grid[r][c] = null;
  }

  releaseSplitCapsules();
  clearingCells.clear();
  render();
  await settleBoard();
}

function addDirtyBottomRow() {
  for (let c = 0; c < COLS; c++) {
    if (grid[0][c]) {
      loseGame("The grid filled up before you could clear all dirty water.");
      return;
    }
  }

  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = grid[r + 1][c];
    }
  }

  for (let c = 0; c < COLS; c++) {
    grid[ROWS - 1][c] = makeCell(COLORS[rand(0, COLORS.length - 1)], true);
  }

  tug = clamp(tug - DIRTY_ROW_TUG_LOSS, -100, 100);

  if (currentPiece) {
    currentPiece = { ...currentPiece, r: currentPiece.r - 1 };
  }
}

function addSludgeBlobToGrid() {
  for (let tries = 0; tries < 24; tries++) {
    const r = rand(6, 13);
    const c = rand(0, 7);
    if (!grid[r][c]) {
      grid[r][c] = makeCell(COLORS[rand(0, COLORS.length - 1)], true);
      contamination = clamp(contamination + SLUDGE_CONTAM_GAIN, 0, 100);
      return;
    }
  }

  for (let tries = 0; tries < 16; tries++) {
    const r = rand(4, 14);
    const c = rand(0, 7);
    if (!grid[r][c]) {
      grid[r][c] = makeCell(COLORS[rand(0, COLORS.length - 1)], true);
      contamination = clamp(contamination + SLUDGE_CONTAM_GAIN, 0, 100);
      return;
    }
  }
}

function tickSecond() {
  if (!running || paused || boardBusy) return;

  timeLeft++;

  passiveContamCounter++;
  if (passiveContamCounter % PASSIVE_CONTAM_EVERY === 0) {
    contamination = clamp(contamination + 1, 0, 100);
  }

  dirtyRowCountdown--;
  sludgeCountdown--;

  if (dirtyRowCountdown <= 0) {
    contamination = clamp(contamination + DIRTY_ROW_CONTAM_GAIN, 0, 100);
    dirtyRowCountdown = DIRTY_ROW_INTERVAL;
  }

  if (sludgeCountdown <= 0) {
    addSludgeBlobToGrid();
    sludgeCountdown = SLUDGE_INTERVAL;
  }

  if (contamination >= 100) {
    contamination = 0;
    addDirtyBottomRow();
    if (!running) return;
  }

  if (countDirtyBlobs() === 0) {
    winGame("You cleared all dirty water from the grid.");
    return;
  }

  render();
}

function calculateTimeBonus() {
  // Award bonus points based on completion time tiers
  // < 1 minute (60s): 100 points
  // < 3 minutes (180s): 50 points
  // < 5 minutes (300s): 25 points
  // >= 5 minutes: 0 points
  if (timeLeft < 60) {
    return 100;
  } else if (timeLeft < 180) {
    return 50;
  } else if (timeLeft < 300) {
    return 25;
  } else {
    return 0;
  }
}

function spawnClickable() {
  if (!running || paused || boardBusy) return;

  const type = Math.random() < 0.7 ? "jerry" : "sludge";
  const item = document.createElement("button");
  item.type = "button";
  item.className = `float-item ${type}`;
  item.setAttribute("aria-label", type === "jerry" ? "charity: water jerry can" : "toxic blob");
  item.textContent = type === "jerry" ? "" : "TOXIC";

  const maxX = Math.max(0, floatingItemsEl.clientWidth - 50);
  const maxY = Math.max(0, floatingItemsEl.clientHeight - 50);

  item.style.left = `${rand(0, maxX)}px`;
  item.style.top = `${rand(0, maxY)}px`;

  item.addEventListener("click", () => {
    if (type === "jerry") {
      score += JERRY_SCORE;
      purification = clamp(purification + 8, 0, 100);
      showScoreChangeAtItem(item, `+${JERRY_SCORE}`);
    } else {
      score = Math.max(0, score - SLUDGE_CLICK_PENALTY);
      contamination = clamp(contamination - SLUDGE_CONTAM_GAIN, 0, 100);
    }
    item.remove();
    render();
  });

  floatingItemsEl.appendChild(item);

  setTimeout(() => {
    if (!item.isConnected) return;
    if (type === "sludge") {
      const pointsLost = deductScore(SLUDGE_MISS_PENALTY);
      contamination = clamp(contamination + SLUDGE_CONTAM_GAIN, 0, 100);
      showScoreChangeAtItem(item, `-${pointsLost}`, true);
      if (contamination >= 100) {
        contamination = 0;
        addDirtyBottomRow();
        if (!running) return;
      }
      render();
    }
    item.remove();
  }, 5500);
}

function deductScore(amount) {
  const previousScore = score;
  score = Math.max(0, score - amount);
  return previousScore - score;
}

function showScoreChangeAtItem(item, text, isNegative = false) {
  const feedback = document.createElement("div");
  feedback.className = `score-feedback ${isNegative ? "negative" : "positive"}`;
  feedback.textContent = text;

  const x = item.offsetLeft + (item.offsetWidth / 2);
  const y = item.offsetTop - 8;
  feedback.style.left = `${x}px`;
  feedback.style.top = `${y}px`;

  floatingItemsEl.appendChild(feedback);

  // Remove the feedback after the float animation finishes.
  window.setTimeout(() => {
    feedback.remove();
  }, 850);
}

function clearLoops() {
  clearInterval(gravityLoop);
  clearInterval(secondLoop);
  clearInterval(clickableLoop);
}

function startLoops() {
  clearLoops();
  gravityLoop = setInterval(gameStep, SPEEDS[gameSpeed]);
  secondLoop = setInterval(tickSecond, 1000);
  clickableLoop = setInterval(spawnClickable, CLICKABLE_INTERVAL * 1000);
}

function startGame(options = {}) {
  const { preserveScore = false } = options;

  clearLoops();
  floatingItemsEl.innerHTML = "";
  clearGameProgress();

  const profile = getSavedProfile();
  if (profile) {
    applyProfile(profile);
  }

  if (!preserveScore) {
    score = 0;
  }
  contamination = 0;
  purification = 0;
  tug = 0;
  dirtyRowCountdown = DIRTY_ROW_INTERVAL;
  sludgeCountdown = SLUDGE_INTERVAL;
  passiveContamCounter = 0;
  boardBusy = false;
  clearingCells.clear();

  createGrid();
  resetGrid();
  seedDirtyBlobs();

  currentPiece = null;
  nextPiece = makePiece();
  spawnPiece();
  render();

  closeOverlay(startOverlay);
  closeOverlay(pauseOverlay);
  closeOverlay(endOverlay);
  closeOverlay(countdownOverlay);

  startLevelCountdown(() => {
    render();
    startLoops();
  });
}

function goToStartScreen() {
  running = false;
  paused = false;
  countingDown = false;
  clearLoops();
  floatingItemsEl.innerHTML = "";

  currentPiece = null;
  nextPiece = null;
  score = 0;
  contamination = 0;
  purification = 0;
  tug = 0;
  timeLeft = 0;
  currentLevel = 1;
  dirtyRowCountdown = DIRTY_ROW_INTERVAL;
  sludgeCountdown = SLUDGE_INTERVAL;
  passiveContamCounter = 0;
  boardBusy = false;
  clearingCells.clear();

  createGrid();
  resetGrid();
  renderNextPreview();
  render();

  closeOverlay(countdownOverlay);
  closeOverlay(pauseOverlay);
  closeOverlay(endOverlay);
  loadProfileIntoForm();
  openOverlay(startOverlay);
}

function pauseGame() {
  if (!running || countingDown) return;
  paused = true;
  saveGameProgress();
  openOverlay(pauseOverlay);
}

function resumeGame() {
  if (countingDown) return;
  paused = false;
  closeOverlay(pauseOverlay);
}

function winGame(message) {
  running = false;
  paused = false;
  clearLoops();
  clearGameProgress();

  const timeBonus = calculateTimeBonus();
  const finalScore = score + timeBonus;

  endTitle.textContent = "Victory!";
  endMessage.textContent = message;
  endScore.textContent = `${score} + ${timeBonus} (speed bonus) = ${finalScore}`;
  endTimeLabel.textContent = "Time";
  endTime.textContent = formatTime(timeLeft);
  playAgainBtn.textContent = `Level ${currentLevel + 1}`;
  playAgainBtn.dataset.action = "next-level";

  resultVillain.textContent = "🕴️";
  resultHero.textContent = HEROES[heroChoice];
  resultWater.className = "result-water clean-water";
  resultStage.className = "result-stage win";

  openOverlay(endOverlay);
}

function loseGame(message) {
  running = false;
  paused = false;
  clearLoops();
  clearGameProgress();

  endTitle.textContent = "Game Over";
  endMessage.textContent = `${message} The businessman points and laughs as your hero falls into dirty water.`;
  endScore.textContent = String(score);
  endTimeLabel.textContent = "Time";
  endTime.textContent = `${formatTime(timeLeft)} elapsed`;
  playAgainBtn.textContent = "Play Again";
  playAgainBtn.dataset.action = "restart";

  resultVillain.textContent = "👉😂";
  resultHero.textContent = HEROES[heroChoice];
  resultWater.className = "result-water dirty-water";
  resultStage.className = "result-stage lose";

  openOverlay(endOverlay);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setClearingCells(items) {
  clearingCells = new Set(items.map(({ r, c }) => `${r}-${c}`));
}

function releaseSplitCapsules() {
  const capsuleCounts = new Map();

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      if (!cell || cell.capsuleId === null) continue;
      capsuleCounts.set(cell.capsuleId, (capsuleCounts.get(cell.capsuleId) || 0) + 1);
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      if (!cell || cell.capsuleId === null) continue;
      if (capsuleCounts.get(cell.capsuleId) === 1) {
        cell.capsuleId = null;
      }
    }
  }
}

function applyGravityStep() {
  let moved = false;

  for (let c = 0; c < COLS; c++) {
    for (let r = ROWS - 2; r >= 0; r--) {
      if (grid[r][c] && !grid[r + 1][c]) {
        grid[r + 1][c] = grid[r][c];
        grid[r][c] = null;
        moved = true;
      }
    }
  }

  if (moved) {
    releaseSplitCapsules();
  }

  return moved;
}

async function settleBoard() {
  while (applyGravityStep()) {
    render();
    await wait(GRAVITY_STEP_MS);
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || target.isContentEditable;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function saveProfileFromForm() {
  const profile = {
    name: playerNameInput.value.trim() || "Player",
    speed: speedSelect.value,
    character: characterSelect.value
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  applyProfile(profile);
}

function getSavedProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function applyProfile(profile) {
  playerName = profile.name || "Player";
  timeLeft = 0;
  gameSpeed = profile.speed || "slow";
  heroChoice = profile.character || "builder";

  const heroEmoji = HEROES[heroChoice];
  heroPortrait.textContent = heroEmoji;
  heroNameEl.textContent = playerName;
  topHero.textContent = heroEmoji;
  topHeroName.textContent = playerName;
}

function loadProfileIntoForm() {
  const profile = getSavedProfile() || {
    name: "Player",
    speed: "slow",
    character: "builder"
  };

  playerNameInput.value = profile.name;
  speedSelect.value = profile.speed;
  characterSelect.value = profile.character;
  applyProfile(profile);
}

function saveGameProgress() {
  const progress = {
    grid,
    currentPiece,
    nextPiece,
    score,
    currentLevel,
    contamination,
    purification,
    tug,
    timeLeft,
    gameSpeed,
    playerName,
    heroChoice,
    dirtyRowCountdown,
    sludgeCountdown,
    passiveContamCounter,
    nextCapsuleId
  };
  localStorage.setItem(GAME_PROGRESS_KEY, JSON.stringify(progress));
}

function loadGameProgress() {
  try {
    const raw = localStorage.getItem(GAME_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function checkForSavedGame() {
  const saved = loadGameProgress();
  if (saved) {
    return confirm("You have a saved game. Would you like to continue where you left off?");
  }
  return false;
}

function restoreGameProgress(progress) {
  grid = progress.grid;
  currentPiece = progress.currentPiece;
  nextPiece = progress.nextPiece;
  score = progress.score;
  currentLevel = progress.currentLevel || 1;
  contamination = progress.contamination;
  purification = progress.purification;
  tug = progress.tug;
  timeLeft = progress.timeLeft;
  gameSpeed = progress.gameSpeed;
  playerName = progress.playerName;
  heroChoice = progress.heroChoice;
  dirtyRowCountdown = progress.dirtyRowCountdown;
  sludgeCountdown = progress.sludgeCountdown;
  passiveContamCounter = progress.passiveContamCounter;
  nextCapsuleId = progress.nextCapsuleId;
}

function clearGameProgress() {
  localStorage.removeItem(GAME_PROGRESS_KEY);
}

function init() {
  createGrid();
  resetGrid();
  loadProfileIntoForm();
  render();

  const shouldRestore = checkForSavedGame();
  if (shouldRestore) {
    const savedProgress = loadGameProgress();
    if (savedProgress) {
      restoreGameProgress(savedProgress);
      renderNextPreview();
      render();
      closeOverlay(startOverlay);
      // Start the game immediately without the countdown since it's a restoration
      running = true;
      paused = false;
      startLoops();
      return;
    }
  }

  openOverlay(startOverlay);
}

init();