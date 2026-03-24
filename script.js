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
const CLICKABLE_INTERVAL = 10;
const BASE_SLUDGE_CHANCE = 0.35;
const MAX_JERRY_STREAK = 2;
const PASSIVE_CONTAM_EVERY = 4;

const CLEAR_SCORE = 25;
const DIRTY_CLEAR_BONUS = 20;
const JERRY_SCORE = 75;
const SLUDGE_CLICK_CONTAM_REDUCTION = 10;
const SLUDGE_MISS_CONTAM_GAIN = 6;

const FAIL_CONTAM_GAIN = 2;
const FAIL_TUG_LOSS = 2;
const CLEAR_TUG_GAIN = 12;
const CLEAR_PURIFY_GAIN = 12;
const DIRTY_ROW_TUG_LOSS = 8;
const SLUDGE_GRID_CONTAM_GAIN = 8;
const DIRTY_ROW_CONTAM_GAIN = 26;

const FLUSH_REMOVE_COUNT = 4;
const CLEAR_ANIMATION_MS = 220;
const GRAVITY_STEP_MS = 85;

const COLORS = ["blue", "light", "white"];

const HEROES = {
  builder: "🧑‍🔧",
  student: "🧑‍🎓",
  field: "🧑‍🚰"
};

const PROFILE_KEY = "purify-drop-profile-v3";
const GAME_PROGRESS_KEY = "purify-drop-game-progress-v3";
const DEFAULT_MILESTONE_TEXT = "Clear dirty blobs and build purification for a flush.";

const MILESTONES = [
  {
    id: "purify-50",
    when: (state) => state.purification >= 50,
    text: "Purification is building. A strong clear can set up a flush."
  },
  {
    id: "purify-85",
    when: (state) => state.purification >= 85,
    text: "Almost there. One more good clear can trigger a flush."
  },
  {
    id: "contam-75",
    when: (state) => state.contamination >= 75,
    text: "Pollution is rising fast. Clear a match before another dirty row appears."
  },
  {
    id: "dirty-3",
    when: (state) => state.dirtyCount <= 3 && state.dirtyCount > 1 && state.initialDirtyCount > 3,
    text: "Almost there. Only a few dirty blobs remain."
  },
  {
    id: "dirty-1",
    when: (state) => state.dirtyCount === 1,
    text: "One dirty blob left. Finish the cleanup."
  }
];

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
let soundEnabled = true;
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
let jerrySpawnStreak = 0;
let howOverlayPausedGame = false;

let dirtyRowCountdown = DIRTY_ROW_INTERVAL;
let sludgeCountdown = SLUDGE_INTERVAL;
let passiveContamCounter = 0;

let initialDirtyCount = 0;
let shownMilestones = new Set();
let lastMilestoneMessage = DEFAULT_MILESTONE_TEXT;
let milestoneToastTimeout = null;

const gridEl = document.getElementById("grid");
const floatingItemsEl = document.getElementById("floatingItems");

const levelText = document.getElementById("levelText");
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

const milestoneText = document.getElementById("milestoneText");
const milestoneToast = document.getElementById("milestoneToast");

const bootOverlay = document.getElementById("bootOverlay");
const bootPrompt = document.getElementById("bootPrompt");
const startOverlay = document.getElementById("startOverlay");
const howOverlay = document.getElementById("howOverlay");
const pauseOverlay = document.getElementById("pauseOverlay");
const endOverlay = document.getElementById("endOverlay");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownDisplay = document.getElementById("countdownDisplay");

let bootReadyForInput = false;
let bootTimer = null;
let countdownScrollRaf = null;
const BOTTLE_VIEWPORT_MARGIN = 14;
const COUNTDOWN_FINE_TUNE_DOWN = 18;

const profileForm = document.getElementById("profileForm");
const playerNameInput = document.getElementById("playerNameInput");
const speedSelect = document.getElementById("speedSelect");
const characterSelect = document.getElementById("characterSelect");
const soundSelect = document.getElementById("soundSelect");

const endTitle = document.getElementById("endTitle");
const endMessage = document.getElementById("endMessage");
const endScore = document.getElementById("endScore");
const endTimeLabel = document.getElementById("endTimeLabel");
const endTime = document.getElementById("endTime");
const resultVillain = document.getElementById("resultVillain");
const resultPointer = document.getElementById("resultPointer");
const resultHero = document.getElementById("resultHero");
const resultWater = document.getElementById("resultWater");
const resultStage = document.getElementById("resultStage");
const playAgainBtn = document.getElementById("playAgainBtn");

const soundButton = document.getElementById("soundButton");
const soundCollect = document.getElementById("soundCollect");
const soundJerryCan = document.getElementById("soundJerryCan");
const soundMiss = document.getElementById("soundMiss");
const soundAlert = document.getElementById("soundAlert");
const soundWarningBubble = document.getElementById("soundWarningBubble");
const soundFlush = document.getElementById("soundFlush");
const soundMilestone = document.getElementById("soundMilestone");
const soundPause = document.getElementById("soundPause");
const soundCount3 = document.getElementById("soundCount3");
const soundCount2 = document.getElementById("soundCount2");
const soundCount1 = document.getElementById("soundCount1");
const soundCountGo = document.getElementById("soundCountGo");
const soundWin = document.getElementById("soundWin");
const soundLose = document.getElementById("soundLose");
const criticalSounds = [soundPause, soundWin, soundLose];
let criticalAudioPrimed = false;

const allSoundEffects = [
  soundButton,
  soundCollect,
  soundJerryCan,
  soundMiss,
  soundAlert,
  soundWarningBubble,
  soundFlush,
  soundMilestone,
  soundPause,
  soundCount3,
  soundCount2,
  soundCount1,
  soundCountGo,
  soundWin,
  soundLose
];

document.addEventListener("click", (event) => {
  primeCriticalAudio();

  const startGameButton = event.target.closest("#profileForm button[type='submit']");
  if (startGameButton) return;

  if (event.target.closest(".ui-btn, .control-btn")) {
    playSound(soundButton, 0.45);
  }
});

document.getElementById("howBtn").addEventListener("click", () => {
  howOverlayPausedGame = false;

  if (pauseGameplayForHowOverlay()) {
    howOverlayPausedGame = true;
  }

  openOverlay(howOverlay);
});

document.getElementById("closeHowBtn").addEventListener("click", () => {
  closeOverlay(howOverlay);

  if (howOverlayPausedGame) {
    resumeGameplayFromHowOverlay();
  }

  howOverlayPausedGame = false;
});

document.getElementById("pauseBtn").addEventListener("click", () => {
  if (!running && !paused) return;
  if (paused) resumeGame();
  else pauseGame();
});

document.getElementById("resumeBtn").addEventListener("click", () => resumeGame());

const editProfileBtn = document.getElementById("editProfileBtn");
if (editProfileBtn) {
  editProfileBtn.addEventListener("click", () => {
    closeOverlay(pauseOverlay);
    loadProfileIntoForm();
    openOverlay(startOverlay);
  });
}

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

  // Keep gameplay paused while the How To Play overlay is open.
  if (howOverlay.classList.contains("open")) return;

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

function playSound(audioEl, volume = 0.55) {
  if (!soundEnabled) return;
  if (paused && !countingDown && audioEl !== soundPause) return;
  if (!audioEl || !audioEl.getAttribute("src")) return;

  try {
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.volume = volume;
    const playPromise = audioEl.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  } catch {
    /* ignore audio playback errors */
  }
}

function primeCriticalAudio() {
  if (criticalAudioPrimed) return;

  for (const audioEl of criticalSounds) {
    if (!audioEl || !audioEl.getAttribute("src")) continue;
    try {
      audioEl.preload = "auto";
      audioEl.load();
    } catch {
      /* ignore audio preload errors */
    }
  }

  criticalAudioPrimed = true;
}

function stopOtherSounds(keepSound) {
  for (const audioEl of allSoundEffects) {
    if (!audioEl || audioEl === keepSound) continue;

    try {
      audioEl.pause();
      audioEl.currentTime = 0;
    } catch {
      /* ignore audio stop errors */
    }
  }
}

function openOverlay(el) {
  if (!el) return;
  el.classList.add("open");
}

function closeOverlay(el) {
  if (!el) return;
  el.classList.remove("open");
}

function setMilestoneMessage(text) {
  lastMilestoneMessage = text;
  milestoneText.textContent = text;
}

function announceMilestone(text) {
  if (paused && !countingDown) return;

  setMilestoneMessage(text);
  milestoneToast.textContent = text;
  milestoneToast.classList.remove("show");
  void milestoneToast.offsetWidth;
  milestoneToast.classList.add("show");

  clearTimeout(milestoneToastTimeout);
  milestoneToastTimeout = window.setTimeout(() => {
    milestoneToast.classList.remove("show");
  }, 2600);
}

function evaluateMilestones(state) {
  for (const milestone of MILESTONES) {
    if (!shownMilestones.has(milestone.id) && milestone.when(state)) {
      shownMilestones.add(milestone.id);
      announceMilestone(milestone.text);
      break;
    }
  }
}

function startLevelCountdown(onDone) {
  clearLoops();
  countingDown = true;
  running = false;
  paused = true;

  // Reset to top, then pan down to the bottle while the countdown runs.
  startCountdownScrollToBottle();

  let count = 3;
  countdownDisplay.textContent = count;
  playSound(soundCount3, 0.55);
  openOverlay(countdownOverlay);

  const timer = setInterval(() => {
    count--;

    if (count > 0) {
      countdownDisplay.textContent = count;
      if (count === 2) {
        playSound(soundCount2, 0.55);
      } else if (count === 1) {
        playSound(soundCount1, 0.55);
      }
    } else if (count === 0) {
      countdownDisplay.textContent = "Go!";
      centerBottleInViewport();
      playSound(soundCountGo, 0.58);
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

function startCountdownScrollToBottle() {
  if (countdownScrollRaf) {
    window.cancelAnimationFrame(countdownScrollRaf);
    countdownScrollRaf = null;
  }

  window.scrollTo({ top: 0, behavior: "auto" });

  const targetY = getBottleFramingScrollTop();
  const startY = window.scrollY;
  const durationMs = 3000;
  const startTime = performance.now();

  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    const eased = progress * progress * (3 - 2 * progress);
    const y = startY + ((targetY - startY) * eased);

    window.scrollTo({ top: y, behavior: "auto" });

    if (progress < 1 && countingDown) {
      countdownScrollRaf = window.requestAnimationFrame(step);
    } else {
      countdownScrollRaf = null;
    }
  };

  countdownScrollRaf = window.requestAnimationFrame(step);
}

function centerBottleInViewport() {
  if (countdownScrollRaf) {
    window.cancelAnimationFrame(countdownScrollRaf);
    countdownScrollRaf = null;
  }

  window.scrollTo({ top: getBottleFramingScrollTop(), behavior: "auto" });
}

function getBottleFramingScrollTop() {
  const bottle = document.querySelector(".bottle-wrap");
  if (!bottle) return 0;

  const rect = bottle.getBoundingClientRect();
  const bottleTopInDocument = window.scrollY + rect.top;
  const bottleBottomInDocument = bottleTopInDocument + rect.height;

  // Keep a small margin and frame the whole bottle when possible.
  const minTop = bottleBottomInDocument - window.innerHeight + BOTTLE_VIEWPORT_MARGIN;
  const maxTop = bottleTopInDocument - BOTTLE_VIEWPORT_MARGIN;
  const desiredTop = ((minTop + maxTop) / 2) + COUNTDOWN_FINE_TUNE_DOWN;
  const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  return clamp(desiredTop, 0, maxScrollTop);
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

  initialDirtyCount = countDirtyBlobs();
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

  const dirtyCount = countDirtyBlobs();

  levelText.textContent = String(currentLevel);
  scoreText.textContent = String(score);
  timeText.textContent = formatTime(timeLeft);
  dirtyCountText.textContent = String(dirtyCount);

  contaminationText.textContent = `${contamination}/100`;
  purificationText.textContent = `${purification}/100`;
  contaminationFill.style.width = `${contamination}%`;
  purificationFill.style.width = `${purification}%`;

  garbageTimerEl.textContent = `${dirtyRowCountdown}s`;
  sludgeTimerEl.textContent = `${sludgeCountdown}s`;

  const tugPercent = ((tug + 100) / 200) * 100;
  topTugMarker.style.left = `${Math.max(0, Math.min(100, tugPercent))}%`;

  evaluateMilestones({
    contamination,
    purification,
    dirtyCount,
    initialDirtyCount
  });
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

      if (result.dirtyCleared > 0) {
        playSound(soundCollect, 0.5);
      }
    } else {
      contamination = clamp(contamination + FAIL_CONTAM_GAIN, 0, 100);
      tug = clamp(tug - FAIL_TUG_LOSS, -100, 100);
    }

    const dirtyCountAfterResolve = countDirtyBlobs();
    if (dirtyCountAfterResolve === 0) {
      winGame("You cleared all dirty water from the grid.");
      return;
    }

    if (purification >= 100) {
      purification = 0;
      await flushDirtyWater();

      if (countDirtyBlobs() === 0) {
        winGame("You cleared all dirty water from the grid.");
        return;
      }
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
  playSound(soundFlush, 0.55);
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

  const safeRowColors = buildSafeDirtyBottomRowColors();
  for (let c = 0; c < COLS; c++) {
    grid[ROWS - 1][c] = makeCell(safeRowColors[c], true);
  }

  tug = clamp(tug - DIRTY_ROW_TUG_LOSS, -100, 100);
  playSound(soundAlert, 0.48);

  if (currentPiece) {
    currentPiece = { ...currentPiece, r: currentPiece.r - 1 };
  }
}

function buildSafeDirtyBottomRowColors() {
  const rowColors = new Array(COLS).fill(null);

  function chooseColorAtColumn(colIndex) {
    if (colIndex >= COLS) {
      return true;
    }

    // Shuffle options so the row still feels random.
    const choices = [...COLORS].sort(() => Math.random() - 0.5);

    for (const color of choices) {
      if (createsHorizontalRunOfFour(rowColors, colIndex, color)) {
        continue;
      }

      if (createsVerticalRunOfFour(colIndex, color)) {
        continue;
      }

      rowColors[colIndex] = color;
      if (chooseColorAtColumn(colIndex + 1)) {
        return true;
      }
      rowColors[colIndex] = null;
    }

    return false;
  }

  if (!chooseColorAtColumn(0)) {
    // Fallback (very unlikely): keep the game running with a random row.
    for (let c = 0; c < COLS; c++) {
      rowColors[c] = COLORS[rand(0, COLORS.length - 1)];
    }
  }

  return rowColors;
}

function createsHorizontalRunOfFour(rowColors, colIndex, color) {
  if (colIndex < 3) return false;

  return (
    rowColors[colIndex - 1] === color
    && rowColors[colIndex - 2] === color
    && rowColors[colIndex - 3] === color
  );
}

function createsVerticalRunOfFour(colIndex, color) {
  let sameColorCountAbove = 0;
  let r = ROWS - 2;

  while (r >= 0 && grid[r][colIndex] && grid[r][colIndex].color === color) {
    sameColorCountAbove++;
    r--;
  }

  return sameColorCountAbove >= 3;
}

function addSludgeBlobToGrid() {
  for (let tries = 0; tries < 24; tries++) {
    const r = rand(6, 13);
    const c = rand(0, 7);
    if (!grid[r][c]) {
      grid[r][c] = makeCell(COLORS[rand(0, COLORS.length - 1)], true);
      contamination = clamp(contamination + SLUDGE_GRID_CONTAM_GAIN, 0, 100);
      playSound(soundWarningBubble, 0.42);
      return;
    }
  }

  for (let tries = 0; tries < 16; tries++) {
    const r = rand(4, 14);
    const c = rand(0, 7);
    if (!grid[r][c]) {
      grid[r][c] = makeCell(COLORS[rand(0, COLORS.length - 1)], true);
      contamination = clamp(contamination + SLUDGE_GRID_CONTAM_GAIN, 0, 100);
      playSound(soundWarningBubble, 0.42);
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

  let type = "jerry";

  // Force a toxic blob after too many jerry cans in a row so sludge always appears.
  if (jerrySpawnStreak >= MAX_JERRY_STREAK) {
    type = "sludge";
  } else {
    type = Math.random() < BASE_SLUDGE_CHANCE ? "sludge" : "jerry";
  }

  if (type === "jerry") {
    jerrySpawnStreak += 1;
  } else {
    jerrySpawnStreak = 0;
  }

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
      purification = clamp(purification + 7, 0, 100);
      showScoreChangeAtItem(item, `+${JERRY_SCORE}`);
      announceMilestone("Nice catch. The jerry can boosted purification.");
      playSound(soundJerryCan, 0.55);
    } else {
      contamination = clamp(contamination - SLUDGE_CLICK_CONTAM_REDUCTION, 0, 100);
      showScoreChangeAtItem(item, `-${SLUDGE_CLICK_CONTAM_REDUCTION}`, "pollution");
    }
    item.remove();
    render();
  });

  floatingItemsEl.appendChild(item);

  if (type === "sludge") {
    const rumbleCount = Math.random() < 0.5 ? 1 : 2;
    item.style.setProperty("--toxic-rumble-count", String(rumbleCount));
    item.classList.add("toxic-appear");
    playSound(soundAlert, 0.42);
  }

  scheduleClickableExpiry(item, type, 5500);
}

function scheduleClickableExpiry(item, type, delayMs) {
  window.setTimeout(() => {
    if (!item.isConnected) return;

    // Freeze expiry effects while paused so no hidden game-state changes occur.
    if (paused || !running || countingDown) {
      scheduleClickableExpiry(item, type, 250);
      return;
    }

    if (type === "sludge") {
      contamination = clamp(contamination + SLUDGE_MISS_CONTAM_GAIN, 0, 100);
      showScoreChangeAtItem(item, `+${SLUDGE_MISS_CONTAM_GAIN}`, "pollution");
      announceMilestone("You missed the sludge. Pollution pushed back.");
      playSound(soundMiss, 0.5);

      if (contamination >= 100) {
        contamination = 0;
        addDirtyBottomRow();
        if (!running) return;
      }
      render();
    } else {
      playSound(soundMiss, 0.35);
    }

    item.remove();
  }, delayMs);
}

function showScoreChangeAtItem(item, text, style = "positive") {
  const feedback = document.createElement("div");
  feedback.className = `score-feedback ${style}`;
  feedback.textContent = text;

  const x = item.offsetLeft + (item.offsetWidth / 2);
  const y = item.offsetTop - 8;
  feedback.style.left = `${x}px`;
  feedback.style.top = `${y}px`;

  floatingItemsEl.appendChild(feedback);

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
  jerrySpawnStreak = 0;
  clearingCells.clear();
  shownMilestones = new Set();
  setMilestoneMessage(DEFAULT_MILESTONE_TEXT);

  // Remove animation classes from the knot
  topTugMarker.classList.remove("pulling-win", "pulling-lose");

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
  jerrySpawnStreak = 0;
  clearingCells.clear();
  shownMilestones = new Set();
  setMilestoneMessage(DEFAULT_MILESTONE_TEXT);

  // Remove animation classes from the knot
  topTugMarker.classList.remove("pulling-win", "pulling-lose");

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
  clearTimeout(milestoneToastTimeout);
  milestoneToast.classList.remove("show");
  playSound(soundPause, 0.5);
  saveGameProgress();
  openOverlay(pauseOverlay);
}

function pauseGameplayForHowOverlay() {
  if (!running || paused || countingDown) return false;

  paused = true;
  clearTimeout(milestoneToastTimeout);
  milestoneToast.classList.remove("show");
  return true;
}

function resumeGameplayFromHowOverlay() {
  if (countingDown || !paused) return;
  paused = false;
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
  stopOtherSounds(soundWin);
  playSound(soundWin, 0.62);

  const timeBonus = calculateTimeBonus();
  const finalScore = score + timeBonus;

  // Animate the knot moving to the right (player wins)
  topTugMarker.classList.add("pulling-win");

  endTitle.textContent = "Victory!";
  endMessage.textContent = message;
  endScore.textContent = `${score} + ${timeBonus} = ${finalScore}`;
  endTimeLabel.textContent = "Time";
  endTime.textContent = formatTime(timeLeft);
  playAgainBtn.textContent = `Level ${currentLevel + 1}`;
  playAgainBtn.dataset.action = "next-level";

  resultVillain.textContent = "🕴️";
  resultPointer.textContent = "";
  resultHero.textContent = HEROES[heroChoice];
  resultWater.className = "result-water clean-water";
  resultStage.className = "result-stage win";
  announceMilestone("Victory. The bottle is clean.");
  openOverlay(endOverlay);
}

function loseGame(message) {
  running = false;
  paused = false;
  clearLoops();
  clearGameProgress();
  stopOtherSounds(soundLose);
  playSound(soundLose, 0.6);

  // Animate the knot moving to the left (player loses)
  topTugMarker.classList.add("pulling-lose");

  endTitle.textContent = "Game Over";
  endMessage.textContent = `${message} The businessman points and laughs as your hero falls into dirty water.`;
  endScore.textContent = String(score);
  endTimeLabel.textContent = "Time";
  endTime.textContent = `${formatTime(timeLeft)} elapsed`;
  playAgainBtn.textContent = "Play Again";
  playAgainBtn.dataset.action = "restart";

  resultVillain.textContent = "😂";
  resultPointer.textContent = "👉";
  resultHero.textContent = HEROES[heroChoice];
  resultHero.style.animation = "none";
  void resultHero.offsetWidth;
  resultHero.style.animation = "";
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

function saveProfileFromForm() {
  const profile = {
    name: playerNameInput.value.trim() || "Player",
    speed: speedSelect.value,
    character: characterSelect.value,
    sound: soundSelect.value
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
  soundEnabled = profile.sound !== "off";

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
    character: "builder",
    sound: "on"
  };

  playerNameInput.value = profile.name;
  speedSelect.value = profile.speed;
  characterSelect.value = profile.character;
  soundSelect.value = profile.sound || "on";
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
    soundEnabled,
    dirtyRowCountdown,
    sludgeCountdown,
    passiveContamCounter,
    nextCapsuleId,
    initialDirtyCount,
    shownMilestones: [...shownMilestones],
    lastMilestoneMessage
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

function continueFromBootScreen() {
  const shouldRestore = checkForSavedGame();
  if (shouldRestore) {
    const savedProgress = loadGameProgress();
    if (savedProgress) {
      restoreGameProgress(savedProgress);
      renderNextPreview();
      render();
      closeOverlay(startOverlay);
      running = true;
      paused = false;
      startLoops();
      return;
    }
  }

  openOverlay(startOverlay);
}

function hideBootScreenAndContinue() {
  closeOverlay(bootOverlay);
  continueFromBootScreen();
}

function showBootScreen() {
  if (!bootOverlay || !bootPrompt) {
    continueFromBootScreen();
    return;
  }

  bootReadyForInput = false;
  bootPrompt.classList.remove("visible");
  openOverlay(bootOverlay);

  clearTimeout(bootTimer);
  bootTimer = window.setTimeout(() => {
    bootReadyForInput = true;
    bootPrompt.classList.add("visible");
  }, 3200);

  const onBegin = () => {
    bootOverlay.removeEventListener("click", onBegin);
    bootOverlay.removeEventListener("touchstart", onBegin);
    document.removeEventListener("keydown", onKeyDownBegin);
    hideBootScreenAndContinue();
  };

  const onKeyDownBegin = (event) => {
    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      onBegin();
    }
  };

  bootOverlay.addEventListener("click", onBegin);
  bootOverlay.addEventListener("touchstart", onBegin, { passive: true });
  document.addEventListener("keydown", onKeyDownBegin);
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
  soundEnabled = progress.soundEnabled !== false;
  dirtyRowCountdown = progress.dirtyRowCountdown;
  sludgeCountdown = progress.sludgeCountdown;
  passiveContamCounter = progress.passiveContamCounter;
  nextCapsuleId = progress.nextCapsuleId;
  initialDirtyCount = progress.initialDirtyCount || countDirtyBlobs();
  shownMilestones = new Set(progress.shownMilestones || []);
  setMilestoneMessage(progress.lastMilestoneMessage || DEFAULT_MILESTONE_TEXT);

  const heroEmoji = HEROES[heroChoice] || HEROES.builder;
  heroPortrait.textContent = heroEmoji;
  heroNameEl.textContent = playerName;
  topHero.textContent = heroEmoji;
  topHeroName.textContent = playerName;
}

function clearGameProgress() {
  localStorage.removeItem(GAME_PROGRESS_KEY);
}

function init() {
  primeCriticalAudio();
  createGrid();
  resetGrid();
  loadProfileIntoForm();
  setMilestoneMessage(DEFAULT_MILESTONE_TEXT);
  render();

  closeOverlay(startOverlay);
  showBootScreen();
}

init();