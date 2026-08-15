const REFRESH_MS = 5000;

const els = {
  guildSelect: document.getElementById('guildSelect'),
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  statGuilds: document.getElementById('statGuilds'),
  statMembers: document.getElementById('statMembers'),
  statUptime: document.getElementById('statUptime'),
  statPing: document.getElementById('statPing'),
  feed: document.getElementById('feed'),
  feedEmpty: document.getElementById('feedEmpty'),
  feedCount: document.getElementById('feedCount'),
  whitelist: document.getElementById('whitelist'),
  whitelistCount: document.getElementById('whitelistCount'),
  configList: document.getElementById('configList'),
  lastUpdated: document.getElementById('lastUpdated'),
};

let selectedGuildId = null;
let guildsLoaded = false;

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function categoryLabel(cat) {
  const map = {
    securityAlerts: 'SECURITY ALERT',
    modLogs: 'MODERATION',
    joinLeaveLogs: 'MEMBER ACTIVITY',
    messageLogs: 'MESSAGE LOG',
  };
  return map[cat] || cat.toUpperCase();
}

async function loadGuilds() {
  try {
    const guilds = await fetchJSON('/api/guilds');
    if (guilds.length === 0) return;

    if (!guildsLoaded) {
      els.guildSelect.innerHTML = guilds
        .map((g) => `<option value="${g.id}">${escapeHTML(g.name)}</option>`)
        .join('');
      selectedGuildId = guilds[0].id;
      guildsLoaded = true;
    }
  } catch (err) {
    console.error('Failed to load guilds:', err);
  }
}

async function loadStats() {
  try {
    const stats = await fetchJSON('/api/stats');
    els.statGuilds.textContent = stats.guildCount;
    els.statMembers.textContent = stats.totalMembers.toLocaleString();
    els.statUptime.textContent = formatUptime(stats.uptimeSeconds);
    els.statPing.textContent = stats.wsPing >= 0 ? `${stats.wsPing}ms` : '—';

    if (stats.ready) {
      els.statusDot.className = 'status-dot online';
      els.statusText.textContent = 'ONLINE';
    } else {
      els.statusDot.className = 'status-dot offline';
      els.statusText.textContent = 'CONNECTING';
    }
  } catch (err) {
    els.statusDot.className = 'status-dot offline';
    els.statusText.textContent = 'UNREACHABLE';
  }
}

async function loadFeed() {
  if (!selectedGuildId) return;
  try {
    const alerts = await fetchJSON(`/api/alerts?guildId=${selectedGuildId}&limit=50`);
    els.feedCount.textContent = `${alerts.length} event${alerts.length === 1 ? '' : 's'}`;

    if (alerts.length === 0) {
      els.feed.innerHTML = '<div class="feed-empty">No security events logged yet. Standing by.</div>';
      return;
    }

    els.feed.innerHTML = alerts
      .map(
        (a) => `
      <div class="feed-item ${escapeHTML(a.category)}">
        <span class="feed-time">${formatTime(a.timestamp)}</span>
        <div class="feed-body">
          <div class="feed-title">${escapeHTML(a.title)}</div>
          <div class="feed-desc">${escapeHTML(a.description || '')}</div>
          <span class="feed-category">${categoryLabel(a.category)}</span>
        </div>
      </div>`
      )
      .join('');
  } catch (err) {
    console.error('Failed to load feed:', err);
  }
}

async function loadWhitelist() {
  if (!selectedGuildId) return;
  try {
    const entries = await fetchJSON(`/api/whitelist?guildId=${selectedGuildId}`);
    els.whitelistCount.textContent = `${entries.length} trusted`;

    if (entries.length === 0) {
      els.whitelist.innerHTML = '<div class="feed-empty">No trusted users whitelisted.</div>';
      return;
    }

    els.whitelist.innerHTML = entries
      .map(
        (u) => `
      <div class="whitelist-item">
        ${u.avatarURL ? `<img class="whitelist-avatar" src="${u.avatarURL}" alt="" />` : '<div class="whitelist-avatar"></div>'}
        <span class="whitelist-tag">${escapeHTML(u.tag)}</span>
      </div>`
      )
      .join('');
  } catch (err) {
    console.error('Failed to load whitelist:', err);
  }
}

async function loadConfigSummary() {
  try {
    const cfg = await fetchJSON('/api/config-summary');
    const row = (label, valueHtml) => `<div class="config-row"><span class="k">${label}</span><span class="v">${valueHtml}</span></div>`;
    const badge = (on) => `<span class="badge ${on ? 'on' : 'off'}">${on ? 'ON' : 'OFF'}</span>`;

    els.configList.innerHTML = [
      row('Anti-Raid', badge(cfg.antiRaid.enabled)),
      row('Anti-Nuke', badge(cfg.antiNuke.enabled)),
      row('Anti-Spam', badge(cfg.antiSpam.enabled)),
      row('Nuke Punishment', cfg.antiNuke.punishment),
      row('Verification', badge(cfg.verification.enabled)),
    ].join('');
  } catch (err) {
    console.error('Failed to load config summary:', err);
  }
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function tick() {
  loadStats();
  loadFeed();
  loadWhitelist();
  els.lastUpdated.textContent = `Last updated ${new Date().toLocaleTimeString()}`;
}

els.guildSelect.addEventListener('change', (e) => {
  selectedGuildId = e.target.value;
  loadFeed();
  loadWhitelist();
});

(async function init() {
  await loadGuilds();
  await loadConfigSummary();
  tick();
  setInterval(tick, REFRESH_MS);
})();
