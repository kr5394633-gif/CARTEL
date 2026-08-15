const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('system')
    .setDescription('⚡ Toggle SYSTEM MODE - Extreme Audio Enhancement ⚡'),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const status = await musicPlayer.getPlayerStatus(interaction.guildId);
      if (!status.isConnected) {
        return interaction.editReply({
          content: '❌ Bot is not connected to voice!',
          ephemeral: true,
        });
      }

      const modes = musicPlayer.getModes(interaction.guildId);
      const newState = !modes.systemMode;
      musicPlayer.setSystemMode(interaction.guildId, newState);

      if (newState) {
        return interaction.editReply({
          content: `⚡ **SYSTEM MODE ACTIVATED!** ⚡\nIntensity: ${musicPlayer.getModes(interaction.guildId).systemIntensity}x (${Math.round(musicPlayer.getModes(interaction.guildId).systemIntensity * 100)}%)\n\n*Maximum audio enhancement engaged...*`,
        });
      } else {
        return interaction.editReply({
          content: '⛔ System Mode disabled',
        });
      }
    } catch (error) {
      console.error('Error in system command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
