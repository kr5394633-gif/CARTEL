require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

// ---------- Pre-flight check ----------
// If these folders are missing, every deploy has the same symptom: a raw
// ENOENT/scandir crash that doesn't say *why*. Usually it means the
// commands/events/utils/api/public folders weren't actually pushed to the
// repo Railway (or your host) is deploying from — only individual files
// were. Check this loudly before anything else so the fix is obvious.
const REQUIRED_DIRS = ['commands', 'events', 'utils', 'api', 'public'];
const missingDirs = REQUIRED_DIRS.filter((dir) => !fs.existsSync(path.join(__dirname, dir)));
if (missingDirs.length > 0) {
  console.error('❌ Startup failed: missing required folder(s): ' + missingDirs.join(', '));
  console.error('   This almost always means these folders exist locally/in the zip you were given,');
  console.error('   but were never committed and pushed to the Git repo your host is deploying from.');
  console.error('   Fix: from your project root, run:');
  console.error('     git add -A');
  console.error('     git status   <- confirm commands/ events/ utils/ api/ public/ show as new files');
  console.error('     git commit -m "add missing bot folders"');
  console.error('     git push');
  console.error('   Then redeploy. If you\'re not using git, make sure your host is uploading the FULL');
  console.error('   project folder, not just the files you individually edited.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration, // needed for ban add/remove events
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// ---------- Load Commands ----------
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith('.js'));
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

client.login(process.env.BOT_TOKEN);

// ---------- RED EXE dashboard ----------
const createServer = require('./api/server');
const PORT = process.env.PORT || 3000;
const app = createServer(client);
app.listen(PORT, () => {
  console.log(`🌐 RED EXE dashboard listening on port ${PORT}`);
});
