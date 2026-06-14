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
    
    // Migration: convert legacy boolean 'true' to timestamp
    let migrated = false;
    for (const key in state.progress) {
      if (state.progress[key] === true) {
        state.progress[key] = Date.now();
        migrated = true;
      }
    }
    if (migrated) saveProgress();
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
  const totalQ = allTopics.length;
  const doneQ = allTopics.filter(t => !!state.progress[t.id]).length;

  html += `
    <header class="header">
      <div class="header-title-row">
        <h1 class="header-title">A2Z DSA Course Roadmap</h1>
        <span class="global-count" id="global-question-count">${doneQ} / ${totalQ}</span>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" id="btn-starred">⭐ Starred</button>
        <button class="btn btn-ghost" id="export-btn">${downloadIconSVG()} Export</button>
        <button class="btn btn-ghost" id="import-btn">${uploadIconSVG()} Import</button>
        <button class="btn btn-ghost" id="toggle-all">Expand All</button>
      </div>
    </header>`;

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
  const totalQ = allTopics.length;
  const doneQ = allTopics.filter(t => !!state.progress[t.id]).length;
  setText('global-question-count', `${doneQ} / ${totalQ}`);
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

function applyFilters() {
  // Search and filter logic completely removed as per user request.
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
    if (checkbox.checked) {
      state.progress[id] = Date.now();
    } else {
      delete state.progress[id];
    }
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

  // ── Search & Filter listeners removed ─────────────────────────────────

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
  const previewBtn = document.getElementById('notes-modal-preview-btn');
  const previewDiv = document.getElementById('notes-modal-preview');

  if (titleEl) titleEl.textContent = topicTitle;
  if (textarea) textarea.value = state.notes[topicId] || '';

  // Reset to edit mode
  if (textarea) textarea.classList.remove('hidden');
  if (previewDiv) previewDiv.classList.add('hidden');
  if (previewBtn) previewBtn.textContent = 'Preview';

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
  if (previewBtn) previewBtn.addEventListener('click', () => {
    if (textarea.classList.contains('hidden')) {
      textarea.classList.remove('hidden');
      previewDiv.classList.add('hidden');
      previewBtn.textContent = 'Preview';
      textarea.focus();
    } else {
      textarea.classList.add('hidden');
      previewDiv.classList.remove('hidden');
      previewBtn.textContent = 'Edit';
      if (typeof parseMarkdown === 'function') {
        previewDiv.innerHTML = parseMarkdown(textarea.value);
      } else {
        previewDiv.textContent = textarea.value;
      }
    }
  }, { signal });

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
    // Modal active checks (don't trigger shortcuts if user is typing in a modal)
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    const notesOverlay = document.getElementById('notes-modal-overlay');
    if (notesOverlay && notesOverlay.classList.contains('visible')) return;
    const cmdOverlay = document.getElementById('cmd-palette-overlay');
    if (cmdOverlay && cmdOverlay.classList.contains('visible')) return;
    const starredOverlay = document.getElementById('starred-modal-overlay');
    if (starredOverlay && starredOverlay.classList.contains('visible')) return;

    // Power User Keyboard Navigation
    const highlightClass = 'highlight-row';
    const currentHighlight = document.querySelector('.' + highlightClass);
    
    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault();
      const rows = Array.from(document.querySelectorAll('tr[data-topic-id]:not(.hidden-row)'));
      if (!rows.length) return;
      if (!currentHighlight) {
        rows[0].classList.add(highlightClass);
        rows[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const idx = rows.indexOf(currentHighlight);
        if (idx >= 0 && idx < rows.length - 1) {
          currentHighlight.classList.remove(highlightClass);
          rows[idx + 1].classList.add(highlightClass);
          rows[idx + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault();
      const rows = Array.from(document.querySelectorAll('tr[data-topic-id]:not(.hidden-row)'));
      if (!rows.length) return;
      if (!currentHighlight) {
        rows[rows.length - 1].classList.add(highlightClass);
        rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const idx = rows.indexOf(currentHighlight);
        if (idx > 0) {
          currentHighlight.classList.remove(highlightClass);
          rows[idx - 1].classList.add(highlightClass);
          rows[idx - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } else if (e.key === ' ' && currentHighlight) {
      e.preventDefault();
      const cb = currentHighlight.querySelector('.status-checkbox');
      if (cb) cb.click();
    } else if (e.key.toLowerCase() === 's' && currentHighlight) {
      e.preventDefault();
      const star = currentHighlight.querySelector('.star-cell');
      if (star) star.click();
    } else if ((e.key.toLowerCase() === 'n' || e.key === 'Enter') && currentHighlight) {
      e.preventDefault();
      const note = currentHighlight.querySelector('.notes-cell');
      if (note) note.click();
    }
  });
}

// --- Phase 2 Logic (Heatmap, PWA, Commands, Markdown) ------------------------

function parseMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  // Basic markdown: **bold**, *italic*, `code`, \n -> <br>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/\n/g, '<br>');
  // Also simple links: [text](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
  return html;
}




function jumpToTopic(topicId) {
  const row = document.querySelector(`tr[data-topic-id="${CSS.escape(topicId)}"]`);
  if (!row) return;

  const stepPanel = row.closest('.content');
  const subPanel = row.closest('.sub-content');
  
  if (stepPanel) {
    const btnId = stepPanel.id;
    const btn = document.querySelector(`.collapsible[aria-controls="${btnId}"]`);
    if (btn && btn.getAttribute('aria-expanded') !== 'true') btn.click();
  }
  
  if (subPanel) {
    const btnId = subPanel.id;
    const btn = document.querySelector(`.sub-collapsible[aria-controls="${btnId}"]`);
    if (btn && btn.getAttribute('aria-expanded') !== 'true') btn.click();
  }

  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  row.classList.remove('highlight-row');
  void row.offsetWidth; // reflow
  row.classList.add('highlight-row');
}


function pickRandomProblem() {
  const pending = allTopics.filter(t => !state.progress[t.id]);
  if (pending.length === 0) {
    alert("You've completed all problems! 🎉");
    return;
  }
  const randomTopic = pending[Math.floor(Math.random() * pending.length)];
  jumpToTopic(randomTopic.id);
}

function setupPhase2Listeners() {

  // Random button removed

  const fab = document.getElementById('fab-back-to-top');
  if (fab) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) fab.classList.remove('hidden');
      else fab.classList.add('hidden');
    });
    fab.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Starred Modal
  const starredBtn = document.getElementById('btn-starred');
  const starredOverlay = document.getElementById('starred-modal-overlay');
  const starredClose = document.getElementById('starred-modal-close');
  const starredResults = document.getElementById('starred-palette-results');

  function openStarred() {
    if (!starredOverlay || !starredResults) return;
    starredResults.innerHTML = '';
    
    const starredTopics = allTopics.filter(t => state.stars[t.id]);
    
    if (starredTopics.length === 0) {
      starredResults.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-muted)">No starred problems yet.</div>';
    } else {
      starredTopics.forEach((match) => {
        const item = document.createElement('div');
        item.className = 'cmd-palette-item';
        const diffLabel = getDifficultyLabel(match.difficulty != null ? match.difficulty : 0);
        item.innerHTML = `
          <div class="cmd-palette-item-title">
            <span>${escapeHtml(match.question_title)}</span>
            <span style="font-size:0.75rem; color:var(--text-muted)">${diffLabel}</span>
          </div>
        `;
        item.addEventListener('click', () => {
          starredOverlay.classList.remove('visible');
          jumpToTopic(match.id);
        });
        starredResults.appendChild(item);
      });
    }
    starredOverlay.classList.add('visible');
  }

  if (starredBtn) starredBtn.addEventListener('click', openStarred);
  if (starredClose) starredClose.addEventListener('click', () => starredOverlay.classList.remove('visible'));
  if (starredOverlay) {
    starredOverlay.addEventListener('click', (e) => {
      if (e.target === starredOverlay) starredOverlay.classList.remove('visible');
    });
  }


  const cmdOverlay = document.getElementById('cmd-palette-overlay');
  const cmdInput = document.getElementById('cmd-palette-input');
  const cmdResults = document.getElementById('cmd-palette-results');
  let cmdActiveIndex = -1;
  let cmdMatches = [];

  function closeCmd() {
    if (cmdOverlay) cmdOverlay.classList.remove('visible');
    cmdActiveIndex = -1;
  }

  function renderCmdResults() {
    if (!cmdResults) return;
    cmdResults.innerHTML = '';
    cmdMatches.slice(0, 20).forEach((match, idx) => {
      const item = document.createElement('div');
      item.className = 'cmd-palette-item' + (idx === cmdActiveIndex ? ' active' : '');
      const diffLabel = getDifficultyLabel(match.difficulty != null ? match.difficulty : 0);
      item.innerHTML = `
        <div class="cmd-palette-item-title">
          <span>${escapeHtml(match.question_title)}</span>
          <span style="font-size:0.75rem; color:var(--text-muted)">${diffLabel}</span>
        </div>
      `;
      item.addEventListener('click', () => {
        closeCmd();
        jumpToTopic(match.id);
      });
      cmdResults.appendChild(item);
    });
    if (cmdActiveIndex >= 0) {
      const activeEl = cmdResults.children[cmdActiveIndex];
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  document.addEventListener('keydown', (e) => {
    // Command Palette shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (cmdOverlay) {
        cmdOverlay.classList.add('visible');
        if (cmdInput) {
          cmdInput.value = '';
          cmdMatches = allTopics;
          cmdActiveIndex = -1;
          renderCmdResults();
          cmdInput.focus();
        }
      }
    }
  });

  if (cmdInput) {
    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCmd();
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        cmdActiveIndex = Math.min(cmdActiveIndex + 1, Math.min(cmdMatches.length - 1, 19));
        renderCmdResults();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        cmdActiveIndex = Math.max(cmdActiveIndex - 1, 0);
        renderCmdResults();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (cmdActiveIndex >= 0 && cmdActiveIndex < cmdMatches.length) {
          closeCmd();
          jumpToTopic(cmdMatches[cmdActiveIndex].id);
        }
      }
    });

    cmdInput.addEventListener('input', () => {
      const q = cmdInput.value.toLowerCase();
      cmdMatches = allTopics.filter(t => t.question_title.toLowerCase().includes(q));
      cmdActiveIndex = cmdMatches.length > 0 ? 0 : -1;
      renderCmdResults();
    });
  }

  if (cmdOverlay) {
    cmdOverlay.addEventListener('click', (e) => {
      if (e.target === cmdOverlay) closeCmd();
    });
  }
}

// --- Initialization ----------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Load persisted state into memory
  loadState();

  // Load theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  // Register SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed:', err));
  }

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
      if (typeof setupPhase2Listeners === 'function') setupPhase2Listeners();
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
