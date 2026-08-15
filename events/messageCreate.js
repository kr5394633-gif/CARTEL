const antiSpam = require('../utils/antiSpam');
const autoMod = require('../utils/autoMod');
const config = require('../config.json');
const { prefix } = config;
const musicPlayer = require('../utils/musicPlayer');

function listTextCommands() {
  return [
    '━━━ **MUSIC COMMANDS** (Prefix: `<`) ━━━',
    '',
    '**Playback:**',
    '`<play <query>` — Play a song from YouTube',
    '`<pause` — Pause music',
    '`<resume` — Resume music',
    '`<skip` — Skip to next song',
    '`<stop` — Stop music and leave',
    '`<np` — Show now playing',
    '',
    '**Volume Control:**',
    '`<volume <1-10000>` — Set volume (1-10000)',
    '',
    '**Audio Modes:**',
    '`<system` — Toggle System Mode ⚡',
    '`<systemset <1-200>` — Set System intensity',
    '`<blast` — Toggle Blast Mode 🔥',
    '`<blastset <1-100>` — Set Blast intensity',
    '`<bassboost` — Toggle Bass Boost 🎸',
    '',
    '**Effects:**',
    '`<loudmode` — Auto-boost when others speak 🔊',
    '`<loudset <1-10>` — Set loudmode boost',
    '`<loop` — Toggle song loop 🔄',
    '`<echo` — Toggle echo cancellation',
    '`<noise` — Toggle noise suppression',
    '`<mode <type>` — Set voice mode',
    '',
    '**Utility:**',
    '`<ping` — Check bot latency',
    '`<status` — Show bot status',
    '`<security-status` — Show protection status',
  ].join('\n');
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const trimmed = message.content.trim();

    // Ignore regular mention pings like <@123456789> so they aren't mistaken for prefix commands.
    if (/^<@!?(\d+)>$/.test(trimmed) || /^<@!?(\d+)>(\s|$)/.test(trimmed)) {
      return;
    }

    if (trimmed.startsWith(prefix)) {
      const input = trimmed.slice(prefix.length).trim();
      if (!input) {
        return message.reply("Prefix is set to `<`.\nUse `<help` to see all available commands.");
      }

      const [command, ...args] = input.split(/\s+/);
      const cmd = command.toLowerCase();

      // ━━━ UTILITY COMMANDS ━━━
      if (cmd === 'help') {
        return message.reply(listTextCommands());
      }

      if (cmd === 'ping') {
        return message.reply(`🏓 Pong! Latency: ${Date.now() - message.createdTimestamp}ms`);
      }

      if (cmd === 'status' || cmd === 'serverstatus') {
        return message.reply(
          `**Bot Status**\n✅ ONLINE\n🔗 Prefix: \`${prefix}\`\n🏘️ Guilds: ${message.client.guilds.cache.size}\n👥 Members: ${message.client.guilds.cache.reduce((total, guild) => total + (guild.memberCount || 0), 0)}`
        );
      }

      if (cmd === 'security-status' || cmd === 'security') {
        const antiRaid = config.antiRaid.enabled ? '✅ ON' : '❌ OFF';
        const antiNuke = config.antiNuke.enabled ? '✅ ON' : '❌ OFF';
        const antiSpamSetting = config.antiSpam.enabled ? '✅ ON' : '❌ OFF';
        const verification = config.verification.enabled ? '✅ ON' : '❌ OFF';
        return message.reply(
          `**Security Status**\n🛡️ Anti-Raid: ${antiRaid}\n💣 Anti-Nuke: ${antiNuke}\n💬 Anti-Spam: ${antiSpamSetting}\n✋ Verification: ${verification}`
        );
      }

      // ━━━ MUSIC COMMANDS ━━━
      if (cmd === 'play') {
        const query = args.join(' ');
        if (!query) {
          return message.reply('❌ Usage: `<play <song name or YouTube URL>`');
        }

        if (!message.member?.voice?.channel) {
          return message.reply('❌ You need to join a voice channel first!');
        }

        try {
          const info = await musicPlayer.playSong(
            message.guildId,
            message.member.voice.channel,
            query
          );
          return message.reply(`🎵 Now playing: **${info.title}**\n📍 Channel: <#${message.member.voice.channel.id}>`);
        } catch (error) {
          return message.reply(`❌ Error: ${error.message}`);
        }
      }

      if (cmd === 'pause') {
        try {
          const status = await musicPlayer.getPlayerStatus(message.guildId);
          if (!status.isPlaying) {
            return message.reply('❌ No music is currently playing!');
          }
          await musicPlayer.pauseMusic(message.guildId);
          return message.reply('⏸️ Music paused!');
        } catch (error) {
          return message.reply(`❌ Error: ${error.message}`);
        }
      }

      if (cmd === 'resume') {
        try {
          const status = await musicPlayer.getPlayerStatus(message.guildId);
          if (!status.isPaused) {
            return message.reply('❌ No paused music to resume!');
          }
          await musicPlayer.resumeMusic(message.guildId);
          return message.reply('▶️ Music resumed!');
        } catch (error) {
          return message.reply(`❌ Error: ${error.message}`);
        }
      }

      if (cmd === 'skip') {
        try {
          const status = await musicPlayer.getPlayerStatus(message.guildId);
          if (!status.isPlaying) {
            return message.reply('❌ No song is currently playing!');
          }
          await musicPlayer.skipSong(message.guildId);
          return message.reply('⏭️ Song skipped!');
        } catch (error) {
          return message.reply(`❌ Error: ${error.message}`);
        }
      }

      if (cmd === 'stop') {
        try {
          const status = await musicPlayer.getPlayerStatus(message.guildId);
          if (!status.isConnected && !status.isPlaying) {
            return message.reply('❌ The bot is not playing anything!');
          }
          await musicPlayer.stopMusic(message.guildId);
          return message.reply('⏹️ Music stopped and left the voice channel.');
        } catch (error) {
          return message.reply(`❌ Error: ${error.message}`);
        }
      }

      if (cmd === 'np') {
        try {
          const status = await musicPlayer.getPlayerStatus(message.guildId);
          if (!status.isPlaying) {
            return message.reply('❌ No song is currently playing!');
          }
          const modes = musicPlayer.getModes(message.guildId);
          return message.reply(`🎵 **Now Playing:** ${modes.currentTitle || 'Unknown Track'}`);
        } catch (error) {
          return message.reply(`❌ Error: ${error.message}`);
        }
      }

      // ━━━ VOLUME COMMANDS ━━━
      if (cmd === 'volume') {
        const volStr = args[0];
        if (!volStr) {
          return message.reply('❌ Usage: `<volume <1-10000>`');
        }
        const volume = parseInt(volStr, 10);
        if (isNaN(volume) || volume < 1 || volume > 10000) {
          return message.reply('❌ Volume must be between 1 and 10000');
        }
        musicPlayer.setVolume(message.guildId, volume);
        musicPlayer.applyVolumeEffect(message.guildId);
        const percentage = (volume / 10000) * 100;
        const barLength = Math.floor(percentage / 5);
        const volumeBar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
        const modes = musicPlayer.getModes(message.guildId);
        let effectText = '';
        if (modes.systemMode) effectText = ' ⚡ (System Mode Active)';
        else if (modes.blastMode) effectText = ' 🔥 (Blast Mode Active)';
        return message.reply(`🔊 Volume set to **${volume}/10000** (${Math.round(percentage)}%)${effectText}\n[${volumeBar}]`);
      }

      // ━━━ SYSTEM MODE ━━━
      if (cmd === 'system') {
        try {
          const status = await musicPlayer.getPlayerStatus(message.guildId);
          if (!status.isConnected) {
            return message.reply('❌ Bot is not connected to voice!');
          }
          const modes = musicPlayer.getModes(message.guildId);
          const newState = !modes.systemMode;
          musicPlayer.setSystemMode(message.guildId, newState);
          if (newState) {
            return message.reply(`⚡ **SYSTEM MODE ACTIVATED!** ⚡\nIntensity: ${musicPlayer.getModes(message.guildId).systemIntensity}x (${Math.round(musicPlayer.getModes(message.guildId).systemIntensity * 100)}%)\n\n*Maximum audio enhancement engaged...*`);
          } else {
            return message.reply('⛔ System Mode disabled');
          }
        } catch (error) {
          return message.reply(`❌ Error: ${error.message}`);
        }
      }

      if (cmd === 'systemset') {
        const intensityStr = args[0];
        if (!intensityStr) {
          return message.reply('❌ Usage: `<systemset <1-200>`');
        }
        const intensity = parseInt(intensityStr, 10);
        if (isNaN(intensity) || intensity < 1 || intensity > 200) {
          return message.reply('❌ System intensity must be between 1 and 200');
        }
        musicPlayer.setSystemMode(message.guildId, true, intensity);
        return message.reply(`⚡ System Mode intensity set to **${intensity}x** (${Math.round(intensity * 100)}%)\n*Power level increasing...*`);
      }

      // ━━━ BLAST MODE ━━━
      if (cmd === 'blast') {
        try {
          const status = await musicPlayer.getPlayerStatus(message.guildId);
          if (!status.isConnected) {
            return message.reply('❌ Bot is not connected to voice!');
          }
          const modes = musicPlayer.getModes(message.guildId);
          const newState = !modes.blastMode;
          musicPlayer.setBlastMode(message.guildId, newState);
          if (newState) {
            return message.reply(`🔥 **BLAST MODE ACTIVATED!**\nIntensity: ${musicPlayer.getModes(message.guildId).blastVolume}%`);
          } else {
            return message.reply('⛔ Blast Mode disabled');
          }
        } catch (error) {
          return message.reply(`❌ Error: ${error.message}`);
        }
      }

      if (cmd === 'blastset') {
        const intensityStr = args[0];
        if (!intensityStr) {
          return message.reply('❌ Usage: `<blastset <1-100>`');
        }
        const intensity = parseInt(intensityStr, 10);
        if (isNaN(intensity) || intensity < 1 || intensity > 100) {
          return message.reply('❌ Blast intensity must be between 1 and 100');
        }
        musicPlayer.setBlastMode(message.guildId, true, intensity);
        return message.reply(`🔥 Blast Mode intensity set to **${intensity}%**`);
      }

      // ━━━ AUDIO EFFECTS ━━━
      if (cmd === 'bassboost') {
        const modes = musicPlayer.getModes(message.guildId);
        const newState = !modes.bassBoost;
        musicPlayer.setBassBoost(message.guildId, newState);
        if (newState) {
          return message.reply(`🎸 **BASS BOOST ENABLED**\n*Heavy bass incoming!*`);
        } else {
          return message.reply('⛔ Bass Boost disabled');
        }
      }

      if (cmd === 'loop') {
        const modes = musicPlayer.getModes(message.guildId);
        const newState = !modes.loopMode;
        musicPlayer.setLoopMode(message.guildId, newState);
        if (newState) {
          return message.reply('🔄 **LOOP MODE ENABLED**\nSong will repeat forever!');
        } else {
          return message.reply('⛔ Loop Mode disabled');
        }
      }

      if (cmd === 'echo') {
        const modes = musicPlayer.getModes(message.guildId);
        const newState = !modes.echoCancellation;
        musicPlayer.setEchoCancellation(message.guildId, newState);
        return message.reply(`🔊 Echo Cancellation: ${newState ? '✅ ON' : '❌ OFF'}`);
      }

      if (cmd === 'noise') {
        const modes = musicPlayer.getModes(message.guildId);
        const newState = !modes.noiseSuppression;
        musicPlayer.setNoiseSuppression(message.guildId, newState);
        return message.reply(`🔇 Noise Suppression: ${newState ? '✅ ON' : '❌ OFF'}`);
      }

      // ━━━ LOUD MODE ━━━
      if (cmd === 'loudmode') {
        try {
          const status = await musicPlayer.getPlayerStatus(message.guildId);
          if (!status.isConnected) {
            return message.reply('❌ Bot is not connected to voice!');
          }
          const modes = musicPlayer.getModes(message.guildId);
          const newState = !modes.loudMode;
          musicPlayer.setLoudMode(message.guildId, newState);
          if (newState) {
            return message.reply(`🔊 **LOUD MODE ENABLED**\nBoost: ${musicPlayer.getModes(message.guildId).loudModeBoost}x\nWill boost volume when others speak!`);
          } else {
            return message.reply('⛔ Loud Mode disabled');
          }
        } catch (error) {
          return message.reply(`❌ Error: ${error.message}`);
        }
      }

      if (cmd === 'loudset') {
        const boostStr = args[0];
        if (!boostStr) {
          return message.reply('❌ Usage: `<loudset <1-10>`');
        }
        const boost = parseFloat(boostStr);
        if (isNaN(boost) || boost < 1 || boost > 10) {
          return message.reply('❌ Boost must be between 1 and 10');
        }
        musicPlayer.setLoudMode(message.guildId, true, boost);
        return message.reply(`🔊 Loud Mode boost set to **${boost}x**`);
      }

      // ━━━ VOICE MODE ━━━
      if (cmd === 'mode') {
        const mode = args[0];
        if (!mode) {
          return message.reply('❌ Usage: `<mode <default|none|ptt|voiceactivity>`');
        }
        const validModes = ['default', 'none', 'ptt', 'voiceactivity'];
        if (!validModes.includes(mode)) {
          return message.reply('❌ Valid modes: `default`, `none`, `ptt`, `voiceactivity`');
        }
        musicPlayer.setVoiceMode(message.guildId, mode);
        return message.reply(`🎤 Voice Mode set to **${mode}**`);
      }

      // ━━━ UNKNOWN COMMAND ━━━
      return message.reply(`❌ Unknown command: \`${command}\`\nUse \`<help\` to see all available commands.`);
    }

    // Bad-word filter runs first (deletes + warns + escalates)
    const flaggedByAutoMod = await autoMod.handleMessage(message);
    if (flaggedByAutoMod) return;

    // Then spam/invite/mention checks
    await antiSpam.handleMessage(message);
  },
};
