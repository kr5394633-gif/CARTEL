require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) {
  console.error("❌ Startup failed: the 'commands' folder is missing.");
  console.error('   It likely was never committed/pushed to your repo — see index.js for the same check.');
  console.error('   Run `git status` in your project root to confirm commands/ is tracked, then push and retry.');
  process.exit(1);
}

const commands = [];
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if (command?.data) commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`⏳ Registering ${commands.length} slash command(s)...`);

    if (process.env.GUILD_ID) {
      // Guild commands update instantly - great for testing
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log('✅ Guild commands registered instantly.');
    } else {
      // Global commands can take up to ~1 hour to propagate
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log('✅ Global commands registered (may take up to 1 hour to appear).');
    }
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
})();
