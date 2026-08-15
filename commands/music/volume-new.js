const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel } = require('../../utils/voiceChannelCheck');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');
const { getLavalinkManager } = require('../../lavalink');

const data = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('Set the music volume')
  .addIntegerOption(option =>
    option.setName('level')
      .setDescription('Volume level (0-100)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(100)
  );

module.exports = {
  data,
  run: async (client, interaction) => {
    try {
      await safeDeferReply(interaction);
      
      const voiceCheck = await checkVoiceChannel(interaction);
      if (!voiceCheck.allowed) {
        return interaction.editReply(`❌ ${voiceCheck.error}`);
      }

      const level = interaction.options.getInteger('level');
      const manager = getLavalinkManager();
      const player = manager.getRiffy().players.get(interaction.guildId);
      
      if (!player) {
        return interaction.editReply('❌ No player found');
      }

      player.setVolume(level);
      return interaction.editReply(`🔊 Volume set to **${level}%**`);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  }
};
