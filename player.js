const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus 
} = require('@discordjs/voice');
const play = require('play-dl');

const queues = new Map();

async function playNextSong(guildId) {
  const guildQueue = queues.get(guildId);
  if (!guildQueue) return;

  if (guildQueue.songs.length === 0) {
    guildQueue.currentResource = null;
    guildQueue.currentSong = null;
    guildQueue.connection.destroy();
    queues.delete(guildId);
    return;
  }

  const song = guildQueue.songs[0];
  guildQueue.currentSong = song;

  try {
    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true
    });

    resource.volume.setVolume(guildQueue.volume / 100);
    guildQueue.currentResource = resource;
    guildQueue.player.play(resource);

    if (guildQueue.textChannel) {
      guildQueue.textChannel.send(`🎵 Now playing: **${song.title}** (\`${song.duration}\`)`);
    }
  } catch (err) {
    console.error('Audio Stream Error:', err);
    if (guildQueue.textChannel) {
      guildQueue.textChannel.send(`❌ Failed to play: **${song.title}**`);
    }
    guildQueue.songs.shift();
    playNextSong(guildId);
  }
}

function handleJoin(message) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply('❌ You need to be in a voice channel first!');

  let guildQueue = queues.get(message.guild.id);
  if (guildQueue && guildQueue.voiceChannel.id === voiceChannel.id) {
    return message.reply('🔊 Already in your voice channel!');
  }

  const player = createAudioPlayer();
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator,
  });

  guildQueue = {
    textChannel: message.channel,
    voiceChannel: voiceChannel,
    connection: connection,
    player: player,
    songs: [],
    volume: 50,
    currentResource: null,
    currentSong: null
  };

  queues.set(message.guild.id, guildQueue);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    guildQueue.songs.shift();
    playNextSong(message.guild.id);
  });

  player.on('error', (error) => {
    console.error('Audio Player Error:', error.message);
    guildQueue.songs.shift();
    playNextSong(message.guild.id);
  });

  message.reply(` Joined **${voiceChannel.name}**!`);
}

async function handlePlay(message, args) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply('❌ Join a voice channel first!');

  const query = args.join(' ');
  if (!query) return message.reply('⚠️ Please provide a song name or YouTube URL!');

  let searchResults;
  try {
    searchResults = await play.search(query, { limit: 1 });
  } catch (e) {
    return message.reply('❌ Error searching for the track.');
  }

  if (!searchResults || searchResults.length === 0) {
    return message.reply('❌ No results found.');
  }

  const song = {
    title: searchResults[0].title,
    url: searchResults[0].url,
    duration: searchResults[0].durationRaw || 'Live'
  };

  let guildQueue = queues.get(message.guild.id);

  if (!guildQueue) {
    const player = createAudioPlayer();
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    guildQueue = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: connection,
      player: player,
      songs: [],
      volume: 50,
      currentResource: null,
      currentSong: null
    };

    queues.set(message.guild.id, guildQueue);
    guildQueue.songs.push(song);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
      guildQueue.songs.shift();
      playNextSong(message.guild.id);
    });

    player.on('error', (error) => {
      console.error('Audio Player Error:', error.message);
      guildQueue.songs.shift();
      playNextSong(message.guild.id);
    });

    playNextSong(message.guild.id);
  } else {
    guildQueue.songs.push(song);
    return message.reply(` Added to queue: **${song.title}**`);
  }
}

function handleSkip(message) {
  const guildQueue = queues.get(message.guild.id);
  if (!guildQueue || guildQueue.songs.length === 0) return message.reply('❌ No songs currently playing.');
  guildQueue.player.stop();
  message.reply('⏭️ Skipped current track.');
}

function handleStop(message) {
  const guildQueue = queues.get(message.guild.id);
  if (!guildQueue) return message.reply('❌ Nothing is playing.');
  guildQueue.songs = [];
  guildQueue.player.stop();
  guildQueue.connection.destroy();
  queues.delete(message.guild.id);
  message.reply(' Stopped playback and disconnected.');
}

function setWebVolume(guildId, volumeLevel) {
  const guildQueue = queues.get(guildId);
  if (!guildQueue) return false;
  guildQueue.volume = Math.max(0, Math.min(100, volumeLevel));
  if (guildQueue.currentResource && guildQueue.currentResource.volume) {
    guildQueue.currentResource.volume.setVolume(guildQueue.volume / 100);
  }
  return true;
}

function getMusicStatus(guildId) {
  const guildQueue = queues.get(guildId);
  if (!guildQueue || !guildQueue.currentSong) {
    return { active: false, currentSong: null, volume: 50, queueCount: 0 };
  }
  return {
    active: true,
    currentSong: guildQueue.currentSong,
    volume: guildQueue.volume,
    queueCount: guildQueue.songs.length
  };
}

module.exports = {
  handleJoin,
  handlePlay,
  handleSkip,
  handleStop,
  setWebVolume,
  getMusicStatus,
  queues
};
