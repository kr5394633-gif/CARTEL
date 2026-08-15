const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/database');
const { infoEmbed } = require('../../utils/embeds');

const PAGE_SIZE = 5;

function buildPage(targetUser, warns, page) {
  const totalPages = Math.max(1, Math.ceil(warns.length / PAGE_SIZE));
  const pageWarns = warns.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const embed = infoEmbed(`Warns for ${targetUser.tag}`, warns.length === 0 ? 'No warns on record.' : null);
  embed.setFooter({ text: `Page ${page + 1}/${totalPages} • ${warns.length} total warn(s)` });

  for (const w of pageWarns) {
    embed.addFields({
      name: `#${w.id} — <t:${Math.floor(w.timestamp / 1000)}:R>`,
      value: `**Reason:** ${w.reason}\n**Moderator:** <@${w.moderatorId}>`,
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`warns:prev:${targetUser.id}:${page}`)
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`warns:next:${targetUser.id}:${page}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );

  return { embed, row };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warns')
    .setDescription("View a member's warn history")
    .addUserOption((opt) => opt.setName('user').setDescription('Member to look up').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const warns = db.getWarns(interaction.guild.id, target.id);
    const { embed, row } = buildPage(target, warns, 0);
    await interaction.reply({ embeds: [embed], components: warns.length > PAGE_SIZE ? [row] : [] });
  },

  buildPage, // exported so interactionCreate.js can reuse it for pagination buttons
};
