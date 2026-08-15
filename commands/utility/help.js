const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

const CATEGORIES = {
  moderation: {
    label: 'Moderation',
    emoji: '🔨',
    description: 'warn, warns, kick, ban, mute',
    fields: [
      { name: '/warn', value: 'Warn a member' },
      { name: '/warns', value: "View a member's warn history" },
      { name: '/kick', value: 'Kick a member (with confirmation)' },
      { name: '/ban', value: 'Ban a member (with confirmation)' },
      { name: '/mute', value: 'Timeout a member for a set duration' },
    ],
  },
  security: {
    label: 'Security',
    emoji: '🛡️',
    description: 'security-status, whitelist, verify-setup',
    fields: [
      { name: '/security-status', value: 'Live protection dashboard' },
      { name: '/whitelist add|remove|list', value: 'Manage trusted users exempt from auto-moderation' },
      { name: '/verify-setup', value: 'Post the verification button panel' },
    ],
  },
  utility: {
    label: 'Utility',
    emoji: 'ℹ️',
    description: 'help',
    fields: [{ name: '/help', value: 'Shows this menu' }],
  },
};

function buildCategoryEmbed(key) {
  const cat = CATEGORIES[key];
  const embed = infoEmbed(`${cat.emoji} ${cat.label} Commands`);
  for (const f of cat.fields) embed.addFields({ name: f.name, value: f.value });
  return embed;
}

function buildMenuRow(selectedKey) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('help:menu')
    .setPlaceholder('Choose a category...')
    .addOptions(
      Object.entries(CATEGORIES).map(([key, cat]) => ({
        label: cat.label,
        description: cat.description,
        value: key,
        emoji: cat.emoji,
        default: key === selectedKey,
      }))
    );
  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Shows all available commands'),

  async execute(interaction) {
    const embed = buildCategoryEmbed('moderation');
    const row = buildMenuRow('moderation');
    await interaction.reply({ embeds: [embed], components: [row] });
  },

  buildCategoryEmbed,
  buildMenuRow,
};
