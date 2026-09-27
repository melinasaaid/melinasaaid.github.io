const COLS = 38;
const ROWS = 18;

const grid = document.getElementById("grid");

let start = { r: 3, c: 4 };
let end = { r: ROWS - 4, c: COLS - 5 };

let mode = "wall";
let isMouseDown = false;
let isRunning = false;

const state = Array.from(
  { length: ROWS },
  () => Array(COLS).fill("empty")
);

const cellEls = Array.from(
  { length: ROWS },
  () => Array(COLS)
);

grid.style.gridTemplateColumns = `repeat(${COLS}, 22px)`;
grid.style.gridTemplateRows = `repeat(${ROWS}, 22px)`;

/* =========================================================
   GRID
========================================================= */

function buildGrid() {
  grid.innerHTML = "";

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = document.createElement("div");

      el.className = "cell";
      el.dataset.r = r;
      el.dataset.c = c;

      el.addEventListener("mousedown", (event) => {
        event.preventDefault();
        isMouseDown = true;
        applyMode(r, c);
      });

      el.addEventListener("mouseenter", () => {
        if (isMouseDown) {
          applyMode(r, c);
        }
      });

      cellEls[r][c] = el;
      grid.appendChild(el);
    }
  }
}

document.body.addEventListener("mouseup", () => {
  isMouseDown = false;
});

function applyMode(r, c) {
  if (isRunning) return;

  if (mode === "start") {
    if (state[r][c] === "wall") return;

    start = { r, c };
    clearVisualOnly();
    renderAll();
    return;
  }

  if (mode === "end") {
    if (state[r][c] === "wall") return;

    end = { r, c };
    clearVisualOnly();
    renderAll();
    return;
  }

  if (start.r === r && start.c === c) return;
  if (end.r === r && end.c === c) return;

  if (mode === "wall") {
    state[r][c] =
      state[r][c] === "wall" ? "empty" : "wall";
  } else if (mode === "weight") {
    state[r][c] =
      state[r][c] === "weight" ? "empty" : "weight";
  }

  renderCell(r, c);
}

function renderCell(r, c) {
  const el = cellEls[r][c];

  el.className = "cell";

  if (start.r === r && start.c === c) {
    el.classList.add("start");
  } else if (end.r === r && end.c === c) {
    el.classList.add("end");
  } else if (state[r][c] === "wall") {
    el.classList.add("wall");
  } else if (state[r][c] === "weight") {
    el.classList.add("weight");
  }
}

function renderAll() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      renderCell(r, c);
    }
  }
}

/* =========================================================
   MODES
========================================================= */

const modeButtons = document.querySelectorAll("[data-mode]");

const modeLabels = {
  wall: "Walls",
  weight: "Terrain",
  start: "Start",
  end: "End"
};

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (isRunning) return;

    mode = btn.dataset.mode;

    modeButtons.forEach((button) => {
      button.classList.toggle("primary", button === btn);
    });

    document.getElementById("mode-label").textContent =
      modeLabels[mode];
  });
});

/* =========================================================
   HELPERS
========================================================= */

function key(r, c) {
  return r * COLS + c;
}

function cost(r, c) {
  return state[r][c] === "weight" ? 5 : 1;
}

function manhattan(r, c) {
  return Math.abs(r - end.r) + Math.abs(c - end.c);
}

function neighbors(r, c) {
  const out = [];

  const deltas = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  for (const [dr, dc] of deltas) {
    const nr = r + dr;
    const nc = c + dc;

    if (
      nr >= 0 &&
      nr < ROWS &&
      nc >= 0 &&
      nc < COLS &&
      state[nr][nc] !== "wall"
    ) {
      out.push([nr, nc]);
    }
  }

  return out;
}

function reconstructPath(cameFrom, endKey) {
  const path = [];
  let current = endKey;

  while (current !== undefined && cameFrom.has(current)) {
    const entry = cameFrom.get(current);
    path.push(entry.pos);
    current = entry.from;
  }

  return path.reverse();
}

function pathCost(path) {
  if (!path || path.length < 2) return 0;

  let total = 0;

  for (let i = 1; i < path.length; i++) {
    total += cost(path[i][0], path[i][1]);
  }

  return total;
}

/* =========================================================
   BFS
========================================================= */

function bfs() {
  const visitedOrder = [];
  const startKey = key(start.r, start.c);
  const endKey = key(end.r, end.c);

  const seen = new Set([startKey]);
  const cameFrom = new Map();

  const queue = [[start.r, start.c]];
  let qi = 0;
  let found = false;

  while (qi < queue.length) {
    const [r, c] = queue[qi++];

    visitedOrder.push([r, c]);

    if (r === end.r && c === end.c) {
      found = true;
      break;
    }

    for (const [nr, nc] of neighbors(r, c)) {
      const k = key(nr, nc);

      if (!seen.has(k)) {
        seen.add(k);

        cameFrom.set(k, {
          pos: [nr, nc],
          from: key(r, c)
        });

        queue.push([nr, nc]);
      }
    }
  }

  const path = found
    ? [[start.r, start.c], ...reconstructPath(cameFrom, endKey)]
    : null;

  return {
    visitedOrder,
    path,
    cost: path ? pathCost(path) : undefined,
    complexity: "O(V + E)"
  };
}

/* =========================================================
   DFS
========================================================= */

function dfs() {
  const visitedOrder = [];
  const endKey = key(end.r, end.c);

  const seen = new Set();
  const cameFrom = new Map();

  const stack = [[start.r, start.c, undefined]];
  let found = false;

  while (stack.length) {
    const [r, c, from] = stack.pop();
    const k = key(r, c);

    if (seen.has(k)) continue;

    seen.add(k);

    if (from !== undefined) {
      cameFrom.set(k, {
        pos: [r, c],
        from
      });
    }

    visitedOrder.push([r, c]);

    if (r === end.r && c === end.c) {
      found = true;
      break;
    }

    for (const [nr, nc] of neighbors(r, c)) {
      if (!seen.has(key(nr, nc))) {
        stack.push([nr, nc, k]);
      }
    }
  }

  const path = found
    ? [[start.r, start.c], ...reconstructPath(cameFrom, endKey)]
    : null;

  return {
    visitedOrder,
    path,
    cost: path ? pathCost(path) : undefined,
    complexity: "O(V + E)"
  };
}

/* =========================================================
   MIN HEAP
========================================================= */

class MinHeap {
  constructor() {
    this.data = [];
  }

  get size() {
    return this.data.length;
  }

  push(item, priority) {
    this.data.push({ item, priority });

    let i = this.data.length - 1;

    while (i > 0) {
      const parent = (i - 1) >> 1;

      if (this.data[parent].priority <= this.data[i].priority) {
        break;
      }

      [this.data[parent], this.data[i]] =
        [this.data[i], this.data[parent]];

      i = parent;
    }
  }

  pop() {
    if (!this.data.length) return undefined;

    const top = this.data[0];
    const last = this.data.pop();

    if (this.data.length) {
      this.data[0] = last;

      let i = 0;

      while (true) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;

        if (
          left < this.data.length &&
          this.data[left].priority < this.data[smallest].priority
        ) {
          smallest = left;
        }

        if (
          right < this.data.length &&
          this.data[right].priority < this.data[smallest].priority
        ) {
          smallest = right;
        }

        if (smallest === i) break;

        [this.data[i], this.data[smallest]] =
          [this.data[smallest], this.data[i]];

        i = smallest;
      }
    }

    return top.item;
  }
}

/* =========================================================
   DIJKSTRA
========================================================= */

function dijkstra() {
  const visitedOrder = [];
  const startKey = key(start.r, start.c);
  const endKey = key(end.r, end.c);

  const dist = new Map([[startKey, 0]]);
  const cameFrom = new Map();
  const seen = new Set();
  const pq = new MinHeap();

  pq.push([start.r, start.c], 0);

  while (pq.size) {
    const current = pq.pop();
    const [r, c] = current;
    const k = key(r, c);

    if (seen.has(k)) continue;

    seen.add(k);
    visitedOrder.push([r, c]);

    if (r === end.r && c === end.c) break;

    for (const [nr, nc] of neighbors(r, c)) {
      const nk = key(nr, nc);
      const newDistance = dist.get(k) + cost(nr, nc);

      if (!dist.has(nk) || newDistance < dist.get(nk)) {
        dist.set(nk, newDistance);

        cameFrom.set(nk, {
          pos: [nr, nc],
          from: k
        });

        pq.push([nr, nc], newDistance);
      }
    }
  }

  const path = dist.has(endKey)
    ? [[start.r, start.c], ...reconstructPath(cameFrom, endKey)]
    : null;

  return {
    visitedOrder,
    path,
    cost: path ? dist.get(endKey) : undefined,
    complexity: "O((V + E) log V)"
  };
}

/* =========================================================
   A*
========================================================= */

function astar() {
  const visitedOrder = [];
  const startKey = key(start.r, start.c);
  const endKey = key(end.r, end.c);

  const g = new Map([[startKey, 0]]);
  const cameFrom = new Map();
  const seen = new Set();
  const pq = new MinHeap();

  pq.push(
    [start.r, start.c],
    manhattan(start.r, start.c)
  );

  while (pq.size) {
    const [r, c] = pq.pop();
    const k = key(r, c);

    if (seen.has(k)) continue;

    seen.add(k);
    visitedOrder.push([r, c]);

    if (r === end.r && c === end.c) break;

    for (const [nr, nc] of neighbors(r, c)) {
      const nk = key(nr, nc);
      const newG = g.get(k) + cost(nr, nc);

      if (!g.has(nk) || newG < g.get(nk)) {
        g.set(nk, newG);

        cameFrom.set(nk, {
          pos: [nr, nc],
          from: k
        });

        pq.push(
          [nr, nc],
          newG + manhattan(nr, nc)
        );
      }
    }
  }

  const path = g.has(endKey)
    ? [[start.r, start.c], ...reconstructPath(cameFrom, endKey)]
    : null;

  return {
    visitedOrder,
    path,
    cost: path ? g.get(endKey) : undefined,
    complexity: "O((V + E) log V)"
  };
}

/* =========================================================
   ALGORITHM REGISTRY
========================================================= */

const ALGORITHMS = {
  bfs: {
    label: "Breadth-First Search",
    fn: bfs
  },
  dfs: {
    label: "Depth-First Search",
    fn: dfs
  },
  dijkstra: {
    label: "Dijkstra's Algorithm",
    fn: dijkstra
  },
  astar: {
    label: "A* Search",
    fn: astar
  }
};

const select = document.getElementById("algo-select");

Object.entries(ALGORITHMS).forEach(([id, algorithm]) => {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = algorithm.label;
  select.appendChild(option);
});

/* =========================================================
   VISUALIZATION + STATS
========================================================= */

function speedDelay() {
  const value = Number(document.getElementById("speed").value);

  // Slider: 1 = slow, 100 = fast.
  return Math.max(1, 30 - Math.round(value * 0.29));
}

function clearVisualOnly() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = cellEls[r][c];

      if (el) {
        el.classList.remove("visited", "path");
      }
    }
  }

  clearStats();
}

function clearStats() {
  document.getElementById("stat-visited").textContent = "–";
  document.getElementById("stat-path").textContent = "–";
  document.getElementById("stat-cost").textContent = "–";
  document.getElementById("stat-time").textContent = "–";
}

function setStats({ visitedOrder, path, cost: resultCost, time }) {
  document.getElementById("stat-visited").textContent =
    visitedOrder.length;

  document.getElementById("stat-path").textContent =
    path ? path.length - 1 : "no path";

  document.getElementById("stat-cost").textContent =
    path
      ? (resultCost !== undefined ? resultCost : pathCost(path))
      : "–";

  document.getElementById("stat-time").textContent =
    `${time.toFixed(2)} ms`;
}

async function animate(visitedOrder, path) {
  const delay = speedDelay();

  for (const [r, c] of visitedOrder) {
    if (start.r === r && start.c === c) continue;
    if (end.r === r && end.c === c) continue;

    const el = cellEls[r][c];

    if (state[r][c] === "wall") continue;

    el.classList.add("visited");

    await new Promise((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  if (!path) return;

  for (const [r, c] of path) {
    if (start.r === r && start.c === c) continue;
    if (end.r === r && end.c === c) continue;

    const el = cellEls[r][c];

    el.classList.remove("visited");
    el.classList.add("path");

    await new Promise((resolve) => {
      setTimeout(resolve, Math.max(4, delay));
    });
  }
}

async function run() {
  if (isRunning) return;

  isRunning = true;
  setControlsDisabled(true);
  clearVisualOnly();

  const algorithm = ALGORITHMS[select.value];

  const t0 = performance.now();
  const result = algorithm.fn();
  const t1 = performance.now();

  setStats({
    ...result,
    time: t1 - t0
  });

  await animate(result.visitedOrder, result.path);

  isRunning = false;
  setControlsDisabled(false);
}

function setControlsDisabled(disabled) {
  document.getElementById("run-btn").disabled = disabled;
  document.getElementById("compare-btn").disabled = disabled;
  document.getElementById("maze-btn").disabled = disabled;
  document.getElementById("clear-btn").disabled = disabled;
  document.getElementById("algo-select").disabled = disabled;
  document.getElementById("speed").disabled = disabled;

  modeButtons.forEach((button) => {
    button.disabled = disabled;
  });
}

/* =========================================================
   CLEAR GRID
========================================================= */

function clearGrid() {
  if (isRunning) return;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      state[r][c] = "empty";
    }
  }

  start = { r: 3, c: 4 };
  end = { r: ROWS - 4, c: COLS - 5 };

  mode = "wall";

  modeButtons.forEach((button) => {
    button.classList.toggle(
      "primary",
      button.dataset.mode === "wall"
    );
  });

  document.getElementById("mode-label").textContent = "Walls";

  clearVisualOnly();
  renderAll();

  document.getElementById("compare-body").innerHTML = `
    <p class="muted">
      Click "Compare Algorithms" to see results.
    </p>
  `;
}

/* =========================================================
   MAZE GENERATION
========================================================= */

function generateMaze() {
  if (isRunning) return;

  clearVisualOnly();

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      state[r][c] = "empty";
    }
  }

  function divide(rMin, rMax, cMin, cMax) {
    const height = rMax - rMin;
    const width = cMax - cMin;

    if (height < 2 || width < 2) return;

    const horizontal =
      height > width
        ? true
        : width > height
          ? false
          : Math.random() < 0.5;

    if (horizontal) {
      let wallRow =
        rMin + 1 + Math.floor(Math.random() * (height - 1));

      if (wallRow % 2 !== 0) {
        wallRow += wallRow + 1 <= rMax - 1 ? 1 : -1;
      }

      const gap =
        cMin + Math.floor(Math.random() * (width + 1));

      for (let c = cMin; c <= cMax; c++) {
        if (c !== gap) {
          state[wallRow][c] = "wall";
        }
      }

      divide(rMin, wallRow - 1, cMin, cMax);
      divide(wallRow + 1, rMax, cMin, cMax);
    } else {
      let wallCol =
        cMin + 1 + Math.floor(Math.random() * (width - 1));

      if (wallCol % 2 !== 0) {
        wallCol += wallCol + 1 <= cMax - 1 ? 1 : -1;
      }

      const gap =
        rMin + Math.floor(Math.random() * (height + 1));

      for (let r = rMin; r <= rMax; r++) {
        if (r !== gap) {
          state[r][wallCol] = "wall";
        }
      }

      divide(rMin, rMax, cMin, wallCol - 1);
      divide(rMin, rMax, wallCol + 1, cMax);
    }
  }

  // Outer border.
  for (let r = 0; r < ROWS; r++) {
    state[r][0] = "wall";
    state[r][COLS - 1] = "wall";
  }

  for (let c = 0; c < COLS; c++) {
    state[0][c] = "wall";
    state[ROWS - 1][c] = "wall";
  }

  divide(1, ROWS - 2, 1, COLS - 2);

  // Never place a wall on start or end.
  state[start.r][start.c] = "empty";
  state[end.r][end.c] = "empty";

  // Add a small amount of terrain to open cells.
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (
        state[r][c] === "empty" &&
        !(start.r === r && start.c === c) &&
        !(end.r === r && end.c === c) &&
        Math.random() < 0.08
      ) {
        state[r][c] = "weight";
      }
    }
  }

  renderAll();

  document.getElementById("compare-body").innerHTML = `
    <p class="muted">
      Maze generated. Run an algorithm or compare the four searches.
    </p>
  `;
}

/* =========================================================
   COMPARISON
========================================================= */

function compareAlgorithms() {
  if (isRunning) return;

  clearVisualOnly();

  const body = document.getElementById("compare-body");
  body.innerHTML = "";

  const results = Object.entries(ALGORITHMS).map(
    ([id, algorithm]) => {
      const t0 = performance.now();
      const result = algorithm.fn();
      const t1 = performance.now();

      return {
        id,
        label: algorithm.label,
        visited: result.visitedOrder.length,
        time: t1 - t0,
        pathLen: result.path ? result.path.length - 1 : null,
        cost:
          result.path
            ? result.cost !== undefined
              ? result.cost
              : pathCost(result.path)
            : null
      };
    }
  );

  const maxVisited = Math.max(
    ...results.map((result) => result.visited),
    1
  );

  results.forEach((result) => {
    const row = document.createElement("div");
    row.className = "compare-row";

    const percentage = Math.round(
      (result.visited / maxVisited) * 100
    );

    row.innerHTML = `
      <div class="compare-label">
        <span>${result.label}</span>
        <span class="compare-meta">
          ${result.visited} nodes ·
          ${result.time.toFixed(2)}ms ·
          path ${result.pathLen ?? "—"}
        </span>
      </div>

      <div class="bar-track">
        <div
          class="bar-fill"
          style="width: ${percentage}%"
        >
          <span class="bar-text">
            ${result.visited} visited
          </span>
        </div>
      </div>
    `;

    body.appendChild(row);
  });
}

/* =========================================================
   BUTTON EVENTS
========================================================= */

document.getElementById("run-btn").addEventListener("click", run);

document
  .getElementById("compare-btn")
  .addEventListener("click", compareAlgorithms);

document
  .getElementById("maze-btn")
  .addEventListener("click", generateMaze);

document
  .getElementById("clear-btn")
  .addEventListener("click", clearGrid);

/* =========================================================
   STARTUP
========================================================= */

buildGrid();
renderAll();
