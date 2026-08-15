const config = require('../config.json');
const { successEmbed, warningEmbed, dangerEmbed } = require('../utils/embeds');
const { sendLog } = require('../utils/logger');
const warnsCmd = require('../commands/moderation/warns');
const helpCmd = require('../commands/utility/help');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        
        // Support both run (Riffy) and execute (legacy) methods
        if (command.run) {
          await command.run(client, interaction);
        } else if (command.execute) {
          await command.execute(interaction, client);
        }
        return;
      }

      if (interaction.isButton()) {
        await handleButton(interaction, client);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction, client);
        return;
      }
    } catch (err) {
      console.error('Interaction error:', err);
      const payload = { embeds: [dangerEmbed('Error', 'Something went wrong handling that.')], ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};

async function handleButton(interaction, client) {
  const [scope, action, ...rest] = interaction.customId.split(':');

  // ---------- Verification ----------
  if (scope === 'verify' && action === 'click') {
    const member = interaction.member;
    const verifiedRole = interaction.guild.roles.cache.find((r) => r.name === config.verification.verifiedRole);
    const unverifiedRole = interaction.guild.roles.cache.find((r) => r.name === config.verification.unverifiedRole);

    if (!verifiedRole) {
      return interaction.reply({
        embeds: [warningEmbed('Setup Needed', `The "${config.verification.verifiedRole}" role doesn't exist yet — ask an admin to create it.`)],
        ephemeral: true,
      });
    }
    if (member.roles.cache.has(verifiedRole.id)) {
      return interaction.reply({ embeds: [warningEmbed('Already Verified', "You're already verified!")], ephemeral: true });
    }

    try {
      await member.roles.add(verifiedRole, 'Verification button');
      if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
        await member.roles.remove(unverifiedRole, 'Verification button');
      }
      await interaction.reply({ embeds: [successEmbed('Verified!', "You've been verified and now have full access.")], ephemeral: true });
    } catch (err) {
      await interaction.reply({
        embeds: [warningEmbed('Error', "I couldn't assign your role — my role may be below the Verified role.")],
        ephemeral: true,
      });
    }
    return;
  }

  // ---------- Kick confirmation ----------
  if (scope === 'kick' && (action === 'confirm' || action === 'cancel')) {
    const [targetId, moderatorId] = rest;
    if (interaction.user.id !== moderatorId) {
      return interaction.reply({ embeds: [warningEmbed('Not For You', 'Only the person who ran this command can confirm it.')], ephemeral: true });
    }
    const key = `kick:${targetId}:${moderatorId}`;
    const reason = (client.pendingActions && client.pendingActions.get(key)) || 'No reason provided';
    client.pendingActions?.delete(key);

    if (action === 'cancel') {
      return interaction.update({ embeds: [warningEmbed('Cancelled', 'Kick cancelled.')], components: [] });
    }

    const member = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!member) {
      return interaction.update({ embeds: [warningEmbed('Error', 'That member is no longer in the server.')], components: [] });
    }
    try {
      await member.kick(reason);
      await interaction.update({ embeds: [successEmbed('Member Kicked', `${member.user.tag} was kicked.\n**Reason:** ${reason}`)], components: [] });
      await sendLog(interaction.guild, 'modLogs', warningEmbed('Member Kicked', `${member.user.tag} was kicked by ${interaction.user}.\n**Reason:** ${reason}`));
    } catch (err) {
      await interaction.update({ embeds: [warningEmbed('Error', `Failed to kick: ${err.message}`)], components: [] });
    }
    return;
  }

  // ---------- Ban confirmation ----------
  if (scope === 'ban' && (action === 'confirm' || action === 'cancel')) {
    const [targetId, moderatorId] = rest;
    if (interaction.user.id !== moderatorId) {
      return interaction.reply({ embeds: [warningEmbed('Not For You', 'Only the person who ran this command can confirm it.')], ephemeral: true });
    }
    const key = `ban:${targetId}:${moderatorId}`;
    const reason = (client.pendingActions && client.pendingActions.get(key)) || 'No reason provided';
    client.pendingActions?.delete(key);

    if (action === 'cancel') {
      return interaction.update({ embeds: [warningEmbed('Cancelled', 'Ban cancelled.')], components: [] });
    }

    try {
      await interaction.guild.members.ban(targetId, { reason });
      await interaction.update({ embeds: [successEmbed('Member Banned', `<@${targetId}> was banned.\n**Reason:** ${reason}`)], components: [] });
      await sendLog(interaction.guild, 'modLogs', dangerEmbed('Member Banned', `<@${targetId}> was banned by ${interaction.user}.\n**Reason:** ${reason}`));
    } catch (err) {
      await interaction.update({ embeds: [warningEmbed('Error', `Failed to ban: ${err.message}`)], components: [] });
    }
    return;
  }

  // ---------- Warns pagination ----------
  if (scope === 'warns' && (action === 'prev' || action === 'next')) {
    const [userId, pageStr] = rest;
    const db = require('../utils/database');
    const currentPage = parseInt(pageStr, 10);
    const newPage = action === 'next' ? currentPage + 1 : currentPage - 1;

    const targetUser = await client.users.fetch(userId).catch(() => null);
    if (!targetUser) return interaction.update({ embeds: [warningEmbed('Error', 'User not found.')], components: [] });

    const warns = db.getWarns(interaction.guild.id, userId);
    const { embed, row } = warnsCmd.buildPage(targetUser, warns, Math.max(0, newPage));
    await interaction.update({ embeds: [embed], components: [row] });
    return;
  }
}

async function handleSelectMenu(interaction, client) {
  if (interaction.customId === 'help:menu') {
    const selected = interaction.values[0];
    const embed = helpCmd.buildCategoryEmbed(selected);
    const row = helpCmd.buildMenuRow(selected);
    await interaction.update({ embeds: [embed], components: [row] });
  }
}
