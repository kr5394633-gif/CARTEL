const { SlashCommandBuilder } = require('discord.js');
const { getMusicPlayer } = require('../../utils/musicPlayer');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused song'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const player = getMusicPlayer();
      const queue = player.nodes.get(interaction.guild);

      if (!queue) {
        const embed = createEmbed({
          title: '❌ Error',
          description: 'No song is in the queue.',
          color: '#FF0000',
        });
        return interaction.editReply({ embeds: [embed] });
      }

      if (!queue.node.isPaused()) {
        const embed = createEmbed({
          title: '❌ Error',
          description: 'The song is already playing.',
          color: '#FF0000',
        });
        return interaction.editReply({ embeds: [embed] });
      }

      queue.node.setPaused(false);

      const embed = createEmbed({
        title: '▶️ Resumed',
        description: `**${queue.currentTrack.title}** has been resumed.`,
      });
      interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createEmbed({
        title: '❌ Error',
        description: 'An error occurred while resuming the song.',
        color: '#FF0000',
      });
      interaction.editReply({ embeds: [embed] });
    }
  },
};
