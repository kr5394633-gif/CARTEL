# 🎵 Music Commands

Your Discord bot now has full music functionality!

## Commands

### `/play <query>`
Plays a song from YouTube or searches for a track.
- **Example:** `/play Never Gonna Give You Up`
- **Example:** `/play https://www.youtube.com/watch?v=...`

### `/pause`
Pauses the currently playing song.

### `/resume`
Resumes a paused song.

### `/skip`
Skips to the next song in the queue.

### `/stop`
Stops the music and clears the queue.

### `/queue`
Shows the current queue with up to 10 upcoming songs.

## Requirements

1. **Join a Voice Channel:** You must be in a voice channel before using music commands.
2. **Bot Permissions:** The bot needs these permissions:
   - Connect (to join voice channels)
   - Speak (to play audio)

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Make sure the bot has permission to connect and speak in voice channels.

3. Deploy slash commands:
   ```bash
   npm run deploy
   ```

4. Start the bot:
   ```bash
   npm start
   ```

## Supported Sources

- YouTube
- SoundCloud
- Spotify (limited support)
- Various other sources via discord-player

## Notes

- Songs are queued automatically
- The bot will leave the voice channel after the queue is empty
- Volume control can be added as an extension if needed
