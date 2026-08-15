const express = require('express');
const path = require('path');
const config = require('../config.json');
const db = require('../utils/database');

/**
 * Optional gate: if DASHBOARD_USER + DASHBOARD_PASS are set in .env,
 * the whole dashboard (page + API) requires HTTP Basic Auth. If either
 * is unset, the dashboard is open to anyone with the URL — fine for a
 * private/unlisted Railway domain, but set credentials if you don't
 * want that.
 */
function basicAuthGate(req, res, next) {
  const { DASHBOARD_USER, DASHBOARD_PASS } = process.env;
  if (!DASHBOARD_USER || !DASHBOARD_PASS) return next();

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const [user, pass] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
    if (user === DASHBOARD_USER && pass === DASHBOARD_PASS) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="RED EXE"');
  return res.status(401).send('Authentication required.');
}

function createServer(client) {
  const app = express();
  app.disable('x-powered-by');
  app.use(basicAuthGate);
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/stats', (req, res) => {
    const guilds = client.guilds.cache;
    const totalMembers = guilds.reduce((sum, g) => sum + (g.memberCount || 0), 0);
    res.json({
      ready: client.isReady(),
      botTag: client.user ? client.user.tag : null,
      avatarURL: client.user ? client.user.displayAvatarURL({ size: 128 }) : null,
      guildCount: guilds.size,
      totalMembers,
      uptimeSeconds: Math.floor(process.uptime()),
      wsPing: client.ws.ping,
    });
  });

  app.get('/api/guilds', (req, res) => {
    const list = client.guilds.cache.map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: g.memberCount,
      iconURL: g.iconURL({ size: 64 }),
    }));
    res.json(list);
  });

  app.get('/api/alerts', (req, res) => {
    const guildId = req.query.guildId || client.guilds.cache.first()?.id;
    if (!guildId) return res.json([]);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    res.json(db.getAlerts(guildId, limit));
  });

  app.get('/api/whitelist', async (req, res) => {
    const guildId = req.query.guildId || client.guilds.cache.first()?.id;
    if (!guildId) return res.json([]);
    const guild = client.guilds.cache.get(guildId);
    const ids = db.getWhitelist(guildId);

    const entries = await Promise.all(
      ids.map(async (id) => {
        const member = guild ? await guild.members.fetch(id).catch(() => null) : null;
        return {
          id,
          tag: member ? member.user.tag : id,
          avatarURL: member ? member.user.displayAvatarURL({ size: 32 }) : null,
        };
      })
    );
    res.json(entries);
  });

  app.get('/api/config-summary', (req, res) => {
    res.json({
      antiRaid: config.antiRaid,
      antiNuke: config.antiNuke,
      antiSpam: config.antiSpam,
      verification: config.verification,
    });
  });

  app.get('/api/commands', (req, res) => {
    const commands = Array.from(client.commands.values()).map((cmd) => ({
      name: cmd.data.name,
      description: cmd.data.description,
      category: cmd.data.name.split('-')[0] || 'other',
    }));

    const categorized = {
      moderation: [],
      security: [],
      music: [],
      utility: [],
    };

    commands.forEach((cmd) => {
      const category = cmd.category;
      if (categorized[category]) {
        categorized[category].push(cmd);
      } else {
        categorized.utility.push(cmd);
      }
    });

    res.json(categorized);
  });

  app.get('/api/guild-security/:guildId', (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const securityData = {
      guildId,
      guildName: guild.name,
      guildIcon: guild.iconURL({ size: 64 }),
      memberCount: guild.memberCount,
      owner: guild.ownerId,
      security: {
        antiRaid: config.antiRaid.enabled,
        antiNuke: config.antiNuke.enabled,
        antiSpam: config.antiSpam.enabled,
        verification: config.verification.enabled,
        autoMod: config.autoMod?.enabled || false,
      },
      whitelistCount: db.getWhitelist(guildId).length,
    };

    res.json(securityData);
  });

  app.get('/api/servers-overview', (req, res) => {
    const guilds = client.guilds.cache;
    const overview = guilds.map((g) => {
      const whitelistCount = db.getWhitelist(g.id).length;
      return {
        id: g.id,
        name: g.name,
        icon: g.iconURL({ size: 64 }),
        memberCount: g.memberCount,
        securityEnabled: config.antiRaid.enabled || config.antiNuke.enabled || config.antiSpam.enabled,
        whitelistCount,
        features: {
          antiRaid: config.antiRaid.enabled,
          antiNuke: config.antiNuke.enabled,
          antiSpam: config.antiSpam.enabled,
          verification: config.verification.enabled,
        },
      };
    });

    res.json(overview);
  });

  // ========== MUSIC CONTROL ENDPOINTS ==========
  app.get('/api/music/status', (req, res) => {
    try {
      const { getMusicPlayer } = require('../utils/musicPlayer');
      const player = getMusicPlayer();
      
      // Find the first active queue
      const queue = player.nodes.find((q) => q.isPlaying());
      
      if (!queue || !queue.currentTrack) {
        return res.json({
          playing: false,
          track: null,
          queue: [],
          volume: 0,
          loop: 'off',
        });
      }

      res.json({
        playing: !queue.node.isPaused(),
        paused: queue.node.isPaused(),
        track: {
          title: queue.currentTrack.title,
          author: queue.currentTrack.author,
          duration: queue.currentTrack.duration,
          url: queue.currentTrack.url,
          thumbnail: queue.currentTrack.thumbnail,
        },
        queue: queue.tracks.slice(0, 5).map((t) => ({
          title: t.title,
          author: t.author,
          duration: t.duration,
        })),
        queueLength: queue.tracks.length,
        volume: queue.node.volume,
        loop: queue.repeatMode === 0 ? 'off' : queue.repeatMode === 1 ? 'track' : 'queue',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/music/play', express.json(), async (req, res) => {
    try {
      const { getMusicPlayer } = require('../utils/musicPlayer');
      const player = getMusicPlayer();
      const { query, channelId } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query required' });
      }

      // Find first guild with a voice connection
      let queue = player.nodes.find((q) => q.connection);
      
      if (!queue && channelId) {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (channel && channel.isVoiceBased()) {
          const guild = channel.guild;
          queue = player.nodes.create(guild);
          queue.connect(channel);
        }
      }

      if (!queue) {
        return res.status(400).json({ error: 'No voice channel found. Bot must be in a voice channel.' });
      }

      const { track } = await queue.play(query, {
        searchEngine: 'auto',
      });

      res.json({
        success: true,
        track: track.title,
        added: true,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/music/pause', express.json(), (req, res) => {
    try {
      const { getMusicPlayer } = require('../utils/musicPlayer');
      const player = getMusicPlayer();
      const queue = player.nodes.find((q) => q.isPlaying());

      if (!queue) {
        return res.status(400).json({ error: 'No music playing' });
      }

      queue.node.setPaused(true);
      res.json({ success: true, message: 'Music paused' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/music/resume', express.json(), (req, res) => {
    try {
      const { getMusicPlayer } = require('../utils/musicPlayer');
      const player = getMusicPlayer();
      const queue = player.nodes.find((q) => q.node.isPaused());

      if (!queue) {
        return res.status(400).json({ error: 'No paused music' });
      }

      queue.node.setPaused(false);
      res.json({ success: true, message: 'Music resumed' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/music/skip', express.json(), (req, res) => {
    try {
      const { getMusicPlayer } = require('../utils/musicPlayer');
      const player = getMusicPlayer();
      const queue = player.nodes.find((q) => q.isPlaying());

      if (!queue) {
        return res.status(400).json({ error: 'No music playing' });
      }

      queue.node.skip();
      res.json({ success: true, message: 'Track skipped' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/music/stop', express.json(), (req, res) => {
    try {
      const { getMusicPlayer } = require('../utils/musicPlayer');
      const player = getMusicPlayer();
      const queue = player.nodes.find((q) => q.isPlaying());

      if (!queue) {
        return res.status(400).json({ error: 'No music playing' });
      }

      queue.delete();
      res.json({ success: true, message: 'Music stopped' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/music/volume', express.json(), (req, res) => {
    try {
      const { getMusicPlayer } = require('../utils/musicPlayer');
      const player = getMusicPlayer();
      const { volume } = req.body;

      if (volume === undefined || volume < 0 || volume > 100) {
        return res.status(400).json({ error: 'Volume must be between 0 and 100' });
      }

      const queue = player.nodes.find((q) => q.connection);

      if (!queue) {
        return res.status(400).json({ error: 'No voice connection found' });
      }

      queue.node.setVolume(volume);
      res.json({ success: true, volume });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/music/loop', express.json(), (req, res) => {
    try {
      const { getMusicPlayer } = require('../utils/musicPlayer');
      const player = getMusicPlayer();

      const queue = player.nodes.find((q) => q.connection);

      if (!queue) {
        return res.status(400).json({ error: 'No voice connection found' });
      }

      // Cycle through: off (0) -> track (1) -> queue (2) -> off (0)
      const modes = [0, 1, 2];
      const currentMode = queue.repeatMode;
      const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
      
      queue.setRepeatMode(nextMode);
      
      const modeNames = ['off', 'track', 'queue'];
      res.json({ success: true, loop: modeNames[nextMode] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== ADVANCED AUDIO CONTROLS ==========
  app.post('/api/music/volume-advanced', express.json(), (req, res) => {
    try {
      const { getMusicPlayer } = require('../utils/musicPlayer');
      const player = getMusicPlayer();
      const { volume } = req.body;

      if (volume === undefined || volume < 1 || volume > 10000) {
        return res.status(400).json({ error: 'Volume must be between 1 and 10000' });
      }

      const queue = player.nodes.find((q) => q.connection);
      if (!queue) {
        return res.status(400).json({ error: 'No voice connection found' });
      }

      // Convert 1-10000 scale to 0-100 scale for discord-player
      const normalizedVolume = Math.max(0, Math.min(100, (volume / 10000) * 100));
      queue.node.setVolume(normalizedVolume);
      
      res.json({ success: true, volume, normalized: Math.round(normalizedVolume) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/music/bass', express.json(), (req, res) => {
    try {
      const { bass } = req.body;

      if (bass === undefined || bass < 1 || bass > 100) {
        return res.status(400).json({ error: 'Bass must be between 1 and 100' });
      }

      // Store bass setting globally for this session
      if (!global.audioSettings) global.audioSettings = {};
      global.audioSettings.bass = bass;

      res.json({ success: true, bass, message: `Bass set to ${bass}%` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/music/voice-bass', express.json(), (req, res) => {
    try {
      const { enabled } = req.body;

      if (!global.audioSettings) global.audioSettings = {};
      global.audioSettings.voiceBass = enabled === true;

      res.json({ success: true, voiceBass: global.audioSettings.voiceBass });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/music/punk-mode', express.json(), (req, res) => {
    try {
      const { enabled } = req.body;

      if (!global.audioSettings) global.audioSettings = {};
      global.audioSettings.punkMode = enabled === true;

      res.json({ 
        success: true, 
        punkMode: global.audioSettings.punkMode,
        message: global.audioSettings.punkMode ? '🎸 PUNK MODE ACTIVATED!' : 'Punk mode disabled'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/music/audio-settings', (req, res) => {
    try {
      if (!global.audioSettings) {
        global.audioSettings = {
          bass: parseInt(process.env.DEFAULT_BASS) || 50,
          voiceBass: false,
          punkMode: process.env.PUNK_MODE === 'true',
        };
      }
      res.json(global.audioSettings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}

module.exports = createServer;
