const { Riffy } = require('riffy');
const config = require('./config-music.json');
const colors = require('./utils/colors');

class LavalinkNodeManager {
  constructor(client) {
    this.client = client;
    this.riffy = null;
    this.nodes = [];
  }

  async initializeRiffy() {
    try {
      this.riffy = new Riffy(this.client, config.nodes, {
        send: (guildId, payload) => {
          const guild = this.client.guilds.cache.get(guildId);
          if (guild?.shard) guild.shard.send(payload);
        },
        defaultSearchEngine: 'youtube',
        autoResume: true
      });

      // Setup event handlers
      this.riffy.on('nodeConnect', (node) => {
        console.log(`${colors.cyan}[ LAVALINK ]${colors.reset} ${colors.green}Node ${node.name} connected${colors.reset}`);
      });

      this.riffy.on('nodeError', (node, error) => {
        console.error(`${colors.cyan}[ LAVALINK ]${colors.reset} ${colors.red}Node ${node.name} error: ${error.message}${colors.reset}`);
      });

      this.riffy.on('nodeDisconnect', (node) => {
        console.warn(`${colors.cyan}[ LAVALINK ]${colors.reset} ${colors.yellow}Node ${node.name} disconnected${colors.reset}`);
      });

      this.riffy.on('trackStart', (player, track) => {
        if (player.data?.channel) {
          player.data.channel.send({ 
            content: `🎵 Now playing: **${track.title}** by ${track.author}` 
          }).catch(() => {});
        }
      });

      this.riffy.on('trackEnd', (player) => {
        if (!player.queue.length && player.data?.channel) {
          player.data.channel.send({ 
            content: '⏹️ Queue ended' 
          }).catch(() => {});
        }
      });

      await this.riffy.init(this.client.user.id);
      console.log(`${colors.cyan}[ LAVALINK ]${colors.reset} ${colors.green}Riffy initialized successfully${colors.reset}`);

      return this.riffy;
    } catch (error) {
      console.error(`${colors.red}Failed to initialize Riffy:${colors.reset}`, error);
      throw error;
    }
  }

  getRiffy() {
    if (!this.riffy) throw new Error('Riffy not initialized');
    return this.riffy;
  }
}

let nodeManagerInstance = null;

async function initializeLavalinkManager(client) {
  if (nodeManagerInstance) return nodeManagerInstance;
  
  nodeManagerInstance = new LavalinkNodeManager(client);
  await nodeManagerInstance.initializeRiffy();
  return nodeManagerInstance;
}

function getLavalinkManager() {
  if (!nodeManagerInstance) throw new Error('Lavalink manager not initialized');
  return nodeManagerInstance;
}

module.exports = {
  initializeLavalinkManager,
  getLavalinkManager
};
