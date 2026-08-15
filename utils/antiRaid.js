const config = require('../config.json');
const { dangerEmbed, warningEmbed } = require('./embeds');
const { sendLog } = require('./logger');

// guildId -> number[] of join timestamps
const joinLog = new Map();
// guildId -> boolean, whether we've already raised verification for the
// current raid burst (avoid spamming guild.edit calls)
const raidActive = new Map();

function isNewAccount(user) {
  const ageMs = Date.now() - user.createdTimestamp;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays < config.antiRaid.newAccountAgeDays;
}

async function quarantineMember(member) {
  const role = member.guild.roles.cache.find((r) => r.name === config.roles.quarantine);
  if (!role) return false;
  try {
    await member.roles.set([role], 'NukeGuard: anti-raid quarantine');
    return true;
  } catch (err) {
    console.error('Anti-raid: failed to quarantine member:', err.message);
    return false;
  }
}

async function handleJoin(member, client) {
  if (!config.antiRaid.enabled) return;
  const guild = member.guild;
  const now = Date.now();

  if (!joinLog.has(guild.id)) joinLog.set(guild.id, []);
  const timestamps = joinLog.get(guild.id).filter((t) => now - t < config.antiRaid.joinWindowMs);
  timestamps.push(now);
  joinLog.set(guild.id, timestamps);

  const newAccount = isNewAccount(member.user);

  // Individual suspicious-account quarantine, independent of raid state
  if (newAccount && config.antiRaid.action === 'quarantine') {
    const quarantined = await quarantineMember(member);
    if (quarantined) {
      await sendLog(
        guild,
        'securityAlerts',
        warningEmbed(
          'New Account Quarantined',
          `**${member.user.tag}** (\`${member.id}\`) joined with an account younger than ` +
            `${config.antiRaid.newAccountAgeDays} days and was quarantined pending manual review.`
        )
      );
    }
  }

  // Raid-burst detection
  if (timestamps.length >= config.antiRaid.joinThreshold) {
    if (!raidActive.get(guild.id)) {
      raidActive.set(guild.id, true);
      try {
        if (guild.verificationLevel !== 4) {
          // 4 = VERY_HIGH — requires verified phone, strongest anti-raid setting
          await guild.setVerificationLevel(4, 'NukeGuard: join-spike raid detected');
        }
      } catch (err) {
        console.error('Anti-raid: failed to raise verification level:', err.message);
      }
      await sendLog(
        guild,
        'securityAlerts',
        dangerEmbed(
          'Possible Raid Detected',
          `**${timestamps.length}** members joined within ${config.antiRaid.joinWindowMs / 1000}s.\n` +
            `Server verification level has been temporarily raised to the highest setting. ` +
            `Lower it back manually once the raid has passed.`
        )
      );
      // auto-clear the "active" flag after the join window so a future
      // burst can re-trigger the alert
      setTimeout(() => raidActive.set(guild.id, false), config.antiRaid.joinWindowMs);
    }
  }
}

module.exports = { handleJoin, isNewAccount };
