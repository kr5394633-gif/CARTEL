const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('echo')
    .setDescription('Toggle Echo Cancellation'),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const modes = musicPlayer.getModes(interaction.guildId);
      const newState = !modes.echoCancellation;
      musicPlayer.setEchoCancellation(interaction.guildId, newState);

      return interaction.editReply({
        content: `🔊 Echo Cancellation: ${newState ? '✅ ON' : '❌ OFF'}`,
      });
    } catch (error) {
      console.error('Error in echo command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
