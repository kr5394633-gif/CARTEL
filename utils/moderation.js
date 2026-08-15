const config = require('../config.json');
const { warningEmbed, dangerEmbed } = require('./embeds');
const { sendLog } = require('./logger');

/**
 * Checks config.autoMod.warnEscalation for an action tied to this exact
 * warn count (e.g. "3": "mute_10m", "5": "kick", "7": "ban") and applies it.
 * Returns the action string that was applied, or null if none matched.
 */
async function applyWarnEscalation(member, warnCount, reason) {
  const escalation = config.autoMod.warnEscalation;
  const action = escalation[String(warnCount)];
  if (!action || !member) return null;

  try {
    if (action.startsWith('mute_')) {
      const minutes = parseInt(action.split('_')[1], 10) || 10;
      await member.timeout(minutes * 60 * 1000, `NukeGuard: reached ${warnCount} warns (${reason})`);
      await sendLog(
        member.guild,
        'modLogs',
        warningEmbed(
          'Warn Escalation: Muted',
          `${member.user} reached **${warnCount}** warns and was muted for ${minutes} minutes.`
        )
      );
    } else if (action === 'kick') {
      await member.kick(`NukeGuard: reached ${warnCount} warns (${reason})`);
      await sendLog(
        member.guild,
        'modLogs',
        warningEmbed('Warn Escalation: Kicked', `${member.user.tag} reached **${warnCount}** warns and was kicked.`)
      );
    } else if (action === 'ban') {
      await member.ban({ reason: `NukeGuard: reached ${warnCount} warns (${reason})` });
      await sendLog(
        member.guild,
        'modLogs',
        dangerEmbed('Warn Escalation: Banned', `${member.user.tag} reached **${warnCount}** warns and was banned.`)
      );
    }
    return action;
  } catch (err) {
    console.error('Warn escalation failed:', err.message);
    return null;
  }
}

module.exports = { applyWarnEscalation };
