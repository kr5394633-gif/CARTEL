require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { connectToDatabase } = require('./mongodb');
const { 
  initializePlayer, 
  handleJoin, 
  handlePlay, 
  handleSkip, 
  handleStop, 
  setWebVolume, 
  getMusicStatus 
} = require('./player');

// ---------- Express Dashboard Web Server ----------
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Discord Client Initialization ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

client.commands = new Collection();
client.PREFIX = '!';

// ---------- API Routes For Web Dashboard ----------
app.get('/api/stats', (req, res) => {
  const totalGuilds = client.guilds.cache.size;
  const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
  const guilds = client.guilds.cache.map((g) => ({
    id: g.id,
    name: g.name,
    memberCount: g.memberCount,
    icon: g.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
  }));

  const commandsList = [
    { name: '!join', desc: 'Join user voice channel' },
    { name: '!play <song>', desc: 'Play any song directly in voice' },
    { name: '!skip', desc: 'Skip current audio track' },
    { name: '!stop', desc: 'Stop playback and disconnect' }
  ];

  client.commands.forEach((cmd, name) => {
    if (!commandsList.some((c) => c.name === `!${name}`)) {
      commandsList.push({ name: `${client.PREFIX}${name}`, desc: cmd.description || 'Command' });
    }
  });

  const firstGuildId = client.guilds.cache.first()?.id;
  const music = firstGuildId ? getMusicStatus(firstGuildId) : { active: false, currentSong: null, volume: 50 };

  res.json({
    status: 'online',
    ping: client.ws.ping || 0,
    uptime: process.uptime(),
    serversGuarded: totalGuilds,
    membersProtected: totalMembers,
    guilds: guilds,
    commands: commandsList,
    music: music
  });
});

app.post('/api/music/volume', (req, res) => {
  const { volume, guildId } = req.body;
  const targetGuild = guildId || client.guilds.cache.first()?.id;
  if (!targetGuild) return res.status(400).json({ error: 'No active server' });

  setWebVolume(targetGuild, Number(volume));
  res.json({ success: true, volume: Number(volume) });
});

app.post('/api/music/control', (req, res) => {
  const { action, guildId } = req.body;
  const targetGuild = guildId || client.guilds.cache.first()?.id;
  if (!targetGuild) return res.status(400).json({ error: 'No active server' });

  if (action === 'skip') {
    handleSkip({ guild: { id: targetGuild }, reply: () => {} });
    return res.json({ success: true, action: 'skipped' });
  } else if (action === 'stop') {
    handleStop({ guild: { id: targetGuild }, reply: () => {} });
    return res.json({ success: true, action: 'stopped' });
  }

  res.status(400).json({ error: 'Unknown action' });
});

app.get(['/', '/dashboard'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Dashboard listening on port ${PORT}`);
});

// ---------- Load Discord Commands ----------
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFolders = fs.readdirSync(commandsPath);
  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (fs.statSync(folderPath).isDirectory()) {
      const commandFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith('.js'));
      for (const file of commandFiles) {
        const command = require(path.join(folderPath, file));
        if (command?.name) client.commands.set(command.name, command);
      }
    }
  }
}

// ---------- Discord Command Handler ----------
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

client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  await initializePlayer(client);
});

connectToDatabase().catch((err) => console.error('Database connection error:', err));
client.login(process.env.BOT_TOKEN);