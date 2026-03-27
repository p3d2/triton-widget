// ==========================================
// TRITON CLUSTER MONITOR v2.0
// New: Search, Notifications, Expandable Details,
//      Stats Bar, Theme Toggle, Keyboard Shortcuts,
//      Sorting, Smooth Animations
// ==========================================

(() => {
  // ==========================================
  // 1. STATE
  // ==========================================
  let currentTab = 'running';
  let currentInterval = 30000;
  let lastActivity = Date.now();
  let pipWindow = null;
  let fetchTimer = null;
  let searchQuery = '';
  let sortBy = 'time-desc'; // 'time-desc', 'time-asc', 'status', 'id'
  let notificationsEnabled = false;
  let previousJobIds = new Set();
  let firstLoad = true;
  let theme = localStorage.getItem('tw-theme') || 'dark';
  let expandedJobs = new Set();
  let lastJobData = [];
  let isCollapsed = false;

  // ==========================================
  // 2. THEME DEFINITIONS
  // ==========================================
  const themes = {
    dark: {
      bg: 'rgba(10, 10, 10, 0.95)',
      headerBg: '#1a1a1a',
      cardBg: '#222',
      border: '#444',
      text: '#eee',
      textMuted: '#aaa',
      textDim: '#666',
      accent: '#4ade80',
      accentWarm: '#fbbf24',
      danger: '#f87171',
      link: '#6ea8fe',
      inputBg: '#2a2a2a',
      statsBg: '#161616',
      scrollThumb: '#555',
    },
    light: {
      bg: 'rgba(252, 252, 252, 0.97)',
      headerBg: '#f0f0f0',
      cardBg: '#fff',
      border: '#ddd',
      text: '#1a1a1a',
      textMuted: '#666',
      textDim: '#999',
      accent: '#16a34a',
      accentWarm: '#d97706',
      danger: '#dc2626',
      link: '#2563eb',
      inputBg: '#e8e8e8',
      statsBg: '#e4e4e4',
      scrollThumb: '#bbb',
    },
  };

  function t() { return themes[theme]; }

  // ==========================================
  // 3. INJECT STYLES
  // ==========================================
  const styleEl = document.createElement('style');
  styleEl.id = 'tw-styles';
  document.head.appendChild(styleEl);

  function updateStyles() {
    const c = t();
    styleEl.textContent = `
      #tw-widget {
        position: fixed; bottom: 20px; right: 20px; width: 300px;
        background: ${c.bg}; backdrop-filter: blur(8px);
        border: 1px solid ${c.border}; border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        z-index: 999999; font-family: 'Consolas', 'Courier New', monospace;
        color: ${c.text}; font-size: 11px;
        display: flex; flex-direction: column;
        transition: opacity 0.2s, transform 0.2s;
        overflow: hidden;
      }
      #tw-widget.tw-collapsed {
        width: 300px;
      }
      #tw-widget.tw-hidden {
        opacity: 0; transform: translateY(20px) scale(0.95);
        pointer-events: none;
      }
      #tw-header {
        cursor: grab; display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid ${c.border}; padding: 8px 10px;
        background: ${c.headerBg}; border-radius: 10px 10px 0 0;
        user-select: none;
      }
      #tw-header:active { cursor: grabbing; }
      .tw-tab {
        cursor: pointer; font-weight: bold; font-size: 11px;
        padding: 2px 6px; border-radius: 3px;
        transition: background 0.15s, color 0.15s;
      }
      .tw-tab:hover { background: rgba(255,255,255,0.08); }
      .tw-tab.active { color: ${c.accent} !important; }
      .tw-tab:not(.active) { color: ${c.textDim}; }

      #tw-stats-bar {
        display: flex; gap: 10px; padding: 5px 10px;
        background: ${c.statsBg}; font-size: 10px; color: ${c.textMuted};
        border-bottom: 1px solid ${c.border};
        justify-content: space-between; align-items: center;
      }
      .tw-stat { display: flex; align-items: center; gap: 3px; }
      .tw-stat-dot {
        width: 6px; height: 6px; border-radius: 50%; display: inline-block;
      }

      #tw-search {
        margin: 8px 10px 4px; padding: 5px 8px;
        background: ${c.inputBg}; border: 1px solid ${c.border};
        border-radius: 5px; color: ${c.text}; font-family: inherit;
        font-size: 11px; outline: none;
        transition: border-color 0.15s;
      }
      #tw-search:focus { border-color: ${c.accent}; }
      #tw-search::placeholder { color: ${c.textDim}; }

      #tw-job-list {
        max-height: 280px; overflow-y: auto; padding: 6px 10px 10px;
        scroll-behavior: smooth;
      }
      #tw-job-list::-webkit-scrollbar { width: 4px; }
      #tw-job-list::-webkit-scrollbar-thumb {
        background: ${c.scrollThumb}; border-radius: 2px;
      }

      .tw-job-card {
        margin-bottom: 6px; background: ${c.cardBg};
        padding: 7px 8px; border-radius: 5px;
        border-left: 3px solid transparent;
        transition: background 0.15s, transform 0.1s;
        animation: tw-fadeIn 0.25s ease-out;
      }
      .tw-job-card:hover {
        background: ${theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
        transform: translateX(2px);
      }
      @keyframes tw-fadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .tw-job-header {
        display: flex; justify-content: space-between; align-items: center;
      }
      .tw-job-id {
        color: ${c.link}; cursor: pointer; font-weight: bold;
        transition: color 0.15s;
      }
      .tw-job-id:hover { color: ${c.accent}; text-decoration: underline; }
      .tw-job-status { font-size: 10px; margin-left: 5px; }
      .tw-job-time { color: ${c.textMuted}; }
      .tw-cancel-btn {
        color: ${c.danger}; cursor: pointer; font-weight: bold; font-size: 14px;
        background: none; border: none; padding: 0 2px; line-height: 1;
        transition: transform 0.15s;
      }
      .tw-cancel-btn:hover { transform: scale(1.3); }

      .tw-progress-track {
        width: 100%; background: ${theme === 'dark' ? '#333' : '#ddd'};
        height: 3px; margin-top: 4px; border-radius: 2px; overflow: hidden;
      }
      .tw-progress-fill {
        height: 100%; border-radius: 2px;
        transition: width 0.8s ease;
      }

      .tw-expand-btn {
        cursor: pointer; font-size: 9px; color: ${c.textDim};
        margin-top: 4px; display: inline-block;
        transition: color 0.15s;
      }
      .tw-expand-btn:hover { color: ${c.text}; }

      .tw-details {
        margin-top: 6px; padding: 6px 8px;
        background: ${theme === 'dark' ? '#1a1a1a' : '#f0f0f0'};
        border-radius: 4px; font-size: 10px;
        color: ${c.textMuted};
        animation: tw-fadeIn 0.2s ease-out;
      }
      .tw-details-row {
        display: flex; justify-content: space-between; padding: 2px 0;
      }
      .tw-details-label { color: ${c.textDim}; }
      .tw-details-val { color: ${c.text}; font-weight: bold; }

      #tw-footer {
        display: flex; justify-content: space-between; align-items: center;
        padding: 6px 10px; border-top: 1px solid ${c.border};
        font-size: 10px; color: ${c.textDim};
      }
      .tw-footer-btn {
        cursor: pointer; padding: 2px 5px; border-radius: 3px;
        transition: background 0.15s, color 0.15s;
        background: none; border: none; color: ${c.textMuted};
        font-family: inherit; font-size: 10px;
      }
      .tw-footer-btn:hover { background: rgba(255,255,255,0.08); color: ${c.text}; }

      .tw-sort-menu {
        position: absolute; bottom: 28px; left: 10px;
        background: ${c.cardBg}; border: 1px solid ${c.border};
        border-radius: 5px; padding: 4px 0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        z-index: 10; min-width: 120px;
        animation: tw-fadeIn 0.15s ease-out;
      }
      .tw-sort-option {
        padding: 5px 10px; cursor: pointer; font-size: 10px;
        color: ${c.textMuted};
        transition: background 0.1s;
      }
      .tw-sort-option:hover { background: rgba(255,255,255,0.06); color: ${c.text}; }
      .tw-sort-option.active { color: ${c.accent}; font-weight: bold; }

      .tw-empty {
        color: ${c.textDim}; text-align: center; padding: 20px 10px;
        font-style: italic;
      }

      .tw-notification-dot {
        width: 5px; height: 5px; border-radius: 50%;
        background: ${c.danger}; display: inline-block;
        animation: tw-pulse 1.5s infinite;
      }
      @keyframes tw-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
    `;
  }
  updateStyles();

  // ==========================================
  // 4. BUILD WIDGET DOM
  // ==========================================
  const widget = document.createElement('div');
  widget.id = 'tw-widget';
  widget.innerHTML = `
    <div id="tw-header">
      <div style="display:flex; gap: 6px; align-items: center;">
        <span style="font-size:13px; margin-right: 2px;">&#9654;</span>
        <span class="tw-tab active" data-tab="running">RUN</span>
        <span class="tw-tab" data-tab="finished">FIN</span>
      </div>
      <div style="display:flex; gap: 6px; align-items: center;">
        <span id="tw-notif-toggle" style="cursor:pointer; font-size:13px; opacity:0.5;" title="Enable notifications">&#128276;</span>
        <span id="tw-theme-toggle" style="cursor:pointer; font-size:13px;" title="Toggle theme">${theme === 'dark' ? '&#9789;' : '&#9728;'}</span>
        <span id="tw-popout" style="cursor:pointer; font-size:13px; opacity:0.7;" title="Picture-in-Picture">&#8599;</span>
        <span id="tw-collapse" style="cursor:pointer; font-size:13px; opacity:0.7;" title="Collapse">&#9660;</span>
        <span id="tw-close" style="cursor:pointer; color:${t().danger}; font-size:14px; font-weight:bold;" title="Hide (Alt+T to restore)">&times;</span>
      </div>
    </div>
    <div id="tw-stats-bar">
      <div style="display:flex; gap:10px;">
        <span class="tw-stat"><span class="tw-stat-dot" style="background:#4ade80;"></span> <span id="tw-cnt-run">0</span> run</span>
        <span class="tw-stat"><span class="tw-stat-dot" style="background:#fbbf24;"></span> <span id="tw-cnt-pend">0</span> pend</span>
        <span class="tw-stat"><span class="tw-stat-dot" style="background:#9ca3af;"></span> <span id="tw-cnt-fin">0</span> done</span>
      </div>
      <span id="tw-refresh-indicator" style="opacity:0.4;">&#8635;</span>
    </div>
    <input id="tw-search" type="text" placeholder="&#128269; Filter by ID or status..." />
    <div id="tw-job-list">
      <div class="tw-empty">Loading cluster data...</div>
    </div>
    <div id="tw-footer" style="position:relative;">
      <button class="tw-footer-btn" id="tw-sort-btn">&#8645; Sort</button>
      <span id="tw-last-update" style="font-size:9px;">--</span>
      <span style="font-size:9px; opacity:0.4;">Alt+T toggle</span>
    </div>
  `;
  document.body.appendChild(widget);

  // ==========================================
  // 5. DRAG LOGIC
  // ==========================================
  const header = document.getElementById('tw-header');
  let isDragging = false, offsetX, offsetY;
  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('#tw-notif-toggle, #tw-theme-toggle, #tw-popout, #tw-collapse, #tw-close, .tw-tab')) return;
    isDragging = true;
    const rect = widget.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    widget.style.bottom = 'auto';
    widget.style.right = 'auto';
    widget.style.left = rect.left + 'px';
    widget.style.top = rect.top + 'px';
  });
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      widget.style.left = `${e.clientX - offsetX}px`;
      widget.style.top = `${e.clientY - offsetY}px`;
    }
  });
  document.addEventListener('mouseup', () => { isDragging = false; });

  // ==========================================
  // 6. CONTROLS
  // ==========================================

  // Hide widget
  document.getElementById('tw-close').addEventListener('click', () => {
    widget.classList.add('tw-hidden');
    setTimeout(() => { widget.style.display = 'none'; }, 200);
  });

  // Collapse toggle
  document.getElementById('tw-collapse').addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    const collapseBtn = document.getElementById('tw-collapse');
    const sections = ['tw-stats-bar', 'tw-search', 'tw-job-list', 'tw-footer'];
    sections.forEach(id => {
      document.getElementById(id).style.display = isCollapsed ? 'none' : '';
    });
    collapseBtn.innerHTML = isCollapsed ? '&#9650;' : '&#9660;';
    collapseBtn.title = isCollapsed ? 'Expand' : 'Collapse';
  });

  // Keyboard shortcut: Alt+T to toggle visibility
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 't') {
      e.preventDefault();
      if (widget.style.display === 'none') {
        widget.style.display = 'flex';
        requestAnimationFrame(() => widget.classList.remove('tw-hidden'));
      } else {
        widget.classList.add('tw-hidden');
        setTimeout(() => { widget.style.display = 'none'; }, 200);
      }
    }
  });

  // Theme toggle
  document.getElementById('tw-theme-toggle').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('tw-theme', theme);
    updateStyles();
    document.getElementById('tw-theme-toggle').innerHTML = theme === 'dark' ? '&#9789;' : '&#9728;';
    document.getElementById('tw-close').style.color = t().danger;
    renderJobs(lastJobData);
  });

  // Notification toggle
  document.getElementById('tw-notif-toggle').addEventListener('click', () => {
    if (!notificationsEnabled && 'Notification' in window) {
      Notification.requestPermission().then(perm => {
        notificationsEnabled = perm === 'granted';
        document.getElementById('tw-notif-toggle').style.opacity = notificationsEnabled ? '1' : '0.5';
      });
    } else {
      notificationsEnabled = !notificationsEnabled;
      document.getElementById('tw-notif-toggle').style.opacity = notificationsEnabled ? '1' : '0.5';
    }
  });

  // Search
  document.getElementById('tw-search').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderJobs(lastJobData);
  });

  // Sort menu
  let sortMenuOpen = false;
  document.getElementById('tw-sort-btn').addEventListener('click', () => {
    sortMenuOpen = !sortMenuOpen;
    const existing = document.querySelector('.tw-sort-menu');
    if (existing) { existing.remove(); return; }
    const menu = document.createElement('div');
    menu.className = 'tw-sort-menu';
    const options = [
      { val: 'time-desc', label: '⏱ Newest first' },
      { val: 'time-asc', label: '⏱ Oldest first' },
      { val: 'status', label: '◉ By status' },
      { val: 'id', label: '# By job ID' },
    ];
    menu.innerHTML = options.map(o =>
      `<div class="tw-sort-option ${sortBy === o.val ? 'active' : ''}" data-sort="${o.val}">${o.label}</div>`
    ).join('');
    document.getElementById('tw-footer').appendChild(menu);
    // Close on outside click
    setTimeout(() => {
      const closer = (ev) => {
        if (!ev.target.closest('.tw-sort-menu, #tw-sort-btn')) {
          menu.remove();
          sortMenuOpen = false;
          document.removeEventListener('click', closer);
        }
      };
      document.addEventListener('click', closer);
    }, 0);
  });

  // ==========================================
  // 7. EVENT DELEGATION
  // ==========================================
  const handleClicks = async (e) => {
    // Tab switching
    if (e.target.classList.contains('tw-tab')) {
      currentTab = e.target.dataset.tab;
      document.querySelectorAll('.tw-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      // Also sync other tabs with same data-tab
      document.querySelectorAll(`.tw-tab[data-tab="${currentTab}"]`).forEach(t => t.classList.add('active'));
      expandedJobs.clear();
      updateData();
    }

    // Copy Job ID
    if (e.target.classList.contains('tw-job-id')) {
      const id = e.target.dataset.id;
      navigator.clipboard.writeText(id);
      const orig = e.target.innerText;
      e.target.innerText = '✓ copied';
      e.target.style.color = t().accent;
      setTimeout(() => { e.target.innerText = orig; e.target.style.color = ''; }, 1000);
    }

    // Expand/collapse details
    if (e.target.classList.contains('tw-expand-btn')) {
      const id = e.target.dataset.id;
      if (expandedJobs.has(id)) { expandedJobs.delete(id); } else { expandedJobs.add(id); }
      renderJobs(lastJobData);
    }

    // Cancel Job (hidden form submission — same as OOD's native cancel)
    if (e.target.classList.contains('tw-cancel-btn')) {
      const id = e.target.dataset.id;
      if (confirm(`Cancel job ${id}?`)) {
        // Grab the Rails authenticity token from the page's meta tag
        const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
        if (!token) {
          alert('Could not find authenticity token. Make sure you are on the OnDemand page.');
          return;
        }

        // Create and submit a hidden form — identical to what OOD does
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/pun/sys/activejobs?cluster=triton&pbsid=${id}`;
        form.style.display = 'none';

        const methodInput = document.createElement('input');
        methodInput.name = '_method';
        methodInput.value = 'delete';
        form.appendChild(methodInput);

        const tokenInput = document.createElement('input');
        tokenInput.name = 'authenticity_token';
        tokenInput.value = token;
        form.appendChild(tokenInput);

        document.body.appendChild(form);
        form.submit();
        // Page will redirect after submit — same behavior as clicking cancel in OOD
      }
    }

    // Sort option
    if (e.target.classList.contains('tw-sort-option')) {
      sortBy = e.target.dataset.sort;
      document.querySelector('.tw-sort-menu')?.remove();
      sortMenuOpen = false;
      renderJobs(lastJobData);
    }
  };

  document.addEventListener('click', handleClicks);

  // ==========================================
  // 8. ZEN MODE (Idle Detection)
  // ==========================================
  function resetIdleTimer() {
    lastActivity = Date.now();
    if (currentInterval !== 10000) {
      currentInterval = 10000;
      clearInterval(fetchTimer);
      fetchTimer = setInterval(updateData, currentInterval);
      updateData();
    }
  }
  window.addEventListener('mousemove', resetIdleTimer);
  window.addEventListener('keydown', resetIdleTimer);

  setInterval(() => {
    if (Date.now() - lastActivity > 15 * 60 * 1000 && currentInterval === 10000) {
      currentInterval = 300000;
      clearInterval(fetchTimer);
      fetchTimer = setInterval(updateData, currentInterval);
      console.log('Triton Monitor: Zen Mode (5m refresh)');
    }
  }, 60000);

  // ==========================================
  // 9. HELPERS
  // ==========================================
  function parseWallTime(commandStr) {
    if (!commandStr) return null;
    const match = commandStr.match(/--time=([\d:]+)/);
    if (!match) return null;
    const parts = match[1].split(':').reverse();
    let seconds = 0;
    if (parts[0]) seconds += parseInt(parts[0]);
    if (parts[1]) seconds += parseInt(parts[1]) * 60;
    if (parts[2]) seconds += parseInt(parts[2]) * 3600;
    return seconds > 0 ? seconds : null;
  }

  function getStatusColor(status) {
    const map = {
      RUNNING: '#4ade80', PENDING: '#fbbf24',
      COMPLETED: '#9ca3af', FINISHED: '#9ca3af',
    };
    return map[status] || '#f87171';
  }

  function formatTime(s) {
    s = parseInt(s, 10);
    if (isNaN(s)) return '?';
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  function sortJobs(jobs) {
    const copy = [...jobs];
    switch (sortBy) {
      case 'time-desc': return copy.sort((a, b) => (b.elapsed || 0) - (a.elapsed || 0));
      case 'time-asc': return copy.sort((a, b) => (a.elapsed || 0) - (b.elapsed || 0));
      case 'status': return copy.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
      case 'id': return copy.sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')));
      default: return copy;
    }
  }

  // ==========================================
  // 10. RENDER (works on both main widget and PiP)
  // ==========================================

  // Generate the full UI shell HTML (tabs, stats, search, list, footer)
  function buildShellHTML() {
    return `
      <div id="tw-pip-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--tw-border); padding:8px 10px; background:var(--tw-header-bg);">
        <div style="display:flex; gap:6px; align-items:center;">
          <span style="font-size:12px; margin-right:2px; color:var(--tw-accent);">▸</span>
          <span class="tw-tab ${currentTab === 'running' ? 'active' : ''}" data-tab="running">RUN</span>
          <span class="tw-tab ${currentTab === 'finished' ? 'active' : ''}" data-tab="finished">FIN</span>
        </div>
        <span id="tw-pip-update" style="font-size:9px; color:var(--tw-text-dim);">--</span>
      </div>
      <div id="tw-stats-bar" style="display:flex; gap:10px; padding:5px 10px; background:var(--tw-stats-bg); font-size:10px; color:var(--tw-text-muted); border-bottom:1px solid var(--tw-border); justify-content:space-between; align-items:center;">
        <div style="display:flex; gap:10px;">
          <span class="tw-stat"><span class="tw-stat-dot" style="background:#4ade80;"></span> <span id="tw-cnt-run">0</span> run</span>
          <span class="tw-stat"><span class="tw-stat-dot" style="background:#fbbf24;"></span> <span id="tw-cnt-pend">0</span> pend</span>
          <span class="tw-stat"><span class="tw-stat-dot" style="background:#9ca3af;"></span> <span id="tw-cnt-fin">0</span> done</span>
        </div>
        <span id="tw-refresh-indicator" style="opacity:0.4;">↻</span>
      </div>
      <input id="tw-search" type="text" placeholder="🔍 Filter by ID or status..." spellcheck="false" value="${searchQuery}" />
      <div id="tw-job-list"></div>
    `;
  }

  // Build the CSS custom properties block for the current theme
  function buildThemeVars() {
    const c = t();
    return `
      --tw-bg: ${c.bg}; --tw-header-bg: ${c.headerBg}; --tw-card-bg: ${c.cardBg};
      --tw-border: ${c.border}; --tw-text: ${c.text}; --tw-text-muted: ${c.textMuted};
      --tw-text-dim: ${c.textDim}; --tw-accent: ${c.accent}; --tw-accent-warm: ${c.accentWarm};
      --tw-danger: ${c.danger}; --tw-link: ${c.link}; --tw-input-bg: ${c.inputBg};
      --tw-stats-bg: ${c.statsBg}; --tw-scroll-thumb: ${c.scrollThumb};
    `;
  }

  // Shared stylesheet that uses CSS custom properties (works in both contexts)
  function getSharedCSS() {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: 11px; background: var(--tw-bg); color: var(--tw-text);
        display: flex; flex-direction: column; height: 100vh; overflow: hidden;
      }
      .tw-tab {
        cursor: pointer; font-weight: bold; font-size: 11px;
        padding: 2px 6px; border-radius: 3px;
        transition: background 0.15s, color 0.15s;
        color: var(--tw-text-dim);
      }
      .tw-tab:hover { background: rgba(255,255,255,0.08); }
      .tw-tab.active { color: var(--tw-accent) !important; }
      .tw-stat { display: flex; align-items: center; gap: 3px; }
      .tw-stat-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
      #tw-search {
        margin: 7px 10px 3px; padding: 5px 8px;
        background: var(--tw-input-bg); border: 1px solid var(--tw-border);
        border-radius: 5px; color: var(--tw-text); font-family: inherit;
        font-size: 11px; outline: none; transition: border-color 0.15s;
        display: block; width: calc(100% - 20px);
      }
      #tw-search:focus { border-color: var(--tw-accent); }
      #tw-search::placeholder { color: var(--tw-text-dim); }
      #tw-job-list {
        flex: 1; overflow-y: auto; padding: 6px 10px 10px; scroll-behavior: smooth;
      }
      #tw-job-list::-webkit-scrollbar { width: 4px; }
      #tw-job-list::-webkit-scrollbar-thumb { background: var(--tw-scroll-thumb); border-radius: 2px; }
      .tw-job-card {
        margin-bottom: 5px; background: var(--tw-card-bg);
        padding: 7px 8px; border-radius: 5px;
        border-left: 3px solid transparent;
        transition: background 0.15s, transform 0.1s;
        animation: tw-fadeIn 0.25s ease-out;
      }
      .tw-job-card:hover { transform: translateX(2px); }
      @keyframes tw-fadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .tw-job-header { display: flex; justify-content: space-between; align-items: center; }
      .tw-job-id {
        color: var(--tw-link); cursor: pointer; font-weight: bold;
        transition: color 0.15s;
      }
      .tw-job-id:hover { color: var(--tw-accent); text-decoration: underline; }
      .tw-job-status { font-size: 10px; margin-left: 5px; }
      .tw-job-time { color: var(--tw-text-muted); }
      .tw-cancel-btn {
        color: var(--tw-danger); cursor: pointer; font-weight: bold; font-size: 14px;
        background: none; border: none; padding: 0 2px; line-height: 1;
        transition: transform 0.15s;
      }
      .tw-cancel-btn:hover { transform: scale(1.3); }
      .tw-progress-track {
        width: 100%; background: var(--tw-border);
        height: 3px; margin-top: 4px; border-radius: 2px; overflow: hidden;
      }
      .tw-progress-fill { height: 100%; border-radius: 2px; transition: width 0.8s ease; }
      .tw-expand-btn {
        cursor: pointer; font-size: 9px; color: var(--tw-text-dim);
        margin-top: 4px; display: inline-block; transition: color 0.15s;
      }
      .tw-expand-btn:hover { color: var(--tw-text); }
      .tw-details {
        margin-top: 6px; padding: 6px 8px;
        background: var(--tw-stats-bg); border-radius: 4px;
        font-size: 10px; color: var(--tw-text-muted);
        animation: tw-fadeIn 0.2s ease-out;
      }
      .tw-details-row { display: flex; justify-content: space-between; padding: 2px 0; }
      .tw-details-label { color: var(--tw-text-dim); }
      .tw-details-val { color: var(--tw-text); font-weight: bold; }
      .tw-empty {
        color: var(--tw-text-dim); text-align: center; padding: 20px 10px; font-style: italic;
      }
    `;
  }

  // Render into a target document (main page or PiP)
  function renderJobs(jobsData, targetDoc) {
    const doc = targetDoc || document;
    lastJobData = jobsData;

    // Stats
    const running = jobsData.filter(j => j.status === 'RUNNING').length;
    const pending = jobsData.filter(j => j.status === 'PENDING').length;
    const finished = jobsData.filter(j => ['COMPLETED', 'FINISHED'].includes(j.status)).length;
    const cntRun = doc.getElementById('tw-cnt-run');
    const cntPend = doc.getElementById('tw-cnt-pend');
    const cntFin = doc.getElementById('tw-cnt-fin');
    if (cntRun) cntRun.textContent = running;
    if (cntPend) cntPend.textContent = pending;
    if (cntFin) cntFin.textContent = finished;

    // Filter
    let filtered = jobsData;
    if (searchQuery) {
      filtered = jobsData.filter(j =>
        String(j.id || '').toLowerCase().includes(searchQuery) ||
        (j.status || '').toLowerCase().includes(searchQuery)
      );
    }

    // Sort
    filtered = sortJobs(filtered);

    const listEl = doc.getElementById('tw-job-list');
    if (!listEl) return;

    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="tw-empty">${searchQuery ? 'No matching jobs' : 'No jobs in this category'}</div>`;
      return;
    }

    listEl.innerHTML = filtered.slice(0, 20).map(job => {
      const jobId = job.id || '?';
      const status = job.status || 'UNKNOWN';
      const color = getStatusColor(status);
      const timeStr = formatTime(job.elapsed);
      const isExpanded = expandedJobs.has(String(jobId));

      // Resources
      const memGB = job.resources?.memory ? Math.round(job.resources.memory / 1073741824) + ' GB' : '—';
      const cpus = job.resources?.cpus || '—';
      const gpus = job.resources?.gpus || '—';
      const node = job.allocatedNodes || 'Queued';
      const partition = job.partition || '—';
      const jobName = job.name || '—';

      // Progress
      let progressHtml = '';
      if (currentTab === 'running' && job.elapsed !== undefined) {
        const maxSeconds = parseWallTime(job.command);
        if (maxSeconds) {
          const percent = Math.min((parseInt(job.elapsed, 10) / maxSeconds) * 100, 100);
          const barColor = percent > 90 ? t().danger : t().accent;
          progressHtml = `
            <div class="tw-progress-track">
              <div class="tw-progress-fill" style="width:${percent}%; background:${barColor};"></div>
            </div>
          `;
        }
      }

      // Details panel
      const detailsHtml = isExpanded ? `
        <div class="tw-details">
          <div class="tw-details-row"><span class="tw-details-label">Name</span><span class="tw-details-val">${jobName}</span></div>
          <div class="tw-details-row"><span class="tw-details-label">Node</span><span class="tw-details-val">${node}</span></div>
          <div class="tw-details-row"><span class="tw-details-label">Partition</span><span class="tw-details-val">${partition}</span></div>
          <div class="tw-details-row"><span class="tw-details-label">CPUs</span><span class="tw-details-val">${cpus}</span></div>
          <div class="tw-details-row"><span class="tw-details-label">GPUs</span><span class="tw-details-val">${gpus}</span></div>
          <div class="tw-details-row"><span class="tw-details-label">Memory</span><span class="tw-details-val">${memGB}</span></div>
        </div>
      ` : '';

      return `
        <div class="tw-job-card" style="border-left-color:${color};">
          <div class="tw-job-header">
            <div>
              <span class="tw-job-id" data-id="${jobId}" title="Click to copy">#${jobId}</span>
              <span class="tw-job-status" style="color:${color};">${status}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="tw-job-time">${timeStr}</span>
              ${currentTab === 'running' ? `<button class="tw-cancel-btn" data-id="${jobId}" title="Cancel job">&times;</button>` : ''}
            </div>
          </div>
          ${progressHtml}
          <span class="tw-expand-btn" data-id="${jobId}">${isExpanded ? '▲ less' : '▼ details'}</span>
          ${detailsHtml}
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // 11. FETCH & NOTIFY
  // ==========================================
  async function updateData() {
    // Flash refresh indicator (in whichever context is active)
    const activeDoc = pipWindow ? pipWindow.document : document;
    const ri = activeDoc.getElementById('tw-refresh-indicator');
    if (ri) { ri.style.opacity = '1'; setTimeout(() => ri.style.opacity = '0.4', 400); }

    try {
      const url = currentTab === 'running'
        ? 'https://ondemand.triton.aalto.fi/pun/sys/monitor/api/running_jobs'
        : 'https://ondemand.triton.aalto.fi/pun/sys/monitor/api/finished_jobs';

      const res = await fetch(url);
      if (!res.ok) throw new Error('Network error');
      const jobsData = await res.json();

      // Desktop notifications for newly finished jobs
      if (notificationsEnabled && !firstLoad) {
        const currentIds = new Set(jobsData.map(j => String(j.id)));
        if (currentTab === 'running') {
          for (const prevId of previousJobIds) {
            if (!currentIds.has(prevId)) {
              new Notification('Triton Job Finished', {
                body: `Job #${prevId} is no longer running`,
                icon: '🖥️',
              });
            }
          }
        }
        previousJobIds = currentIds;
      } else {
        previousJobIds = new Set(jobsData.map(j => String(j.id)));
        firstLoad = false;
      }

      // Notifications handled above

      // Render — target the right document
      const targetDoc = pipWindow ? pipWindow.document : document;
      renderJobs(jobsData, targetDoc);

      // Update timestamp in whichever context is active
      const now = new Date();
      const ts2 = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const pipUpd = targetDoc.getElementById('tw-pip-update');
      const mainUpd = targetDoc.getElementById('tw-last-update');
      if (pipUpd) pipUpd.textContent = ts2;
      if (mainUpd) mainUpd.textContent = `Updated ${ts2}`;

    } catch (err) {
      console.error('Triton Monitor Error:', err);
      const targetDoc = pipWindow ? pipWindow.document : document;
      const listEl = targetDoc.getElementById('tw-job-list');
      if (listEl) listEl.innerHTML = `<div class="tw-empty" style="color:${t().danger};">⚠ Fetch failed — retrying...</div>`;
    }
  }

  // ==========================================
  // 12. PICTURE-IN-PICTURE (Full styled UI)
  // ==========================================
  function initPipWindow() {
    if (!pipWindow) return;
    const pipDoc = pipWindow.document;

    // Inject the full shared stylesheet with theme variables
    const style = pipDoc.createElement('style');
    style.textContent = getSharedCSS();
    pipDoc.head.appendChild(style);

    // Set body styles with theme CSS vars
    pipDoc.body.style.cssText = buildThemeVars();
    pipDoc.body.setAttribute('style', pipDoc.body.getAttribute('style'));

    // Build the full UI shell inside PiP body
    pipDoc.body.innerHTML = buildShellHTML();

    // Attach click delegation (tabs, copy, expand, cancel)
    pipDoc.addEventListener('click', handleClicks);

    // Attach search listener in PiP
    const pipSearch = pipDoc.getElementById('tw-search');
    if (pipSearch) {
      pipSearch.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderJobs(lastJobData, pipDoc);
      });
    }
  }

  const popoutBtn = document.getElementById('tw-popout');
  if ('documentPictureInPicture' in window) {
    popoutBtn.addEventListener('click', async () => {
      try {
        pipWindow = await documentPictureInPicture.requestWindow({ width: 320, height: 440 });

        // Initialize the PiP window with full styles and UI
        initPipWindow();

        // Hide the main widget
        widget.style.display = 'none';

        // Fetch data into the new PiP window
        updateData();

        // Restore main widget when PiP is closed
        pipWindow.addEventListener('pagehide', () => {
          pipWindow = null;
          widget.style.display = 'flex';
          widget.classList.remove('tw-hidden');
          updateData();
        });
      } catch (e) { console.error(e); }
    });
  } else {
    popoutBtn.style.display = 'none';
  }

  // ==========================================
  // 13. START
  // ==========================================
  fetchTimer = setInterval(updateData, currentInterval);
  updateData();

  // ==========================================
  // 14. CHROME EXTENSION: Toggle via toolbar icon
  // ==========================================
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'toggle-widget') {
        if (widget.style.display === 'none' || widget.classList.contains('tw-hidden')) {
          widget.style.display = 'flex';
          requestAnimationFrame(() => widget.classList.remove('tw-hidden'));
        } else {
          widget.classList.add('tw-hidden');
          setTimeout(() => { widget.style.display = 'none'; }, 200);
        }
      }
    });
  }
})();
