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
  commandsContainer: document.getElementById('commandsContainer'),
  serversList: document.getElementById('serversList'),
  serversCount: document.getElementById('serversCount'),
  playerThumbnail: document.getElementById('playerThumbnail'),
  playerTitle: document.getElementById('playerTitle'),
  playerAuthor: document.getElementById('playerAuthor'),
  playerDuration: document.getElementById('playerDuration'),
  btnPause: document.getElementById('btnPause'),
  btnResume: document.getElementById('btnResume'),
  btnSkip: document.getElementById('btnSkip'),
  btnStop: document.getElementById('btnStop'),
  btnLoop: document.getElementById('btnLoop'),
  volumeAdvanced: document.getElementById('volumeAdvanced'),
  volValue: document.getElementById('volValue'),
  bassSlider: document.getElementById('bassSlider'),
  bassValue: document.getElementById('bassValue'),
  btnVoiceBass: document.getElementById('btnVoiceBass'),
  voiceBassStatus: document.getElementById('voiceBassStatus'),
  btnPunkMode: document.getElementById('btnPunkMode'),
  punkModeStatus: document.getElementById('punkModeStatus'),
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

async function loadCommands() {
  try {
    const commands = await fetchJSON('/api/commands');
    let html = '';

    for (const [category, cmds] of Object.entries(commands)) {
      if (cmds.length === 0) continue;
      html += `<div class="command-category"><span class="category-name">${category.toUpperCase()}</span>`;
      html += cmds.map((cmd) => `<div class="command-item" title="${escapeHTML(cmd.description)}"><span class="cmd-name">/${cmd.name}</span> <span class="cmd-desc">${escapeHTML(cmd.description)}</span></div>`).join('');
      html += '</div>';
    }

    els.commandsContainer.innerHTML = html || '<div class="feed-empty">No commands available.</div>';
  } catch (err) {
    console.error('Failed to load commands:', err);
  }
}

async function loadServersOverview() {
  try {
    const servers = await fetchJSON('/api/servers-overview');
    els.serversCount.textContent = `${servers.length} server${servers.length === 1 ? '' : 's'}`;

    if (servers.length === 0) {
      els.serversList.innerHTML = '<div class="feed-empty">No servers connected yet.</div>';
      return;
    }

    els.serversList.innerHTML = servers
      .map((srv) => {
        const security = srv.features;
        const secCount = Object.values(security).filter(Boolean).length;
        return `
      <div class="server-item">
        ${srv.icon ? `<img class="server-icon" src="${srv.icon}" alt="" />` : '<div class="server-icon-placeholder"></div>'}
        <div class="server-info">
          <div class="server-name">${escapeHTML(srv.name)}</div>
          <div class="server-meta">${srv.memberCount} members • ${secCount}/4 protection</div>
          <div class="server-features">
            ${security.antiRaid ? '<span class="feature-badge raid">RAID</span>' : ''}
            ${security.antiNuke ? '<span class="feature-badge nuke">NUKE</span>' : ''}
            ${security.antiSpam ? '<span class="feature-badge spam">SPAM</span>' : ''}
            ${security.verification ? '<span class="feature-badge verify">VERIFY</span>' : ''}
          </div>
        </div>
      </div>`;
      })
      .join('');
  } catch (err) {
    console.error('Failed to load servers overview:', err);
  }
}

async function loadAudioSettings() {
  try {
    const settings = await fetchJSON('/api/music/audio-settings');

    const volume = Number(settings.volume ?? settings.defaultVolume ?? 5000);
    const bass = Number(settings.bass ?? 50);
    const voiceBass = Boolean(settings.voiceBass);
    const punkMode = Boolean(settings.punkMode);

    if (els.volumeAdvanced) {
      els.volumeAdvanced.value = String(Math.max(1, Math.min(10000, volume)));
      const percent = Math.round((Number(els.volumeAdvanced.value) / 10000) * 100);
      els.volValue.textContent = `${percent}%`;
    }

    if (els.bassSlider) {
      els.bassSlider.value = String(Math.max(1, Math.min(100, bass)));
      els.bassValue.textContent = `${els.bassSlider.value}%`;
    }

    if (els.voiceBassStatus) {
      els.voiceBassStatus.textContent = voiceBass ? 'ON' : 'OFF';
    }
    if (els.btnVoiceBass) {
      els.btnVoiceBass.classList.toggle('active', voiceBass);
    }

    if (els.punkModeStatus) {
      els.punkModeStatus.textContent = punkMode ? 'ON' : 'OFF';
    }
    if (els.btnPunkMode) {
      els.btnPunkMode.classList.toggle('active', punkMode);
    }
  } catch (err) {
    console.error('Failed to load audio settings:', err);
  }
}

async function loadMusicStatus() {
  try {
    const status = await fetchJSON('/api/music/status');
    
    if (!status.track) {
      els.playerTitle.textContent = 'No track playing';
      els.playerAuthor.textContent = '—';
      els.playerDuration.textContent = '0:00';
      els.playerThumbnail.innerHTML = '<div class="placeholder">♪</div>';
      return;
    }

    els.playerTitle.textContent = status.track.title;
    els.playerAuthor.textContent = status.track.author || '—';
    els.playerDuration.textContent = formatDuration(status.track.duration || 0);
    
    if (status.track.thumbnail) {
      els.playerThumbnail.innerHTML = `<img src="${status.track.thumbnail}" alt="Track thumbnail">`;
    } else {
      els.playerThumbnail.innerHTML = '<div class="placeholder">♪</div>';
    }

    if (els.volumeAdvanced) {
      const volumeValue = Number(status.volume) || 50;
      const mappedValue = Math.max(1, Math.min(10000, Math.round((volumeValue / 100) * 10000)));
      els.volumeAdvanced.value = String(mappedValue);
      els.volValue.textContent = `${Math.round(volumeValue)}%`;
    }
    
    // Update loop button color based on mode
    if (status.loop === 'off') {
      els.btnLoop.textContent = '🔁';
      els.btnLoop.style.opacity = '0.6';
    } else if (status.loop === 'track') {
      els.btnLoop.textContent = '🔂';
      els.btnLoop.style.opacity = '1';
    } else {
      els.btnLoop.textContent = '🔁';
      els.btnLoop.style.opacity = '1';
    }

    // Show/hide pause/resume buttons based on state
    els.btnPause.style.display = status.paused ? 'none' : 'inline-block';
    els.btnResume.style.display = status.paused ? 'inline-block' : 'none';
  } catch (err) {
    console.error('Failed to load music status:', err);
  }
}

async function musicControl(action) {
  try {
    const endpoint = `/api/music/${action}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      loadMusicStatus();
    }
  } catch (err) {
    console.error(`Music control error (${action}):`, err);
  }
}

function formatDuration(ms) {
  if (!ms) return '0:00';
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
  loadMusicStatus();
  els.lastUpdated.textContent = `Last updated ${new Date().toLocaleTimeString()}`;
}

els.guildSelect.addEventListener('change', (e) => {
  selectedGuildId = e.target.value;
  loadFeed();
  loadWhitelist();
});

// Music control button listeners
els.btnPause.addEventListener('click', () => musicControl('pause'));
els.btnResume.addEventListener('click', () => musicControl('resume'));
els.btnSkip.addEventListener('click', () => musicControl('skip'));
els.btnStop.addEventListener('click', () => musicControl('stop'));
els.btnLoop.addEventListener('click', () => musicControl('loop'));

// Advanced volume control (1-10000)
els.volumeAdvanced.addEventListener('input', (e) => {
  const volume = parseInt(e.target.value, 10);
  const percentage = Math.round((volume / 10000) * 100);
  els.volValue.textContent = `${percentage}%`;
});

els.volumeAdvanced.addEventListener('change', async (e) => {
  const volume = parseInt(e.target.value, 10);
  try {
    await fetch('/api/music/volume-advanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volume }),
    });
  } catch (err) {
    console.error('Advanced volume error:', err);
  }
});

// Bass control (1-100)
els.bassSlider.addEventListener('input', (e) => {
  const bass = parseInt(e.target.value, 10);
  els.bassValue.textContent = `${bass}%`;
});

els.bassSlider.addEventListener('change', async (e) => {
  const bass = parseInt(e.target.value, 10);
  try {
    await fetch('/api/music/bass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bass }),
    });
  } catch (err) {
    console.error('Bass control error:', err);
  }
});

// Voice Bass toggle
els.btnVoiceBass.addEventListener('click', async () => {
  const isEnabled = els.voiceBassStatus.textContent === 'ON';
  const newState = !isEnabled;
  
  try {
    await fetch('/api/music/voice-bass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newState }),
    });
    
    els.voiceBassStatus.textContent = newState ? 'ON' : 'OFF';
    els.btnVoiceBass.classList.toggle('active', newState);
  } catch (err) {
    console.error('Voice bass error:', err);
  }
});

// Punk Mode toggle
els.btnPunkMode.addEventListener('click', async () => {
  const isEnabled = els.punkModeStatus.textContent === 'ON';
  const newState = !isEnabled;
  
  try {
    await fetch('/api/music/punk-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newState }),
    });
    
    els.punkModeStatus.textContent = newState ? 'ON' : 'OFF';
    els.btnPunkMode.classList.toggle('active', newState);
  } catch (err) {
    console.error('Punk mode error:', err);
  }
});

(async function init() {
  await loadGuilds();
  await loadConfigSummary();
  await loadCommands();
  await loadServersOverview();
  await loadAudioSettings();
  await loadMusicStatus();
  tick();
  setInterval(tick, REFRESH_MS);
  setInterval(loadServersOverview, REFRESH_MS);
})();
