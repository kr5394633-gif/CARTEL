const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');

let playerInstance = null;

async function initializePlayer(client) {
  if (playerInstance) return playerInstance;

  playerInstance = new Player(client, {
    ytdlOptions: {
      quality: 'highestaudio',
      highWaterMark: 1 << 25
    }
  });

  // Automatically load stream extractors (SoundCloud, Spotify, Apple, YouTube)
  await playerInstance.extractors.loadMulti(DefaultExtractors);

  playerInstance.events.on('playerStart', (queue, track) => {
    if (queue.metadata?.channel) {
      queue.metadata.channel.send(`🎵 Now playing: **${track.title}** (${track.duration})`);
    }
  });

  playerInstance.events.on('error', (queue, error) => {
    console.error(`[Player Error] ${error.message}`);
  });

  playerInstance.events.on('playerError', (queue, error) => {
    console.error(`[Audio Connection Error] ${error.message}`);
  });

  console.log('✅ Discord Player engine initialized successfully');
  return playerInstance;
}

async function handleJoin(message) {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) return message.reply('❌ You need to be in a voice channel first!');

  const player = playerInstance || (await initializePlayer(message.client));
  const queue = player.nodes.create(message.guild, {
    metadata: { channel: message.channel },
    volume: 50,
    leaveOnEmpty: true,
    leaveOnEmptyCooldown: 300000,
    leaveOnEnd: false
  });

  try {
    if (!queue.connection) await queue.connect(voiceChannel);
    message.reply(` Joined **${voiceChannel.name}**!`);
  } catch (e) {
    queue.delete();
    message.reply('❌ Could not join your voice channel.');
  }
}

async function handlePlay(message, args) {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) return message.reply('❌ Join a voice channel first!');

  const query = args.join(' ');
  if (!query) return message.reply('⚠️ Please provide a song name or link!');

  const player = playerInstance || (await initializePlayer(message.client));

  try {
    const searchResult = await player.search(query, {
      requestedBy: message.author
    });

    if (!searchResult || !searchResult.tracks.length) {
      return message.reply('❌ No results found for that search.');
    }

    const { track } = await player.play(voiceChannel, searchResult, {
      nodeOptions: {
        metadata: { channel: message.channel },
        volume: 50,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300000,
        leaveOnEnd: false
      }
    });

    return message.reply(` Added to queue: **${track.title}**`);
  } catch (error) {
    console.error('Play command error:', error);
    return message.reply(`❌ Playback error: ${error.message}`);
  }
}

function handleSkip(message) {
  if (!playerInstance) return message.reply?.('❌ Nothing is playing.');
  const queue = playerInstance.nodes.get(message.guild.id);
  if (!queue || !queue.isPlaying()) return message.reply?.('❌ No song currently playing.');

  queue.node.skip();
  message.reply?.('⏭️ Skipped current track.');
}

function handleStop(message) {
  if (!playerInstance) return message.reply?.('❌ Nothing is playing.');
  const queue = playerInstance.nodes.get(message.guild.id);
  if (!queue) return message.reply?.('❌ Nothing is playing.');

  queue.delete();
  message.reply?.(' Stopped and disconnected.');
}

function setWebVolume(guildId, volumeLevel) {
  if (!playerInstance) return false;
  const queue = playerInstance.nodes.get(guildId);
  if (!queue) return false;
  queue.node.setVolume(Math.max(0, Math.min(100, volumeLevel)));
  return true;
}

function getMusicStatus(guildId) {
  if (!playerInstance) {
    return { active: false, currentSong: null, volume: 50, queueCount: 0 };
  }
  const queue = playerInstance.nodes.get(guildId);
  if (!queue || !queue.currentTrack) {
    return { active: false, currentSong: null, volume: 50, queueCount: 0 };
  }
  return {
    active: queue.isPlaying(),
    currentSong: {
      title: queue.currentTrack.title,
      url: queue.currentTrack.url,
      author: queue.currentTrack.author
    },
    volume: queue.node.volume,
    queueCount: queue.tracks.size
  };
}

module.exports = {
  initializePlayer,
  handleJoin,
  handlePlay,
  handleSkip,
  handleStop,
  setWebVolume,
  getMusicStatus
};