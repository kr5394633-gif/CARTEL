const config = require('./config-music.json');
const { initializeLavalinkManager } = require('./lavalink');
const colors = require('./utils/colors');

async function initializePlayer(client) {
  try {
    const manager = await initializeLavalinkManager(client);
    const riffy = manager.getRiffy();
    
    // Setup Riffy event handlers for presence updates
    riffy.on('trackStart', (player, track) => {
      if (client.user) {
        client.user.setPresence({
          activities: [{ name: `🎵 ${track.title}`, type: 'PLAYING' }],
          status: 'online'
        }).catch(() => {});
      }
    });

    riffy.on('trackEnd', (player) => {
      if (client.user && !player.queue.length) {
        client.user.setPresence({
          activities: [{ name: config.activityName || '🎵 Music', type: config.activityType || 'LISTENING' }],
          status: 'online'
        }).catch(() => {});
      }
    });

    riffy.on('playerCreate', (player) => {
      console.log(`${colors.cyan}[ PLAYER ]${colors.reset} ${colors.green}Player created for guild ${player.guildId}${colors.reset}`);
    });

    riffy.on('playerDestroy', (player) => {
      console.log(`${colors.cyan}[ PLAYER ]${colors.reset} ${colors.yellow}Player destroyed for guild ${player.guildId}${colors.reset}`);
    });

    // Setup raw packet handler for voice updates
    client.on('raw', async (packet) => {
      const players = riffy.players;
      const player = players?.get(packet.d?.guild_id);
      
      if (packet.t === 'VOICE_SERVER_UPDATE') {
        if (player) {
          await player.voiceServer(packet.d).catch(() => {});
        }
      }
      
      if (packet.t === 'VOICE_STATE_UPDATE') {
        if (packet.d?.user_id !== client.user?.id) return;
        if (player) {
          await player.voiceState(packet.d).catch(() => {});
        }
      }
    });

    console.log(`${colors.cyan}[ PLAYER ]${colors.reset} ${colors.green}Music player initialized${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Failed to initialize player:${colors.reset}`, error);
    throw error;
  }
}

module.exports = { initializePlayer };
