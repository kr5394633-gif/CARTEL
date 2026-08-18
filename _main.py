from operator import inv
import discord
import sys
import os
import traceback
import aiohttp
import update
import function as func
import typing
import re
from typing import (
    TYPE_CHECKING,Any,
    AsyncGenerator,
    Callable,
    Coroutine,
    Dict,
    Iterable,
    List,
    Optional,
    Union,)
import asyncio
from discord.ext import commands
from web import IPCServer
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import voicelink
from voicelink import VoicelinkException
from cogs.help import HelpCommand
from addons import Settings
from cogs.owner.dbIntegration import *


initial_extensions = [
    'cogs.playlist',
    'cogs.basic',
    'cogs.effect',
    'cogs.listeners',
    'cogs.task',
    'cogs.settings',
    'cogs.events',
    ]

on_startup: typing.List[typing.Callable[["Champ"], typing.Coroutine]] = []
async def get_prefix(bot, message: discord.Message):
    settings = await func.get_settings(message.guild.id)
    return settings.get("prefix", func.settings.bot_prefix)
   # p = ['x']
    #d = await predb.find_one({'_id': int(m.author.id)}) 
    #data = await prefix_collection.find_one({'guild_id': str(m.guild.id)}) 
    #if data:
    #    p = [data['prefix']]
    #if d:
    #    p.append('')
    #return  commands.when_mentioned_or(*p)(bot, m)

class Translator(discord.app_commands.Translator):
    async def load(self):
        print("Loaded Translator")

    async def unload(self):
        print("Unload Translator")

    async def translate(self, string: discord.app_commands.locale_str, locale: discord.Locale, context: discord.app_commands.TranslationContext):
        if str(locale) in func.LOCAL_LANGS:
            return func.LOCAL_LANGS[str(locale)].get(string.message, None)
        return None

__all__ = ("Champ", "bot")
on_startup: typing.List[typing.Callable[["Champ"], typing.Coroutine]] = []
func.settings = Settings(func.open_json("settings.json"))
 

intents = discord.Intents.default()
intents.message_content = True if func.settings.bot_prefix else False
intents.members = False
member_cache = discord.MemberCacheFlags(
    voice=True,
    joined=False
)

owners = [1008215520530669588,910939726482141204] 

class Champ(commands.AutoShardedBot):
    def __init__(self, **kwargs):
        super().__init__(
            command_prefix=get_prefix,
            case_insensitive=True,
            strip_after_prefix=True,
            owner_ids=set(owners),
            tree_cls=CommandCheck,
            intents=intents,
            chunk_guilds_at_startup=False,
            member_cache_flags=member_cache,
            activity=discord.Activity(type=discord.ActivityType.listening, name="Starting..."),
            help_command=HelpCommand(),
            allowed_mentions=discord.AllowedMentions(
                everyone=False, roles=False, replied_user=False),
            **kwargs,
        )

        
        self.ipc = IPCServer(self,host=func.settings.ipc_server["host"],port=func.settings.ipc_server["port"],sercet_key=func.tokens.sercet_key)
        self.loop = asyncio.get_event_loop()
        self.color = 0xD2042D
        
        self.api_token = 'r8_7YfYoaVvrDp5EnlpfoiP9s5oQYwXiVB0zHT9j'
        self.red = "<:champ2:1019618933873065995>"
        self.yes = "<:tick_yes:1015298407843246160>"
        self.no = "<:xxcross:1038116049159213138>"
        self.text = "<:champ_text:1032282847618269285>"
        self.voice = "<:champ_vc:1032282961468469309>"
        self.stage = "<:champ_stage:1032283082348302406>"
        self.owner = "<:owner:1015528945338294364>"
        self.support = "https://discord.gg/AZj8K5jA6f"
        self.me = "<:champ_prime:1212029498736779264>"
        REPLICATE_API_TOKEN = 'r8_7YfYoaVvrDp5EnlpfoiP9s5oQYwXiVB0zHT9j'
        self.pexel = "i0EBqP0v7JgqxuQrK2xmojpG87LCwgQF5rGgtRs28yq3rWot5b6MP7no"

    async def setup_hook(self) -> None:
        func.langs_setup()
        await self.connect_db()
        for coro_func in on_startup:
            self.session = aiohttp.ClientSession()
            await (coro_func(self))
        if func.settings.ipc_server.get("enable", False):
            await self.ipc.start()
        if not func.settings.version or func.settings.version != update.__version__:
            func.update_json("settings.json", new_data={"version": update.__version__})
            await self.tree.set_translator(Translator())
            await self.tree.sync()    

    @on_startup.append
    async def __load_extensions(self):
        for _ in initial_extensions:
            await self.load_extension(_)
            print(f"Loaded extension: {_}")           
        await self.load_extension("jishaku")
        print(f"Loaded extension: jishaku")

    @on_startup.append
    async def __set_env(self):
        os.environ["JISHAKU_HIDE"] = "True"
        os.environ["JISHAKU_NO_UNDERSCORE"] = "True"
        os.environ["JISHAKU_NO_DM_TRACEBACK"] = "True"
        os.environ["JISHAKU_FORCE_PAGINATOR"] = "True"

    async def on_ready(self):
        print("------------------")
        print(f"Logging As {self.user}")
        print(f"Bot ID: {self.user.id}")
        print("------------------")
        print(f"Discord Version: {discord.__version__}")
        print(f"Python Version: {sys.version}")
        print("------------------")
        func.tokens.client_id = self.user.id
        func.LOCAL_LANGS.clear()
    
    
    async def main() -> None:
        async with ClientSession(
            connector=TCPConnector(
                resolver=AsyncResolver(), family=socket.AF_INET)
        ) as http_session:
            async with self:
                self.http_session = http_session

            if not hasattr(bot, "__version__"):
                self.__version__ = VERSION


    
    async def on_message(self, message: discord.Message):
        if (find := tp_db.find_one({"_id": str(message.guild.id)})):
            chnl = int(find['chnl'])
            if message.channel.id==chnl:
                await asyncio.sleep(1)
                await message.delete()
                if message.author.bot:
                    return
                if not message.author.voice:
                    return await message.channel.send(f"{message.author.mention} You're not in a voice channel.")
                if message.guild.me.voice is None:
                    ctx = await bot.get_context(message)
                    command = bot.get_command('join')
                    await command(ctx)
                if not message.author.voice.channel.id==message.guild.me.voice.channel.id:
                    return await message.channel.send('You are not in my voice channel')
                ctx = await bot.get_context(message)
                command = bot.get_command('play')
                await command(ctx, query=message.content)
            else:
                pass
        if message.author.bot or not message.guild:
            return False
        await self.process_commands(message)

    
    async def connect_db(self) -> None:
        if not ((db_name := func.tokens.mongodb_name) and (db_url := func.tokens.mongodb_url)):
            raise Exception("MONGODB_NAME and MONGODB_URL can't not be empty in settings.json")

        try:
            func.MONGO_DB = AsyncIOMotorClient(host=db_url)
            await func.MONGO_DB.server_info()
            print("Successfully connected to MongoDB!")

        except Exception as e:
            raise Exception("Not able to connect MongoDB! Reason:", e)
        
        func.SETTINGS_DB = func.MONGO_DB[db_name]["Settings"]
        func.USERS_DB = func.MONGO_DB[db_name]["Users"]
        
    
    async def on_message_edit(self, before: discord.Message, after: discord.Message):
        if after.guild is None or after.author.bot:
            return

        if before.content != after.content and before.author.id in self.owner_ids:
            await self.process_commands(after)
		

class CommandCheck(discord.app_commands.CommandTree):
    async def interaction_check(self, interaction: discord.Interaction, /) -> bool:
        if not interaction.guild:
            await interaction.response.send_message("This command can only be used in guilds!")
            return False

        return await super().interaction_check(interaction)
    

bot = Champ()
if __name__ == "__main__":
    update.check_version(with_msg=True)
    bot.run(func.tokens.token, log_handler=None)
