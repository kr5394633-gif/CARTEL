require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { initializePlayer } = require('./player');
const { connectToDatabase } = require('./mongodb');
const colors = require('./utils/colors');

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
  console.error('   Fix: set BOT_TOKEN in .env with your real Discord bot token.');
  process.exit(1);
}

const client = new Client({
  intents: Object.keys(GatewayIntentBits).map((a) => GatewayIntentBits[a]),
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

client.config = require('./config-music.json');

// ---------- Load Commands ----------
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith('.js') && !f.includes('-new'));
  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if (command?.data?.name) {
      client.commands.set(command.data.name, command);
    }
  }
}

// Load new Riffy-based commands
for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith('-new.js'));
  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if (command?.data?.name) {
      client.commands.set(command.data.name, command);
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
