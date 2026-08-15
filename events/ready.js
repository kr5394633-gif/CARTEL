const { ActivityType } = require('discord.js');
const config = require('../config.json');

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

    const statuses = config.presence.statuses;
    let i = 0;

    function setNextPresence() {
      if (statuses.length === 0) return;
      const status = statuses[i % statuses.length];
      const type = ACTIVITY_TYPE_MAP[status.type] ?? ActivityType.Watching;
      client.user.setPresence({ activities: [{ name: status.text, type }], status: 'online' });
      i++;
    }

    setNextPresence();
    setInterval(setNextPresence, config.presence.rotateEveryMs || 10000);
  },
};
