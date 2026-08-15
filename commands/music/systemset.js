const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('systemset')
    .setDescription('Set SYSTEM MODE intensity')
    .addIntegerOption(option =>
      option.setName('intensity')
        .setDescription('System intensity (1-200, 200 = 20000%)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(200)
    ),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const intensity = interaction.options.getInteger('intensity');
      musicPlayer.setSystemMode(interaction.guildId, true, intensity);

      return interaction.editReply({
        content: `⚡ System Mode intensity set to **${intensity}x** (${Math.round(intensity * 100)}%)\n*Power level increasing...*`,
      });
    } catch (error) {
      console.error('Error in systemset command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
