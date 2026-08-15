const config = require('../config.json');
const { warningEmbed } = require('./embeds');
const { sendLog } = require('./logger');

const INVITE_REGEX = /(discord\.gg|discord(?:app)?\.com\/invite)\/[a-zA-Z0-9-]+/i;

// `${guildId}:${userId}` -> number[] of message timestamps
const messageLog = new Map();

async function timeoutMember(member, reason) {
  try {
    await member.timeout(config.antiSpam.muteMinutes * 60 * 1000, `NukeGuard anti-spam: ${reason}`);
  } catch (err) {
    console.error('Anti-spam: failed to timeout member:', err.message);
  }
}

/**
 * Runs all anti-spam checks against a message. Returns true if the message
 * was flagged and acted on (deleted / member punished), false otherwise.
 */
async function handleMessage(message) {
  if (!config.antiSpam.enabled) return false;
  if (message.author.bot || !message.guild || !message.member) return false;
  if (message.member.permissions.has('Administrator')) return false;

  const db = require('./database');
  if (db.isWhitelisted(message.guild.id, message.author.id)) return false;

  // Invite link auto-delete
  if (config.antiSpam.deleteInvites && INVITE_REGEX.test(message.content)) {
    await safeDelete(message);
    await sendLog(
      message.guild,
      'securityAlerts',
      warningEmbed(
        'Invite Link Removed',
        `Deleted a Discord invite link posted by ${message.author} in ${message.channel}.`
      )
    );
    return true;
  }

  // Mass mention spam
  const mentionCount = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);
  if (config.antiSpam.deleteMassMentions && mentionCount >= config.antiSpam.massMentionThreshold) {
    await safeDelete(message);
    await timeoutMember(message.member, 'mass mention spam');
    await sendLog(
      message.guild,
      'securityAlerts',
      warningEmbed(
        'Mass Mention Spam',
        `${message.author} mentioned ${mentionCount} users/roles in one message and was timed out ` +
          `for ${config.antiSpam.muteMinutes} minutes.`
      )
    );
    return true;
  }

  // Message flood
  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const timestamps = (messageLog.get(key) || []).filter((t) => now - t < config.antiSpam.windowMs);
  timestamps.push(now);
  messageLog.set(key, timestamps);

  if (timestamps.length >= config.antiSpam.messageThreshold) {
    messageLog.set(key, []); // reset so we don't re-trigger every message during the timeout
    await safeDelete(message);
    await timeoutMember(message.member, 'message flood / spam');
    await sendLog(
      message.guild,
      'securityAlerts',
      warningEmbed(
        'Spam Flood Detected',
        `${message.author} sent ${config.antiSpam.messageThreshold}+ messages within ` +
          `${config.antiSpam.windowMs / 1000}s and was timed out for ${config.antiSpam.muteMinutes} minutes.`
      )
    );
    return true;
  }

  return false;
}

async function safeDelete(message) {
  try {
    await message.delete();
  } catch (err) {
    // message may already be gone / no perms — non-fatal
  }
}

module.exports = { handleMessage };
