const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel } = require('../../utils/voiceChannelCheck');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');
const { getLang } = require('../../utils/languageLoader');
const { getLavalinkManager } = require('../../lavalink');

const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Resume the paused song');

module.exports = {
  data,
  run: async (client, interaction) => {
    try {
      await safeDeferReply(interaction);
      
      const voiceCheck = await checkVoiceChannel(interaction);
      if (!voiceCheck.allowed) {
        return interaction.editReply(`❌ ${voiceCheck.error}`);
      }

      const manager = getLavalinkManager();
      const player = manager.getRiffy().players.get(interaction.guildId);
      
      if (!player) {
        return interaction.editReply('❌ No music is playing');
      }

      if (!player.paused) {
        return interaction.editReply('❌ Music is already playing');
      }

      player.pause(false);
      return interaction.editReply(`▶️ Resumed: **${player.current?.title}**`);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  }
};
