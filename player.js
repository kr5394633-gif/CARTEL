const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  entersState, 
  VoiceConnectionStatus,
  StreamType,
  NoSubscriberBehavior
} = require('@discordjs/voice');
const play = require('play-dl');

const queues = new Map();

// Initialize SoundCloud Client ID once on startup
(async () => {
  try {
    const scClientId = await play.getFreeClientID();
    if (scClientId) {
      await play.setToken({
        soundcloud: {
          client_id: scClientId
        }
      });
      console.log('✅ SoundCloud streaming engine verified');
    }
  } catch (err) {
    console.warn('SoundCloud token initialization note:', err.message);
  }
})();

async function playNextSong(guildId) {
  const guildQueue = queues.get(guildId);
  if (!guildQueue) return;

  if (guildQueue.songs.length === 0) {
    guildQueue.currentResource = null;
    guildQueue.currentSong = null;
    if (guildQueue.connection) {
      guildQueue.connection.destroy();
    }
    queues.delete(guildId);
    return;
  }

  const song = guildQueue.songs[0];
  guildQueue.currentSong = song;

  try {
    let streamInfo;
    
    // First try SoundCloud / Direct stream
    try {
      streamInfo = await play.stream(song.url, { quality: 2 });
    } catch (e) {
      streamInfo = await play.stream(song.url, { quality: 2, discordPlayerCompatibility: true });
    }

    const resource = createAudioResource(streamInfo.stream, {
      inputType: streamInfo.type || StreamType.Arbitrary,
      inlineVolume: true
    });

    if (resource.volume) {
      resource.volume.setVolume(guildQueue.volume / 100);
    }

    guildQueue.currentResource = resource;
    guildQueue.player.play(resource);

    if (guildQueue.textChannel) {
      guildQueue.textChannel.send(`🎵 Now playing: **${song.title}**`);
    }
  } catch (err) {
    console.error('Audio Stream Extraction Error:', err);
    if (guildQueue.textChannel) {
      guildQueue.textChannel.send(`❌ Could not stream: **${song.title}** (Skipping)`);
    }
    guildQueue.songs.shift();
    playNextSong(guildId);
  }
}

async function handleJoin(message) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply('❌ You need to be in a voice channel first!');

  let guildQueue = queues.get(message.guild.id);
  if (guildQueue && guildQueue.voiceChannel.id === voiceChannel.id) {
    return message.reply('🔊 Already connected to your voice channel!');
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: false
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  } catch (error) {
    connection.destroy();
    return message.reply('❌ Failed to connect to the voice channel.');
  }

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play
    }
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
    console.error('Audio Player Runtime Error:', error.message);
    guildQueue.songs.shift();
    playNextSong(message.guild.id);
  });

  message.reply(` Joined **${voiceChannel.name}**!`);
}

async function handlePlay(message, args) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.reply('❌ Join a voice channel first!');

  const query = args.join(' ');
  if (!query) return message.reply('⚠️ Please provide a song name or track link!');

  let song = null;

  try {
    if (play.so_validate(query) === 'track') {
      const info = await play.soundcloud(query);
      song = { title: info.name, url: info.url };
    } else {
      // Primary: Search SoundCloud (prevents YouTube 429 Data Center blocking)
      let results = await play.search(query, { limit: 1, source: { soundcloud: 'tracks' } }).catch(() => []);
      
      // Secondary: Fallback to YouTube if no SoundCloud track is found
      if (!results || results.length === 0) {
        results = await play.search(query, { limit: 1, source: { youtube: 'video' } }).catch(() => []);
      }

      if (results && results.length > 0) {
        song = {
          title: results[0].title || results[0].name,
          url: results[0].url
        };
      }
    }
  } catch (err) {
    console.error('Search error:', err.message);
    return message.reply('❌ Error fetching track. Try another song title.');
  }

  if (!song) {
    return message.reply('❌ No tracks found for that search query.');
  }

  let guildQueue = queues.get(message.guild.id);

  if (!guildQueue) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    } catch (error) {
      connection.destroy();
      return message.reply('❌ Voice connection timed out.');
    }

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play
      }
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
      console.error('Audio Player Runtime Error:', error.message);
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
  message.reply('⏭️ Skipped track.');
}

function handleStop(message) {
  const guildQueue = queues.get(message.guild.id);
  if (!guildQueue) return message.reply('❌ Nothing is playing.');
  guildQueue.songs = [];
  guildQueue.player.stop();
  if (guildQueue.connection) {
    guildQueue.connection.destroy();
  }
  queues.delete(message.guild.id);
  message.reply(' Stopped and disconnected.');
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