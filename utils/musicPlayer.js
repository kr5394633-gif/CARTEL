const { Player } = require('discord-player');

let musicPlayer = null;

const initMusicPlayer = (client) => {
  if (musicPlayer) return musicPlayer;

  musicPlayer = new Player(client, {
    ytdlOptions: {
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
    },
  });

  musicPlayer.on('error', (queue, error) => {
    console.error(`Music Player Error [${queue.guild.name}]:`, error);
  });

  musicPlayer.on('connectionError', (queue, error) => {
    console.error(`Music Connection Error [${queue.guild.name}]:`, error);
  });

  musicPlayer.on('trackStart', (queue, track) => {
    const embed = require('./embeds').createEmbed({
      title: '🎵 Now Playing',
      description: `**${track.title}**`,
      fields: [
        { name: 'Duration', value: track.duration ? `${Math.floor(track.duration / 1000)}s` : 'Live', inline: true },
        { name: 'Requested by', value: track.requestedBy?.toString() || 'Unknown', inline: true },
      ],
    });
    queue.metadata?.channel?.send({ embeds: [embed] }).catch(() => {});
  });

  musicPlayer.on('trackEnd', (queue) => {
    if (!queue.tracks.length) {
      const embed = require('./embeds').createEmbed({
        title: '⏹️ Queue Ended',
        description: 'All songs have been played.',
        color: '#FF0000',
      });
      queue.metadata?.channel?.send({ embeds: [embed] }).catch(() => {});
    }
  });

  console.log('✅ Music player initialized');
  return musicPlayer;
};

const getMusicPlayer = () => {
  if (!musicPlayer) throw new Error('Music player not initialized');
  return musicPlayer;
};

module.exports = { initMusicPlayer, getMusicPlayer };
