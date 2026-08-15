const config = require('../config.json');
const db = require('./database');
const { warningEmbed } = require('./embeds');
const { sendLog } = require('./logger');
const { applyWarnEscalation } = require('./moderation');

/**
 * Checks a message against the configured bad-word list. If it matches,
 * deletes the message, auto-warns the author, and runs warn escalation.
 * Returns true if the message was flagged.
 */
async function handleMessage(message) {
  if (message.author.bot || !message.guild || !message.member) return false;
  if (message.member.permissions.has('Administrator')) return false;
  if (db.isWhitelisted(message.guild.id, message.author.id)) return false;

  const badWords = config.autoMod.badWords || [];
  if (badWords.length === 0) return false;

  const content = message.content.toLowerCase();
  const matched = badWords.find((w) => content.includes(w.toLowerCase()));
  if (!matched) return false;

  try {
    await message.delete();
  } catch (err) {
    // already gone / no perms
  }

  db.addWarn(message.guild.id, message.author.id, message.client.user.id, 'Auto-mod: prohibited language');
  const warnCount = db.countWarns(message.guild.id, message.author.id);

  await sendLog(
    message.guild,
    'modLogs',
    warningEmbed(
      'Auto-Mod: Message Removed',
      `${message.author} used prohibited language in ${message.channel}. Auto-warned (now **${warnCount}** warn(s)).`
    )
  );

  await applyWarnEscalation(message.member, warnCount, 'prohibited language');
  return true;
}

module.exports = { handleMessage };
