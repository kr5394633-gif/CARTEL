const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loudmode')
    .setDescription('Toggle Loud Mode - Auto-boost when others are speaking'),
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
      const newState = !modes.loudMode;
      musicPlayer.setLoudMode(interaction.guildId, newState);

      return interaction.editReply({
        content: newState
          ? `🔊 **LOUD MODE ENABLED**\nBoost: ${musicPlayer.getModes(interaction.guildId).loudModeBoost}x\nWill boost volume when others speak!`
          : '⛔ Loud Mode disabled',
      });
    } catch (error) {
      console.error('Error in loudmode command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
