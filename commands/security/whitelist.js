const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../utils/database');
const { successEmbed, infoEmbed, warningEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage anti-nuke/anti-spam whitelisted (trusted) users')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Exempt a trusted admin from anti-nuke/anti-spam actions')
        .addUserOption((opt) => opt.setName('user').setDescription('User to whitelist').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a user from the whitelist')
        .addUserOption((opt) => opt.setName('user').setDescription('User to remove').setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List whitelisted users')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const user = interaction.options.getUser('user');
      if (db.isWhitelisted(interaction.guild.id, user.id)) {
        return interaction.reply({ embeds: [warningEmbed('Already Whitelisted', `${user} is already whitelisted.`)], ephemeral: true });
      }
      db.addWhitelist(interaction.guild.id, user.id);
      return interaction.reply({ embeds: [successEmbed('User Whitelisted', `${user} is now exempt from anti-nuke/anti-spam actions.`)] });
    }

    if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      if (!db.isWhitelisted(interaction.guild.id, user.id)) {
        return interaction.reply({ embeds: [warningEmbed('Not Whitelisted', `${user} isn't on the whitelist.`)], ephemeral: true });
      }
      db.removeWhitelist(interaction.guild.id, user.id);
      return interaction.reply({ embeds: [successEmbed('User Removed', `${user} has been removed from the whitelist.`)] });
    }

    // list
    const ids = db.getWhitelist(interaction.guild.id);
    const embed = infoEmbed(
      'Whitelisted Users',
      ids.length > 0 ? ids.map((id) => `<@${id}>`).join('\n') : 'No users are whitelisted yet.'
    );
    return interaction.reply({ embeds: [embed] });
  },
};
