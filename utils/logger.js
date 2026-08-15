const config = require('../config.json');
const db = require('./database');

/**
 * Finds a text channel in the guild by the name configured in config.json's
 * logChannels block, and sends an embed to it. Silently no-ops if the
 * channel doesn't exist or the bot lacks permission (so a missing log
 * channel never crashes an event handler).
 *
 * Also persists every logged event to the alerts table regardless of
 * whether a matching Discord channel exists — this is what feeds the
 * RED EXE web dashboard's live activity panel.
 */
async function sendLog(guild, channelKey, embed) {
  try {
    const data = embed.data || {};
    const title = (data.title || '').replace(/^[^\w]*/, ''); // strip leading emoji for cleaner dashboard text
    db.addAlert(guild.id, channelKey, title || '(no title)', data.description || '');
  } catch (err) {
    console.error('Failed to persist alert:', err.message);
  }

  const channelName = config.logChannels[channelKey];
  if (!channelName) return;
  const channel = guild.channels.cache.find(
    (c) => c.name === channelName && c.isTextBased && c.isTextBased()
  );
  if (!channel) return;
  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(`Failed to send log to #${channelName}:`, err.message);
  }
}

module.exports = { sendLog };
