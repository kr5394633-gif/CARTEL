const config = require('../config.json');
const db = require('./database');
const { dangerEmbed } = require('./embeds');
const { sendLog } = require('./logger');

// guildId -> Map<`${userId}:${actionType}`, number[]> (timestamps)
const actionLog = new Map();
// userIds currently mid-punishment, to avoid double-firing
const punishing = new Set();

function isProtected(guild, userId, client) {
  if (userId === client.user.id) return true;
  if (userId === guild.ownerId) return true;
  if (db.isWhitelisted(guild.id, userId)) return true;
  return false;
}

function recordAction(guildId, userId, actionType, windowMs) {
  if (!actionLog.has(guildId)) actionLog.set(guildId, new Map());
  const guildMap = actionLog.get(guildId);
  const key = `${userId}:${actionType}`;
  const now = Date.now();
  const timestamps = (guildMap.get(key) || []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  guildMap.set(key, timestamps);
  return timestamps.length;
}

/**
 * Looks at the most recent matching audit log entry to find who performed
 * an action. Only trusts entries from the last 15 seconds so we don't
 * misattribute an old, unrelated audit log entry.
 */
async function getExecutor(guild, auditLogType, client) {
  try {
    const logs = await guild.fetchAuditLogs({ type: auditLogType, limit: 5 });
    const entry = logs.entries.first();
    if (!entry) return null;
    if (Date.now() - entry.createdTimestamp > 15000) return null;
    return entry.executor;
  } catch (err) {
    console.error('Anti-nuke: failed to fetch audit logs (needs View Audit Log permission):', err.message);
    return null;
  }
}

async function punish(guild, member, reason, client) {
  if (!member || punishing.has(member.id)) return;
  punishing.add(member.id);
  try {
    const punishment = config.antiNuke.punishment; // "stripRolesAndBan" | "ban" | "kick" | "stripRoles"
    try {
      if (punishment === 'stripRolesAndBan' || punishment === 'ban') {
        if (punishment === 'stripRolesAndBan') {
          const removable = member.roles.cache.filter((r) => r.id !== guild.id && r.editable);
          await member.roles.remove(removable, `NukeGuard: ${reason}`);
        }
        await member.ban({ reason: `NukeGuard: ${reason}` });
      } else if (punishment === 'kick') {
        await member.kick(`NukeGuard: ${reason}`);
      } else {
        const removable = member.roles.cache.filter((r) => r.id !== guild.id && r.editable);
        await member.roles.remove(removable, `NukeGuard: ${reason}`);
      }
    } catch (err) {
      await sendLog(
        guild,
        'securityAlerts',
        dangerEmbed(
          'Anti-Nuke: Punishment Failed',
          `Detected a nuke attempt by **${member.user.tag}** (\`${member.id}\`) for **${reason}**, ` +
            `but I don't have permission to act. Make sure my role is above theirs.`
        )
      );
      return;
    }
    await sendLog(
      guild,
      'securityAlerts',
      dangerEmbed(
        'Anti-Nuke Triggered',
        `**${member.user.tag}** (\`${member.id}\`) was punished for: **${reason}**\nAction: **${punishment}**`
      )
    );
  } finally {
    setTimeout(() => punishing.delete(member.id), 2000);
  }
}

module.exports = { isProtected, recordAction, getExecutor, punish };
