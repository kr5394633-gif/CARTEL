const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blast')
    .setDescription('Toggle Blast Mode for extreme volume boost'),
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
      const newState = !modes.blastMode;
      musicPlayer.setBlastMode(interaction.guildId, newState);

      return interaction.editReply({
        content: newState 
          ? `🔥 **BLAST MODE ACTIVATED!**\nIntensity: ${musicPlayer.getModes(interaction.guildId).blastVolume}%`
          : '⛔ Blast Mode disabled',
      });
    } catch (error) {
      console.error('Error in blast command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
