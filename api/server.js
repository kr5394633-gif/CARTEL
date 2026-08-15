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

  return app;
}

module.exports = createServer;
