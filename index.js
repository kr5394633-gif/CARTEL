require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { connectToDatabase } = require('./mongodb');
const { handleJoin, handlePlay, handleSkip, handleStop } = require('./player');
const colors = require('./utils/colors');

// ---------- Express Dashboard Web Server ----------
const app = express();
const PORT = process.env.PORT || 3000;
const DASH_USER = process.env.DASHBOARD_USER;
const DASH_PASS = process.env.DASHBOARD_PASS;

function checkAuth(req, res, next) {
  if (!DASH_USER || !DASH_PASS) return next();

  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Dashboard Protected"');
    return res.status(401).send('Authentication required');
  }

  const [scheme, encoded] = authHeader.split(' ');
  if (scheme !== 'Basic' || !encoded) {
    return res.status(400).send('Bad Request');
  }

  const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
  if (user === DASH_USER && pass === DASH_PASS) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Dashboard Protected"');
  return res.status(401).send('Invalid credentials');
}

// Serve static assets (CSS, JS, images) from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Dashboard root endpoints
app.get(['/', '/dashboard'], checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Dashboard listening on port ${PORT}`);
});

// ---------- Pre-flight check ----------
const REQUIRED_DIRS = ['commands', 'events', 'utils', 'public'];
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

// ---------- Discord Client Initialization ----------
const client = new Client({
  intents: Object.keys(GatewayIntentBits).map((a) => GatewayIntentBits[a]),
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

client.config = require('./config-music.json');

// ---------- Load Commands ----------
client.commands = new Collection();
client.PREFIX = '!';

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFolders = fs.readdirSync(commandsPath);
  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (fs.statSync(folderPath).isDirectory()) {
      const commandFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith('.js'));
      for (const file of commandFiles) {
        const command = require(path.join(folderPath, file));
        if (command?.name) {
          client.commands.set(command.name, command);
        }
      }
    }
  }
}

// ---------- Load Events ----------
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));
  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}

// ---------- Direct Music & General Message Commands ----------
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const PREFIX = '!';
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'join' || command === 'connect' || command === 'j') {
    handleJoin(message);
  } else if (command === 'play' || command === 'p') {
    await handlePlay(message, args);
  } else if (command === 'skip' || command === 's') {
    handleSkip(message);
  } else if (command === 'stop' || command === 'leave') {
    handleStop(message);
  }
});

// ---------- Global Error Handling & Database ----------
process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});

connectToDatabase().catch((err) => {
  console.error('Database connection failed:', err);
});

client.login(BOT_TOKEN);