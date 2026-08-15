const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blastset')
    .setDescription('Set Blast Mode intensity')
    .addIntegerOption(option =>
      option.setName('intensity')
        .setDescription('Blast intensity (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const intensity = interaction.options.getInteger('intensity');
      musicPlayer.setBlastMode(interaction.guildId, true, intensity);

      return interaction.editReply({
        content: `🔥 Blast Mode intensity set to **${intensity}%**`,
      });
    } catch (error) {
      console.error('Error in blastset command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
