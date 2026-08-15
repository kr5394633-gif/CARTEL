const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loudset')
    .setDescription('Set Loud Mode boost multiplier')
    .addNumberOption(option =>
      option.setName('boost')
        .setDescription('Boost multiplier (1-10)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10)
    ),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const boost = interaction.options.getNumber('boost');
      musicPlayer.setLoudMode(interaction.guildId, true, boost);

      return interaction.editReply({
        content: `🔊 Loud Mode boost set to **${boost}x**`,
      });
    } catch (error) {
      console.error('Error in loudset command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
