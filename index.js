require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { connectToDatabase } = require('./mongodb');
const colors = require('./utils/colors');

// ---------- Dashboard HTTP Authentication & Server ----------
const PORT = process.env.PORT || 3000;
const DASH_USER = process.env.DASHBOARD_USER;
const DASH_PASS = process.env.DASHBOARD_PASS;

function checkAuth(req, res) {
  if (!DASH_USER || !DASH_PASS) return true;

  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Dashboard Protected"' });
    res.end('Authentication required');
    return false;
  }

  const [scheme, encoded] = authHeader.split(' ');
  if (scheme !== 'Basic' || !encoded) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return false;
  }

  const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
  if (user === DASH_USER && pass === DASH_PASS) {
    return true;
  }

  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Dashboard Protected"' });
  res.end('Invalid credentials');
  return false;
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  if (req.url === '/' || req.url === '/dashboard') {
    if (!checkAuth(req, res)) return;

    const indexPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(indexPath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading dashboard: ' + err.message);
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => console.log(`✅ HTTP server listening on port ${PORT}`));

// ---------- Pre-flight check ----------
const REQUIRED_DIRS = ['commands', 'events', 'utils', 'api', 'public'];
const missingDirs = REQUIRED_DIRS.filter((dir) => !fs.existsSync(path.join(__dirname, dir)));
if (missingDirs.length > 0) {
  console.error('❌ Startup failed: missing required folder(s): ' + missingDirs.join(', '));
  process.exit(1);
}

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN || BOT_TOKEN === 'paste_your_bot_token_here' || BOT_TOKEN.includes('your_bot_token')) {
  console.error('❌ Bot is offline: BOT_TOKEN is missing or still set to placeholder.');
  console.error('   Fix: set BOT_TOKEN in Railway variables or .env with your real Discord bot token.');
  process.exit(1);
}

const client = new Client({
  intents: Object.keys(GatewayIntentBits).map((a) => GatewayIntentBits[a]),
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

client.config = require('./config-music.json');

// ---------- Load Commands (Prefix-based with < prefix) ----------
client.commands = new Collection();
client.PREFIX = '<';
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if (command?.name) {
      client.commands.set(command.name, command);
    }
  }
}

// ---------- Load Events ----------
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});

// Connect to database
connectToDatabase().catch(err => {
  console.error('Database connection failed:', err);
});

client.login(BOT_TOKEN);