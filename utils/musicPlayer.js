const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const play = require('play-dl');

class MusicPlayer {
  constructor() {
    this.queues = new Map();
    this.players = new Map();
    this.modes = new Map(); // Track modes per guild
    this.initializeModes();
  }

  initializeModes() {
    this.defaultModes = {
      volume: 50, // 1-10000
      blastMode: false,
      blastVolume: 50,
      systemMode: false,
      systemIntensity: 100,
      bassBoost: false,
      loudMode: false,
      loudModeBoost: 2.0,
      loopMode: false,
      echoCancellation: true,
      noiseSuppression: true,
      voiceMode: 'default',
      currentTitle: 'Unknown',
      currentUrl: null,
    };
  }

  getGuildModes(guildId) {
    if (!this.modes.has(guildId)) {
      this.modes.set(guildId, JSON.parse(JSON.stringify(this.defaultModes)));
    }
    return this.modes.get(guildId);
  }

  async getQueue(guildId) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, []);
    }
    return this.queues.get(guildId);
  }

  async getPlayer(guildId) {
    if (!this.players.has(guildId)) {
      const player = createAudioPlayer();
      this.players.set(guildId, { player, connection: null });
    }
    return this.players.get(guildId);
  }

  async joinVoice(voiceChannel) {
    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      const playerData = await this.getPlayer(voiceChannel.guild.id);
      playerData.connection = connection;

      connection.subscribe(playerData.player);
      return connection;
    } catch (error) {
      console.error('Error joining voice channel:', error);
      throw error;
    }
  }

  async playSong(guildId, voiceChannel, query) {
    try {
      // Search for the song
      let stream, info;
      
      if (query.includes('youtube.com') || query.includes('youtu.be')) {
        // YouTube URL
        stream = await play.stream(query);
        info = { title: 'Unknown Track', duration: 0, url: query };
      } else if (query.includes('spotify.com')) {
        throw new Error('Spotify support requires additional setup');
      } else {
        // YouTube search
        const results = await play.search(query, { limit: 1 });
        if (!results || results.length === 0) {
          throw new Error('No results found');
        }
        stream = await play.stream(results[0].url);
        info = {
          title: results[0].title,
          duration: results[0].durationInSec,
          url: results[0].url,
        };
      }

      // Join voice channel if not already connected
      const playerData = await this.getPlayer(guildId);
      if (!playerData.connection) {
        await this.joinVoice(voiceChannel);
      }

      const modes = this.getGuildModes(guildId);
      modes.currentUrl = info.url;
      modes.currentTitle = info.title;

      // Create and play audio resource
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
      });

      // Apply initial volume
      const vol = Math.min((modes.volume / 5000), 2);
      resource.volume.setVolume(vol);
      
      playerData.player.play(resource);
      playerData.currentResource = resource;

      return info;
    } catch (error) {
      console.error('Error playing song:', error);
      throw error;
    }
  }

  async stopMusic(guildId) {
    const playerData = await this.getPlayer(guildId);
    if (playerData.player) {
      playerData.player.stop();
    }
    if (playerData.connection) {
      playerData.connection.destroy();
      playerData.connection = null;
    }
    const queue = await this.getQueue(guildId);
    queue.length = 0;
  }

  async skipSong(guildId) {
    const playerData = await this.getPlayer(guildId);
    if (playerData.player) {
      playerData.player.stop();
    }
  }

  async pauseMusic(guildId) {
    const playerData = await this.getPlayer(guildId);
    if (playerData.player) {
      playerData.player.pause();
    }
  }

  async resumeMusic(guildId) {
    const playerData = await this.getPlayer(guildId);
    if (playerData.player) {
      playerData.player.unpause();
    }
  }

  setVolume(guildId, volume) {
    const modes = this.getGuildModes(guildId);
    modes.volume = Math.min(Math.max(volume, 1), 10000);
    
    const playerData = this.players.get(guildId);
    if (playerData?.currentResource?.volume) {
      const normalizedVolume = Math.min((modes.volume / 5000), 2);
      playerData.currentResource.volume.setVolume(normalizedVolume);
    }
  }

  setBlastMode(guildId, enabled, intensity = 50) {
    const modes = this.getGuildModes(guildId);
    modes.blastMode = enabled;
    modes.blastVolume = Math.min(Math.max(intensity, 1), 100);
    
    if (enabled) {
      modes.systemMode = false;
      this.applyVolumeEffect(guildId);
    }
    
    return modes.blastVolume;
  }

  setSystemMode(guildId, enabled, intensity = 100) {
    const modes = this.getGuildModes(guildId);
    modes.systemMode = enabled;
    modes.systemIntensity = Math.min(Math.max(intensity, 1), 200);
    
    if (enabled) {
      modes.blastMode = false;
      this.applyVolumeEffect(guildId);
    }
    
    return modes.systemIntensity;
  }

  setBassBoost(guildId, enabled) {
    const modes = this.getGuildModes(guildId);
    modes.bassBoost = enabled;
    return enabled;
  }

  setLoudMode(guildId, enabled, boost = 2.0) {
    const modes = this.getGuildModes(guildId);
    modes.loudMode = enabled;
    modes.loudModeBoost = Math.min(Math.max(boost, 1), 10);
    return modes.loudModeBoost;
  }

  setLoopMode(guildId, enabled) {
    const modes = this.getGuildModes(guildId);
    modes.loopMode = enabled;
    return enabled;
  }

  setEchoCancellation(guildId, enabled) {
    const modes = this.getGuildModes(guildId);
    modes.echoCancellation = enabled;
    return enabled;
  }

  setNoiseSuppression(guildId, enabled) {
    const modes = this.getGuildModes(guildId);
    modes.noiseSuppression = enabled;
    return enabled;
  }

  setVoiceMode(guildId, mode) {
    const modes = this.getGuildModes(guildId);
    const validModes = ['default', 'none', 'ptt', 'voiceactivity'];
    if (validModes.includes(mode)) {
      modes.voiceMode = mode;
      return mode;
    }
    return modes.voiceMode;
  }

  applyVolumeEffect(guildId) {
    const modes = this.getGuildModes(guildId);
    const playerData = this.players.get(guildId);
    
    if (!playerData?.currentResource?.volume) return;
    
    let effectiveVolume = modes.volume;
    
    if (modes.systemMode) {
      effectiveVolume = Math.min(modes.volume * (modes.systemIntensity / 100), 10000);
    } else if (modes.blastMode) {
      effectiveVolume = Math.min(modes.volume * (modes.blastVolume / 50), 10000);
    }
    
    const normalizedVolume = Math.min((effectiveVolume / 5000), 2);
    playerData.currentResource.volume.setVolume(normalizedVolume);
  }

  async getPlayerStatus(guildId) {
    const playerData = await this.getPlayer(guildId);
    const modes = this.getGuildModes(guildId);
    
    return {
      isPlaying: playerData.player?.state?.status === AudioPlayerStatus.Playing,
      isPaused: playerData.player?.state?.status === AudioPlayerStatus.Paused,
      isConnected: playerData.connection?.state?.status === VoiceConnectionStatus.Ready,
      modes: modes,
    };
  }

  getModes(guildId) {
    return this.getGuildModes(guildId);
  }
}

module.exports = new MusicPlayer();
