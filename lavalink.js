const { Riffy } = require('riffy');
const config = require('./config-music.json');
const colors = require('./utils/colors');

const envNode = {
  name: process.env.LAVALINK_NAME || 'Lavalink',
  host: process.env.LAVALINK_HOST || (config.nodes && config.nodes[0]?.host) || '',
  port: Number(process.env.LAVALINK_PORT || (config.nodes && config.nodes[0]?.port) || 2333),
  password: process.env.LAVALINK_PASSWORD || (config.nodes && config.nodes[0]?.password) || 'youshallnotpass',
  secure: process.env.LAVALINK_SECURE === 'true' || (config.nodes && config.nodes[0]?.secure) || false
};

const resolvedNodes = [];

class LavalinkNodeManager {
  constructor(client) {
    this.client = client;
    this.riffy = null;
    this.nodes = [];
  }

  async initializeRiffy() {
    try {
      if (!this.client.user?.id) {
        throw new Error('Bot not logged in. Cannot initialize Riffy. Please ensure bot is ready before calling initializeRiffy.');
      }

      if (!resolvedNodes.length) {
        console.warn(`${colors.cyan}[ LAVALINK ]${colors.reset} ${colors.yellow}No music source configured. Music is disabled.${colors.reset}`);
        this.riffy = null;
        return null;
      }

      this.riffy = new Riffy(this.client, resolvedNodes, {
        send: (guildId, payload) => {
          const guild = this.client.guilds.cache.get(guildId);
          if (guild?.shard) guild.shard.send(payload);
        },
        defaultSearchEngine: 'youtube',
        autoResume: true
      });

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
      const message = error?.message || String(error);
      console.warn(`${colors.cyan}[ LAVALINK ]${colors.reset} ${colors.yellow}Music node unavailable: ${message}${colors.reset}`);
      console.warn(`${colors.cyan}[ LAVALINK ]${colors.reset} ${colors.yellow}The configured Lavalink node is not responding. Bot is staying online, but music playback is disabled until a valid Lavalink node is configured.${colors.reset}`);
      this.riffy = null;
      return null;
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
