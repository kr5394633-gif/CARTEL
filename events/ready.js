const { ActivityType } = require('discord.js');
const config = require('../config.json');
const { initializePlayer } = require('../player');
const colors = require('../utils/colors');

const ACTIVITY_TYPE_MAP = {
  Playing: ActivityType.Playing,
  Watching: ActivityType.Watching,
  Listening: ActivityType.Listening,
  Competing: ActivityType.Competing,
  Streaming: ActivityType.Streaming,
};

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag} (ID: ${client.user.id})`);
    console.log(`Serving ${client.guilds.cache.size} server(s).`);

    // Set bot presence with bot name and default activity
    if (client.user) {
      try {
        await client.user.setPresence({
          activities: [{ 
            name: client.user.username || 'Music', 
            type: ActivityType.Watching 
          }],
          status: 'online'
        });
      } catch (error) {
        console.error('Failed to set presence:', error);
      }
    }

    // Initialize music player with Riffy/Lavalink NOW that bot is logged in
    try {
      await initializePlayer(client);
      console.log(`${colors.green}✅ Music player initialized successfully${colors.reset}`);
    } catch (err) {
      console.error(`${colors.red}Failed to initialize music player:${colors.reset}`, err);
    }

    const statuses = config.presence?.statuses || [];
    let i = 0;

    function setNextPresence() {
      if (statuses.length === 0) return;
      const status = statuses[i % statuses.length];
      const type = ACTIVITY_TYPE_MAP[status.type] ?? ActivityType.Watching;
      client.user.setPresence({ activities: [{ name: status.text, type }], status: 'online' });
      i++;
    }

    if (statuses.length > 0) {
      setNextPresence();
      setInterval(setNextPresence, config.presence?.rotateEveryMs || 10000);
    }
  },
};
