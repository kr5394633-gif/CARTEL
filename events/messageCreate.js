const antiSpam = require('../utils/antiSpam');
const autoMod = require('../utils/autoMod');
const config = require('../config.json');
const { prefix } = config;

function listTextCommands() {
  return [
    'Prefix: `<`',
    'Commands:',
    '`<help` — show this list',
    '`<ping` — latency check',
    '`<status` — bot status',
    '`<security-status` — server protection status',
    '`<play <query>` — use the slash command flow for music',
    '`<skip`, `<pause`, `<resume`, `<stop` — music controls',
  ].join('\n');
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const trimmed = message.content.trim();

    // Ignore regular mention pings like <@123456789> so they aren't mistaken for prefix commands.
    if (/^<@!?(\d+)>$/.test(trimmed) || /^<@!?(\d+)>(\s|$)/.test(trimmed)) {
      return;
    }

    if (trimmed.startsWith(prefix)) {
      const input = trimmed.slice(prefix.length).trim();
      if (!input) {
        return message.reply("Prefix is set to `<`.\nUse slash commands like `/help` or text commands like `<help` and `<ping`.");
      }

      const [command, ...args] = input.split(/\s+/);
      const cmd = command.toLowerCase();

      if (cmd === 'help') {
        return message.reply(listTextCommands());
      }

      if (cmd === 'ping') {
        return message.reply(`Pong! Latency: ${Date.now() - message.createdTimestamp}ms`);
      }

      if (cmd === 'status' || cmd === 'serverstatus') {
        return message.reply(
          `Bot status: ONLINE\nPrefix: \`${prefix}\`\nGuilds: ${message.client.guilds.cache.size}\nMembers: ${message.client.guilds.cache.reduce((total, guild) => total + (guild.memberCount || 0), 0)}`
        );
      }

      if (cmd === 'security-status' || cmd === 'security') {
        const antiRaid = config.antiRaid.enabled ? 'ON' : 'OFF';
        const antiNuke = config.antiNuke.enabled ? 'ON' : 'OFF';
        const antiSpam = config.antiSpam.enabled ? 'ON' : 'OFF';
        const verification = config.verification.enabled ? 'ON' : 'OFF';
        return message.reply(
          `Security Status\nAnti-Raid: ${antiRaid}\nAnti-Nuke: ${antiNuke}\nAnti-Spam: ${antiSpam}\nVerification: ${verification}`
        );
      }

      if (cmd === 'join') {
        const voiceChannel = message.member?.voice?.channel;
        const botMember = message.guild.members.me;

        if (!voiceChannel) {
          return message.reply('Join a voice channel first, then use `<join`.');
        }

        if (!botMember) {
          return message.reply('The bot member is not available yet. Try again in a moment.');
        }

        const botPermissions = botMember.permissionsIn(voiceChannel);
        if (!botPermissions.has('Connect') || !botPermissions.has('Speak')) {
          return message.reply('I need **Connect** and **Speak** permissions in that voice channel.');
        }

        if (!voiceChannel.joinable || voiceChannel.full) {
          return message.reply('That voice channel is not joinable right now.');
        }

        try {
          if (botMember.voice?.channelId !== voiceChannel.id) {
            await voiceChannel.join();
          }
          return message.reply(`Joined **${voiceChannel.name}**.`);
        } catch (error) {
          console.error('Join prefix command error:', error);
          return message.reply('I could not join that voice channel. Please check bot permissions and voice channel status.');
        }
      }

      if (cmd === 'play') {
        const query = args.join(' ');
        if (!query) {
          return message.reply('Use `/play <song>` or type `<help` for the available prefix commands.');
        }
        return message.reply(`Music request received: **${query}**\nUse the slash command \`/play ${query}\` for playback in voice channels.`);
      }

      if (['pause', 'resume', 'skip', 'stop', 'queue'].includes(cmd)) {
        return message.reply(`The \`${cmd}\` music control is available through the slash command system. Use /${cmd} in a voice channel.`);
      }

      return message.reply(`Unknown command: \`${command}\`\nUse \`<help\` to see available commands.`);
    }

    // Bad-word filter runs first (deletes + warns + escalates)
    const flaggedByAutoMod = await autoMod.handleMessage(message);
    if (flaggedByAutoMod) return;

    // Then spam/invite/mention checks
    await antiSpam.handleMessage(message);
  },
};
