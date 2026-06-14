// =============================================================================
// A2Z DSA Course Roadmap — app.js
// =============================================================================

// --- Constants ---------------------------------------------------------------

const STORAGE_KEYS = {
  progress: 'dsaRoadmapProgress',
  notes: 'dsaRoadmapNotes',
  stars: 'dsaRoadmapStars',
};

const DIFFICULTY_MAP = {
  0: { label: 'Easy', cssClass: 'easy' },
  1: { label: 'Medium', cssClass: 'medium' },
  2: { label: 'Hard', cssClass: 'hard' },
};

const platformLogos = {
  BLOG: '<img src="./assets/logo/post.svg" alt="Blog" width="20" height="20">',
  YT:   '<img src="./assets/logo/yt.svg" alt="YouTube" width="20" height="20">',
  TUF:  '<img src="./assets/logo/tuf.svg" alt="TUF+" width="20" height="20">',
  GFG:  '<img src="./assets/logo/gfg.svg" alt="GeeksForGeeks" width="20" height="20">',
  CN:   '<img src="./assets/logo/cn.svg" alt="Coding Ninjas" width="20" height="20">',
  LC:   '<img src="./assets/logo/lc.svg" alt="LeetCode" width="20" height="20">',
};

// --- State -------------------------------------------------------------------

const state = {
  progress: {},
  notes: {},
  stars: {},
};

/** Flat list of all topic objects — populated during render */
let allTopics = [];

/** Current filter state */
const filters = {
  searchQuery: '',
  statusFilter: 'all',
  difficultyFilter: 'all',
};

/** Whether all sections are currently expanded */
let allExpanded = false;

/** Reference to the loaded JSON data */
let roadmapData = null;

// --- Utility Functions -------------------------------------------------------

/**
 * Escape special HTML characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate that a URL starts with http:// or https://.
 * @param {string} url
 * @returns {boolean}
 */
function isValidUrl(url) {
  if (typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

// --- localStorage Helpers ----------------------------------------------------

function loadState() {
  try {
    const p = localStorage.getItem(STORAGE_KEYS.progress);
    state.progress = p ? JSON.parse(p) : {};
  } catch { state.progress = {}; }

  try {
    const n = localStorage.getItem(STORAGE_KEYS.notes);
    state.notes = n ? JSON.parse(n) : {};
  } catch { state.notes = {}; }

  try {
    const s = localStorage.getItem(STORAGE_KEYS.stars);
    state.stars = s ? JSON.parse(s) : {};
  } catch { state.stars = {}; }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(state.progress));
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(state.notes));
}

function saveStars() {
  localStorage.setItem(STORAGE_KEYS.stars, JSON.stringify(state.stars));
}

// --- SVG Helpers -------------------------------------------------------------

function notesEmptySVG() {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/><line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="12" y1="9.5" x2="12" y2="16.5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;
}

function notesFilledSVG() {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/><line x1="8" y1="10" x2="16" y2="10" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="8" y1="13.5" x2="16" y2="13.5" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="8" y1="17" x2="13" y2="17" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;
}

function downloadIconSVG() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
}

function uploadIconSVG() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
}

// --- Render Functions --------------------------------------------------------

/**
 * Get the CSS class suffix for a difficulty level.
 * @param {number} difficulty
 * @returns {string}
 */
function getDifficultyClass(difficulty) {
  return (DIFFICULTY_MAP[difficulty] || DIFFICULTY_MAP[0]).cssClass;
}

/**
 * Get the human-readable label for a difficulty level.
 * @param {number} difficulty
 * @returns {string}
 */
function getDifficultyLabel(difficulty) {
  return (DIFFICULTY_MAP[difficulty] || DIFFICULTY_MAP[0]).label;
}

/**
 * Build a single link table cell.
 * @param {string|null} url
 * @param {string} label — one of BLOG, YT, TUF, GFG, CN, LC
 * @returns {string} HTML string
 */
function createLinkCell(url, label) {
  if (url && isValidUrl(url)) {
    const logo = platformLogos[label] || escapeHtml(label);
    return `<td class="link-cell"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(label)}">${logo}</a></td>`;
  }
  return `<td class="na-cell">-</td>`;
}

/**
 * Generate the complete roadmap UI and inject it into #app-container.
 * @param {Array} data — parsed JSON from a2z.json
 */
function generateRoadmap(data) {
  const container = document.getElementById('app-container');
  if (!container) return;

  // Build flat topic list for stats
  allTopics = [];
  data.forEach((step) => {
    (step.sub_steps || []).forEach((sub) => {
      (sub.topics || []).forEach((topic) => {
        allTopics.push(topic);
      });
    });
  });

  let html = '';

  // ── Header ──────────────────────────────────────────────────────────────
  html += `
    <header class="header">
      <h1 class="header-title">A2Z DSA Course Roadmap</h1>
      <div class="header-actions">
        <button class="btn btn-ghost" id="export-btn">${downloadIconSVG()} Export</button>
        <button class="btn btn-ghost" id="import-btn">${uploadIconSVG()} Import</button>
        <button class="btn btn-ghost" id="toggle-all">Expand All</button>
      </div>
    </header>`;

  // ── Stats Dashboard ─────────────────────────────────────────────────────
  html += `
    <div class="stats-dashboard">
      <div class="stat-card stat-card-total">
        <div class="stat-value" id="stat-total-value">0</div>
        <div class="stat-label">Total Problems</div>
      </div>
      <div class="stat-card stat-card-completed">
        <div class="stat-value" id="stat-completed-value">0</div>
        <div class="stat-label">Completed</div>
        <div class="stat-sub" id="stat-completed-pct">0%</div>
      </div>
      <div class="stat-card stat-card-pending">
        <div class="stat-value" id="stat-pending-value">0</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat-card stat-card-starred">
        <div class="stat-value" id="stat-starred-value">0</div>
        <div class="stat-label">Starred</div>
      </div>
    </div>`;

  // ── Difficulty Breakdown ────────────────────────────────────────────────
  html += `
    <div class="difficulty-stats">
      <div class="difficulty-stats-title">Difficulty Breakdown</div>
      <div class="difficulty-bar-container">
        <div class="difficulty-bar">
          <div class="difficulty-bar-segment easy" id="diff-bar-easy" style="width:0%"></div>
          <div class="difficulty-bar-segment medium" id="diff-bar-medium" style="width:0%"></div>
          <div class="difficulty-bar-segment hard" id="diff-bar-hard" style="width:0%"></div>
        </div>
        <div class="difficulty-legend">
          <span class="difficulty-legend-item"><span class="difficulty-legend-dot easy"></span> Easy <span id="diff-legend-easy">0/0</span></span>
          <span class="difficulty-legend-item"><span class="difficulty-legend-dot medium"></span> Medium <span id="diff-legend-medium">0/0</span></span>
          <span class="difficulty-legend-item"><span class="difficulty-legend-dot hard"></span> Hard <span id="diff-legend-hard">0/0</span></span>
        </div>
      </div>
    </div>`;

  // ── Search & Filters ────────────────────────────────────────────────────
  html += `
    <div class="search-filter-bar">
      <div class="search-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="search-input" id="search-input" placeholder="Search problems... (Ctrl+K)">
        <span class="kbd-hint">Ctrl+K</span>
      </div>
      <div class="filter-row">
        <span class="filter-label">Status:</span>
        <button class="filter-chip active" data-status="all">All</button>
        <button class="filter-chip" data-status="pending">Pending</button>
        <button class="filter-chip" data-status="completed">Completed</button>
        <button class="filter-chip" data-status="starred">⭐ Starred</button>
        <span class="filter-label" style="margin-left:0.5rem">Difficulty:</span>
        <button class="filter-chip active" data-difficulty="all">All</button>
        <button class="filter-chip filter-chip-easy" data-difficulty="0">Easy</button>
        <button class="filter-chip filter-chip-medium" data-difficulty="1">Medium</button>
        <button class="filter-chip filter-chip-hard" data-difficulty="2">Hard</button>
        <span class="filter-results" id="filter-results"></span>
      </div>
    </div>`;

  // ── Roadmap Content ─────────────────────────────────────────────────────
  html += `<div id="roadmap-content">`;

  data.forEach((step) => {
    const stepNo = step.step_no;
    const stepTitle = escapeHtml(step.step_title);

    // Count total topics in this step for the progress counter
    let stepTotal = 0;
    (step.sub_steps || []).forEach((sub) => {
      stepTotal += (sub.topics || []).length;
    });
    const stepDone = countStepCompleted(step);

    const stepProgressPct = stepTotal > 0 ? (stepDone / stepTotal) * 100 : 0;
    const stepCompleted = stepTotal > 0 && stepDone === stepTotal;

    html += `
      <div class="step-section">
        <button type="button" class="collapsible${stepCompleted ? ' completed' : ''}" aria-expanded="false" aria-controls="content-step${stepNo}" data-step="${stepNo}" style="--progress-width:${stepProgressPct}%">
          <span class="collapsible-title">Step ${stepNo}: ${stepTitle}</span>
          <span class="progress-counter">${stepDone}/${stepTotal}</span>
        </button>
        <div class="content" id="content-step${stepNo}" role="region">`;

    (step.sub_steps || []).forEach((sub) => {
      const subNo = sub.sub_step_no;
      const subTitle = escapeHtml(sub.sub_step_title);
      const subTotal = (sub.topics || []).length;
      const subDone = countSubStepCompleted(sub);
      const subPct = subTotal > 0 ? (subDone / subTotal) * 100 : 0;
      const subCompleted = subTotal > 0 && subDone === subTotal;

      html += `
          <button type="button" class="sub-collapsible${subCompleted ? ' completed' : ''}" aria-expanded="false" aria-controls="sub-content-${stepNo}-${subNo}" data-step="${stepNo}" data-substep="${subNo}" style="--progress-width:${subPct}%">
            <span class="collapsible-title">${subNo}. ${subTitle}</span>
            <span class="progress-counter">${subDone}/${subTotal}</span>
          </button>
          <div class="sub-content" id="sub-content-${stepNo}-${subNo}" role="region">
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>BLOG</th>
                    <th>YT</th>
                    <th>LC</th>
                    <th>GFG</th>
                    <th>CN</th>
                    <th>TUF</th>
                    <th>📝</th>
                    <th>⭐</th>
                    <th>Done</th>
                  </tr>
                </thead>
                <tbody>`;

      (sub.topics || []).forEach((topic) => {
        const id = topic.id;
        const title = escapeHtml(topic.question_title);
        const diff = topic.difficulty != null ? topic.difficulty : 0;
        const diffClass = getDifficultyClass(diff);
        const diffLabel = getDifficultyLabel(diff);
        const isCompleted = !!state.progress[id];
        const isStarred = !!state.stars[id];
        const hasNotes = !!state.notes[id];

        const rowClasses = [
          `difficulty-${diffClass}`,
          isCompleted ? 'completed' : '',
          isStarred ? 'starred' : '',
        ].filter(Boolean).join(' ');

        html += `
                  <tr class="${rowClasses}" data-topic-id="${escapeHtml(id)}" data-difficulty="${diff}" data-topic-title="${title}">
                    <td class="topic-cell">
                      <div class="topic-title">
                        ${title} <span class="difficulty-badge difficulty-badge-${diffClass}">${diffLabel}</span>
                      </div>
                    </td>
                    ${createLinkCell(topic.post_link, 'BLOG')}
                    ${createLinkCell(topic.yt_link, 'YT')}
                    ${createLinkCell(topic.lc_link, 'LC')}
                    ${createLinkCell(topic.gfg_link, 'GFG')}
                    ${createLinkCell(topic.cs_link, 'CN')}
                    ${createLinkCell(topic.plus_link, 'TUF')}
                    <td class="notes-cell" data-notes-id="${escapeHtml(id)}" data-topic-title="${title}">
                      <span class="notes-icon ${hasNotes ? 'has-note' : 'empty'}" data-notes-id="${escapeHtml(id)}">${hasNotes ? notesFilledSVG() : notesEmptySVG()}</span>
                    </td>
                    <td class="star-cell" data-star-id="${escapeHtml(id)}">
                      <span class="star-icon${isStarred ? ' starred' : ''}" data-star-id="${escapeHtml(id)}">★</span>
                    </td>
                    <td class="status-cell">
                      <input type="checkbox" class="status-checkbox" data-id="${escapeHtml(id)}" ${isCompleted ? 'checked' : ''} aria-label="Mark ${title} as complete">
                    </td>
                  </tr>`;
      });

      html += `
                </tbody>
              </table>
            </div>
          </div>`;
    });

    html += `
        </div>
      </div>`;
  });

  html += `</div>`; // end #roadmap-content

  container.innerHTML = html;

  // Refresh stats on initial render
  updateStats();
}

// --- Counter Helpers ---------------------------------------------------------

function countStepCompleted(step) {
  let done = 0;
  (step.sub_steps || []).forEach((sub) => {
    (sub.topics || []).forEach((t) => {
      if (state.progress[t.id]) done++;
    });
  });
  return done;
}

function countSubStepCompleted(sub) {
  let done = 0;
  (sub.topics || []).forEach((t) => {
    if (state.progress[t.id]) done++;
  });
  return done;
}

// --- Stats Functions ---------------------------------------------------------

/**
 * Recalculate and render the stats dashboard values.
 */
function updateStats() {
  const total = allTopics.length;
  let completed = 0;
  let starred = 0;
  const diffTotals = { 0: 0, 1: 0, 2: 0 };
  const diffDone = { 0: 0, 1: 0, 2: 0 };

  allTopics.forEach((topic) => {
    const diff = topic.difficulty != null ? topic.difficulty : 0;
    diffTotals[diff] = (diffTotals[diff] || 0) + 1;

    if (state.progress[topic.id]) {
      completed++;
      diffDone[diff] = (diffDone[diff] || 0) + 1;
    }
    if (state.stars[topic.id]) {
      starred++;
    }
  });

  const pending = total - completed;
  const pct = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

  // Update stat cards
  setText('stat-total-value', total);
  setText('stat-completed-value', completed);
  setText('stat-completed-pct', pct + '%');
  setText('stat-pending-value', pending);
  setText('stat-starred-value', starred);

  // Update difficulty bar segments
  const setBar = (id, count) => {
    const el = document.getElementById(id);
    if (el) el.style.width = total > 0 ? ((count / total) * 100).toFixed(2) + '%' : '0%';
  };
  setBar('diff-bar-easy', diffTotals[0]);
  setBar('diff-bar-medium', diffTotals[1]);
  setBar('diff-bar-hard', diffTotals[2]);

  // Update legend text
  setText('diff-legend-easy', `${diffDone[0]}/${diffTotals[0]}`);
  setText('diff-legend-medium', `${diffDone[1]}/${diffTotals[1]}`);
  setText('diff-legend-hard', `${diffDone[2]}/${diffTotals[2]}`);
}

/** Safe helper — set textContent by id */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// --- Update Counters ---------------------------------------------------------

/**
 * After a checkbox toggle, recalculate progress counters on collapsible headers
 * and refresh the stats dashboard.
 */
function updateCounters() {
  // Sub-collapsibles
  document.querySelectorAll('.sub-collapsible').forEach((btn) => {
    const controlId = btn.getAttribute('aria-controls');
    const panel = document.getElementById(controlId);
    if (!panel) return;

    const checkboxes = panel.querySelectorAll('.status-checkbox');
    const total = checkboxes.length;
    let done = 0;
    checkboxes.forEach((cb) => { if (cb.checked) done++; });

    const counter = btn.querySelector('.progress-counter');
    if (counter) counter.textContent = `${done}/${total}`;

    const pct = total > 0 ? (done / total) * 100 : 0;
    btn.style.setProperty('--progress-width', pct + '%');

    if (total > 0 && done === total) {
      btn.classList.add('completed');
    } else {
      btn.classList.remove('completed');
    }
  });

  // Step-level collapsibles
  document.querySelectorAll('.collapsible').forEach((btn) => {
    const controlId = btn.getAttribute('aria-controls');
    const panel = document.getElementById(controlId);
    if (!panel) return;

    const checkboxes = panel.querySelectorAll('.status-checkbox');
    const total = checkboxes.length;
    let done = 0;
    checkboxes.forEach((cb) => { if (cb.checked) done++; });

    const counter = btn.querySelector('.progress-counter');
    if (counter) counter.textContent = `${done}/${total}`;

    const pct = total > 0 ? (done / total) * 100 : 0;
    btn.style.setProperty('--progress-width', pct + '%');

    if (total > 0 && done === total) {
      btn.classList.add('completed');
    } else {
      btn.classList.remove('completed');
    }
  });

  updateStats();
}

// --- Filter Functions --------------------------------------------------------

/**
 * Apply all active filters (search + status + difficulty) to topic rows.
 * Hides sections where all rows are hidden and shows a placeholder message.
 */
function applyFilters() {
  const query = filters.searchQuery.toLowerCase();
  const statusF = filters.statusFilter;
  const diffF = filters.difficultyFilter;

  const rows = document.querySelectorAll('#roadmap-content tr[data-topic-id]');
  let visibleCount = 0;
  const totalCount = rows.length;

  rows.forEach((row) => {
    const title = (row.getAttribute('data-topic-title') || '').toLowerCase();
    const diff = row.getAttribute('data-difficulty');
    const id = row.getAttribute('data-topic-id');
    const isCompleted = !!state.progress[id];
    const isStarred = !!state.stars[id];

    // Search match
    const matchesSearch = !query || title.includes(query);

    // Status match
    let matchesStatus = true;
    if (statusF === 'pending') matchesStatus = !isCompleted;
    else if (statusF === 'completed') matchesStatus = isCompleted;
    else if (statusF === 'starred') matchesStatus = isStarred;

    // Difficulty match
    const matchesDiff = diffF === 'all' || diff === diffF;

    if (matchesSearch && matchesStatus && matchesDiff) {
      row.classList.remove('hidden-row');
      visibleCount++;
    } else {
      row.classList.add('hidden-row');
    }
  });

  // Update results count
  const resultsEl = document.getElementById('filter-results');
  if (resultsEl) {
    if (query || statusF !== 'all' || diffF !== 'all') {
      resultsEl.textContent = `Showing ${visibleCount} of ${totalCount}`;
    } else {
      resultsEl.textContent = '';
    }
  }

  // Hide/show sub-sections and add placeholder messages
  document.querySelectorAll('.sub-content').forEach((panel) => {
    const tbody = panel.querySelector('tbody');
    if (!tbody) return;

    const allRows = tbody.querySelectorAll('tr[data-topic-id]');
    const visibleRows = tbody.querySelectorAll('tr[data-topic-id]:not(.hidden-row)');

    // Remove existing placeholder
    const existing = panel.querySelector('.no-results-message');
    if (existing) existing.remove();

    if (allRows.length > 0 && visibleRows.length === 0) {
      const msg = document.createElement('div');
      msg.className = 'no-results-message';
      msg.textContent = 'No matching problems';
      panel.appendChild(msg);
    }
  });

  // Hide step sections where ALL rows are hidden
  document.querySelectorAll('.step-section').forEach((section) => {
    const allRows = section.querySelectorAll('tr[data-topic-id]');
    const visibleRows = section.querySelectorAll('tr[data-topic-id]:not(.hidden-row)');

    if (allRows.length > 0 && visibleRows.length === 0) {
      section.classList.add('hidden-row');
    } else {
      section.classList.remove('hidden-row');
    }
  });
}

// --- Event Listeners ---------------------------------------------------------

function addEventListeners() {
  const container = document.getElementById('app-container');
  if (!container) return;

  // ── Collapsible toggle (event delegation) ─────────────────────────────
  container.addEventListener('click', (e) => {
    // Step-level collapsible
    const collapsible = e.target.closest('.collapsible:not(.sub-collapsible)');
    if (collapsible) {
      const isExpanded = collapsible.getAttribute('aria-expanded') === 'true';
      const contentId = collapsible.getAttribute('aria-controls');
      const content = document.getElementById(contentId);
      if (!content) return;

      if (isExpanded) {
        // Collapse
        collapsible.classList.remove('active');
        collapsible.setAttribute('aria-expanded', 'false');
        content.style.maxHeight = null;
      } else {
        // Expand
        collapsible.classList.add('active');
        collapsible.setAttribute('aria-expanded', 'true');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
      return;
    }

    // Sub-level collapsible
    const subCollapsible = e.target.closest('.sub-collapsible');
    if (subCollapsible) {
      const isExpanded = subCollapsible.getAttribute('aria-expanded') === 'true';
      const contentId = subCollapsible.getAttribute('aria-controls');
      const content = document.getElementById(contentId);
      if (!content) return;

      if (isExpanded) {
        subCollapsible.classList.remove('active');
        subCollapsible.setAttribute('aria-expanded', 'false');
        content.style.maxHeight = null;
      } else {
        subCollapsible.classList.add('active');
        subCollapsible.setAttribute('aria-expanded', 'true');
        content.style.maxHeight = content.scrollHeight + 'px';

        // Ensure parent .content grows to accommodate
        const parentContent = subCollapsible.closest('.content');
        if (parentContent) {
          parentContent.style.maxHeight = parentContent.scrollHeight + content.scrollHeight + 'px';
        }
      }
      return;
    }
  });

  // ── Status checkbox toggle (event delegation) ─────────────────────────
  container.addEventListener('click', (e) => {
    const statusCell = e.target.closest('.status-cell');
    if (!statusCell) return;

    const checkbox = statusCell.querySelector('.status-checkbox');
    if (!checkbox) return;

    // If the click was directly on the checkbox, it already toggled
    if (e.target !== checkbox) {
      checkbox.checked = !checkbox.checked;
    }

    const id = checkbox.getAttribute('data-id');
    state.progress[id] = checkbox.checked;
    saveProgress();

    const row = checkbox.closest('tr');
    if (row) {
      row.classList.toggle('completed', checkbox.checked);
    }

    updateCounters();
    applyFilters();
  });

  // ── Star toggle (event delegation) ────────────────────────────────────
  container.addEventListener('click', (e) => {
    const starCell = e.target.closest('.star-cell');
    if (!starCell) return;

    const id = starCell.getAttribute('data-star-id');
    if (!id) return;

    state.stars[id] = !state.stars[id];
    if (!state.stars[id]) delete state.stars[id];
    saveStars();

    const icon = starCell.querySelector('.star-icon');
    if (icon) icon.classList.toggle('starred', !!state.stars[id]);

    const row = starCell.closest('tr');
    if (row) row.classList.toggle('starred', !!state.stars[id]);

    updateStats();
    applyFilters();
  });

  // ── Notes modal (event delegation) ────────────────────────────────────
  container.addEventListener('click', (e) => {
    const notesCell = e.target.closest('.notes-cell');
    if (!notesCell) return;

    const id = notesCell.getAttribute('data-notes-id');
    const topicTitle = notesCell.getAttribute('data-topic-title') || '';
    openNotesModal(id, topicTitle);
  });

  // ── Search input ──────────────────────────────────────────────────────
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filters.searchQuery = searchInput.value.trim();
      applyFilters();
    });
  }

  // ── Status filter chips ───────────────────────────────────────────────
  container.querySelectorAll('.filter-chip[data-status]').forEach((chip) => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.filter-chip[data-status]').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      filters.statusFilter = chip.getAttribute('data-status');
      applyFilters();
    });
  });

  // ── Difficulty filter chips ───────────────────────────────────────────
  container.querySelectorAll('.filter-chip[data-difficulty]').forEach((chip) => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.filter-chip[data-difficulty]').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      filters.difficultyFilter = chip.getAttribute('data-difficulty');
      applyFilters();
    });
  });

  // ── Toggle all ────────────────────────────────────────────────────────
  const toggleAllBtn = document.getElementById('toggle-all');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      allExpanded = !allExpanded;
      toggleAllBtn.textContent = allExpanded ? 'Collapse All' : 'Expand All';

      // Step-level collapsibles
      document.querySelectorAll('.collapsible:not(.sub-collapsible)').forEach((btn) => {
        const contentId = btn.getAttribute('aria-controls');
        const content = document.getElementById(contentId);
        if (!content) return;

        if (allExpanded) {
          btn.classList.add('active');
          btn.setAttribute('aria-expanded', 'true');
          content.style.maxHeight = content.scrollHeight + 'px';
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-expanded', 'false');
          content.style.maxHeight = null;
        }
      });

      // Sub-level collapsibles
      document.querySelectorAll('.sub-collapsible').forEach((btn) => {
        const contentId = btn.getAttribute('aria-controls');
        const content = document.getElementById(contentId);
        if (!content) return;

        if (allExpanded) {
          btn.classList.add('active');
          btn.setAttribute('aria-expanded', 'true');
          content.style.maxHeight = content.scrollHeight + 'px';
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-expanded', 'false');
          content.style.maxHeight = null;
        }
      });

      // Re-adjust parent max-heights when expanding
      if (allExpanded) {
        document.querySelectorAll('.content').forEach((panel) => {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        });
      }
    });
  }

  // ── Export button ─────────────────────────────────────────────────────
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportProgress);
  }

  // ── Import button ─────────────────────────────────────────────────────
  const importBtn = document.getElementById('import-btn');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const fileInput = document.getElementById('import-file-input');
      if (fileInput) fileInput.click();
    });
  }

  const importFileInput = document.getElementById('import-file-input');
  if (importFileInput) {
    importFileInput.addEventListener('change', importProgress);
  }
}

// --- Notes Modal -------------------------------------------------------------

function openNotesModal(topicId, topicTitle) {
  const modal = document.getElementById('notes-modal-overlay');
  if (!modal) return;

  const titleEl = document.getElementById('notes-modal-title');
  const textarea = document.getElementById('notes-modal-textarea');
  const saveBtn = document.getElementById('notes-modal-save');
  const deleteBtn = document.getElementById('notes-modal-delete');
  const cancelBtn = document.getElementById('notes-modal-cancel');

  if (titleEl) titleEl.textContent = topicTitle;
  if (textarea) textarea.value = state.notes[topicId] || '';

  modal.classList.add('visible');
  if (textarea) textarea.focus();

  // Clean up previous listeners using AbortController
  const controller = new AbortController();
  const signal = controller.signal;

  function closeModal() {
    modal.classList.remove('visible');
    controller.abort();
  }

  function saveNote() {
    const text = textarea ? textarea.value.trim() : '';
    if (text) {
      state.notes[topicId] = text;
    } else {
      delete state.notes[topicId];
    }
    saveNotes();
    updateNotesIcon(topicId, !!text);
    closeModal();
  }

  function deleteNote() {
    delete state.notes[topicId];
    saveNotes();
    updateNotesIcon(topicId, false);
    closeModal();
  }

  if (saveBtn) saveBtn.addEventListener('click', saveNote, { signal });
  if (deleteBtn) deleteBtn.addEventListener('click', deleteNote, { signal });
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal, { signal });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  }, { signal });

  // Close on Escape, Save on Ctrl+Enter
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      saveNote();
    }
  }, { signal });
}

/**
 * Update the notes icon for a given topic.
 * @param {string} topicId
 * @param {boolean} hasFilled
 */
function updateNotesIcon(topicId, hasFilled) {
  const icons = document.querySelectorAll(`.notes-icon[data-notes-id="${CSS.escape(topicId)}"]`);
  icons.forEach((icon) => {
    icon.innerHTML = hasFilled ? notesFilledSVG() : notesEmptySVG();
    icon.classList.toggle('has-note', hasFilled);
    icon.classList.toggle('empty', !hasFilled);
  });
}

// --- Export / Import ---------------------------------------------------------

function exportProgress() {
  const data = {
    progress: state.progress,
    notes: state.notes,
    stars: state.stars,
    exportDate: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'a2z-progress-backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importProgress(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);

      // Merge imported data into state
      if (imported.progress && typeof imported.progress === 'object') {
        Object.assign(state.progress, imported.progress);
      }
      if (imported.notes && typeof imported.notes === 'object') {
        Object.assign(state.notes, imported.notes);
      }
      if (imported.stars && typeof imported.stars === 'object') {
        Object.assign(state.stars, imported.stars);
      }

      // Persist
      saveProgress();
      saveNotes();
      saveStars();

      // Re-render
      if (roadmapData) {
        generateRoadmap(roadmapData);
        addEventListeners();
        applyFilters();
      }
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import progress. Please check the file format.');
    }
  };
  reader.readAsText(file);

  // Reset input so the same file can be re-imported
  e.target.value = '';
}

// --- Keyboard Shortcuts ------------------------------------------------------

function addKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+K / Cmd+K — focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.focus();
      return;
    }

    // Escape — close modal or blur search
    if (e.key === 'Escape') {
      const modal = document.getElementById('notes-modal-overlay');
      if (modal && modal.classList.contains('visible')) {
        // Modal close is handled by the modal's own listener
        return;
      }

      const searchInput = document.getElementById('search-input');
      if (searchInput && document.activeElement === searchInput) {
        searchInput.blur();
        filters.searchQuery = '';
        searchInput.value = '';
        applyFilters();
      }
    }
  });
}

// --- Initialization ----------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Load persisted state into memory
  loadState();

  // Fetch and render the roadmap
  fetch('./a2z.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    })
    .then((data) => {
      roadmapData = data;
      generateRoadmap(data);
      addEventListeners();
      addKeyboardShortcuts();
      applyFilters();
    })
    .catch((err) => {
      console.error('Failed to load roadmap data:', err);
      const container = document.getElementById('app-container');
      if (container) {
        container.innerHTML = `
          <div class="error-message" style="text-align:center;padding:3rem;color:#ef4444;">
            <h2>Failed to load roadmap data</h2>
            <p>${escapeHtml(err.message)}</p>
            <p>Please ensure <code>a2z.json</code> is in the same directory and try again.</p>
          </div>`;
      }
    });
});
