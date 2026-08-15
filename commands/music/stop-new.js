const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel } = require('../../utils/voiceChannelCheck');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');
const { getLang } = require('../../utils/languageLoader');
const { getLavalinkManager } = require('../../lavalink');

const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop the music and clear the queue');

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
      
      if (!player?.playing) {
        return interaction.editReply('❌ No music is playing');
      }

      player.destroy();
      return interaction.editReply('⏹️ Stopped the music and cleared the queue');
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  }
};
