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

  // Music endpoints are now handled by slash commands with Riffy/Lavalink
  // No dashboard API needed for Riffy integration

  return app;
}

module.exports = createServer;
