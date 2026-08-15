const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('noise')
    .setDescription('Toggle Noise Suppression'),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const modes = musicPlayer.getModes(interaction.guildId);
      const newState = !modes.noiseSuppression;
      musicPlayer.setNoiseSuppression(interaction.guildId, newState);

      return interaction.editReply({
        content: `🔇 Noise Suppression: ${newState ? '✅ ON' : '❌ OFF'}`,
      });
    } catch (error) {
      console.error('Error in noise command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
