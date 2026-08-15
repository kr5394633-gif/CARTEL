const { SlashCommandBuilder } = require('discord.js');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');
const { getLavalinkManager } = require('../../lavalink');

const data = new SlashCommandBuilder()
  .setName('search')
  .setDescription('Search for a song and select from results')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('Song name or artist')
      .setRequired(true)
  );

module.exports = {
  data,
  run: async (client, interaction) => {
    try {
      await safeDeferReply(interaction);
      
      const query = interaction.options.getString('query');
      const manager = getLavalinkManager();
      const riffy = manager.getRiffy();
      
      const result = await riffy.resolve({ query, requester: interaction.user });
      
      if (!result || !result.tracks.length) {
        return interaction.editReply('❌ No results found');
      }

      const tracks = result.tracks.slice(0, 5);
      let description = '**Search Results:**\n\n';
      
      tracks.forEach((track, i) => {
        description += `${i + 1}. **${track.title}** - ${track.author}\n`;
      });

      return interaction.editReply({
        content: description,
        components: []
      });
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  }
};
