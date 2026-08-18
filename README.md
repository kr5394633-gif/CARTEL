# Xeta - Premium Discord Music Bot

<p align="center">
  <img src="https://media.discordapp.net/attachments/1212679718399250452/1212698213602168862/XETA_BANNER.gif" alt="Xeta Banner" width="700">
</p>

<p align="center">
  <a href="https://discord.gg/uAwY7pfwfS"><img src="https://img.shields.io/badge/Discord-Vibe%20Coders%20%3C3-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord Server"></a>
  <img src="https://img.shields.io/badge/Language-Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Language">
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="Database">
</p>

---

## Features

Xeta is a feature-rich, high-performance Discord Music Bot designed to deliver crystal-clear audio and a seamless user experience.

- **Multi-Source Support**: Play music directly from **Spotify**, **YouTube**, **YouTube Music**, **SoundCloud**, **Apple Music**, **Twitch**, **Bandcamp**, **Vimeo**, **Reddit**, and **TikTok**.
- **Interactive Controller**: Control playback with an interactive button-based controller including play, pause, skip, loop, volume, autoplay, queue management, and shuffle.
- **Audio Effects**: Enhance your listening experience with customizable audio effects and filters.
- **Lyrics Integration**: Get real-time lyrics for the currently playing track via `A_ZLyrics` and other platforms.
- **Localization & Translation**: Fully supports multiple languages with built-in translations.
- **Playlist Management**: Save, view, and play custom user playlists directly from MongoDB.
- **High Performance**: Powered by `voicelink` and multi-node Lavalink support.

---

## How to Host

Follow these steps to host **Xeta** on your machine or VPS.

### Prerequisites
- Python 3.8 or higher
- MongoDB Database
- Lavalink Node (configured in `settings.json`)

### Option 1: Manual Setup

1. **Clone the repository and install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment variables:**
   - Copy `exmp.env` to `.env`:
     ```bash
     cp exmp.env .env
     ```
   - Open `.env` and fill in the required fields:
     - `TOKEN`: Your Discord Bot Token
     - `CLIENT_ID`: Your Discord App Client ID
     - `MONGODB_URL`: Your MongoDB connection URI
     - `SPOTIFY_CLIENT_ID` & `SPOTIFY_CLIENT_SECRET`: For Spotify integration

3. **Configure settings:**
   - Modify `settings.json` to change default prefix, colors, and configure your Lavalink nodes (default password is `ChampOp`).

4. **Run the bot:**
   ```bash
   python _main.py
   ```

### Option 2: Docker Setup

If you prefer using Docker:

1. Build and run using Docker Compose:
   ```bash
   docker compose up -d
   ```

---

## Credits & Team

Here are the people behind the bot:

* **Code Provider:**
  * [! Undefined.asf](https://discord.com/users/1346442518950051902)

* **Leakers:**
  * [𝙲 𝛂 𝛊 𝛞 𝛐 𝚣](https://discord.com/users/861847026923995137)
  * [Mik3y🥀](https://discord.com/users/980000051562700820)

* **Official Discord Server:**
  * Join [Vibe coders <3](https://discord.gg/uAwY7pfwfS) for support, updates, and chat!
