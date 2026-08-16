const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus,
  StreamType
} = require('@discordjs/voice');
const play = require('play-dl');
const prism = require('prism-media');
const ffmpeg = require('ffmpeg-static');

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
    const streamInfo = await play.stream(song.url, { 
      quality: 2, 
      discordPlayerCompatibility: true 
    });

    const ffmpegProcess = new prism.FFmpeg({
      shell: false,
      command: ffmpeg,
      args: [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', streamInfo.url,
        '-analyzeduration', '0',
        '-loglevel', '0',
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2',
      ],
    });

    const resource = createAudioResource(ffmpegProcess, {
      inputType: StreamType.Raw,
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
      guildQueue.textChannel.send(`❌ Playback stream error on: **${song.title}**`);
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
    return message.reply('❌ Failed to establish connection to the voice channel.');
  }

  const player = createAudioPlayer();

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
  if (!query) return message.reply('⚠️ Please provide a song name or URL!');

  let song = null;

  try {
    if (play.yt_validate(query) === 'video') {
      const info = await play.video_basic_info(query);
      song = {
        title: info.video_details.title,
        url: info.video_details.url
      };
    } else {
      const searchResults = await play.search(query, { limit: 1, source: { youtube: 'video' } });
      if (searchResults && searchResults.length > 0) {
        song = {
          title: searchResults[0].title,
          url: searchResults[0].url
        };
      }
    }
  } catch (err) {
    console.error('Search error:', err);
    return message.reply('❌ Could not find track information.');
  }

  if (!song) {
    return message.reply('❌ No results found.');
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

    const player = createAudioPlayer();

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
  guildQueue.connection.destroy();
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