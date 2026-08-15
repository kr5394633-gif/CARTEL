const { infoEmbed } = require('../utils/embeds');
const { sendLog } = require('../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    await sendLog(
      member.guild,
      'joinLeaveLogs',
      infoEmbed('Member Left', `${member.user.tag} (\`${member.id}\`) left or was removed from the server.`)
    );
  },
};
