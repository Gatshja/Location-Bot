# Location Bot

A Location App, powered by API, that lets you explore anywhere.

## Features
- Get Location information for a specific place.
- Uses LocationIQ (OpenStreetMap) and Yandex Maps for accurate location data.
- Slash command support.

## Commands
### Location Commands:
- `/location place: map_type:` - Get the timezone of a specific location.
- `/customlocation latitude: longitude: map_type:` - Get location details using specific latitude and longitude coordinates.
- `/iss` - Get the current location of the ISS.
- `/game type: difficulty:` - Play a location guessing game! Choose from World Landmarks, Capital Cities, or Random Locations.
- `/info` - Get information about the bot.

## Installation
### Requirements
- Node.js v18+
- A Discord bot token
- A LocationIQ API Key

### Setup
1. Clone the repository:
   ```sh
   git clone https://github.com/Gatshja/Location-Bot.git
   cd location-bot
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file and add your credentials:
```DISCORD_BOT_TOKEN=YOU-TOKEN-BOT
CLIENT_ID=You-CLIENTID-BOT
LOCATIONIQ_API_KEY=You-LocationIQ-KEY```

4. Start the bot:
   ```node index.js```
   

# Preview
<img src="https://files.catbox.moe/fqlgub.png" alt="LocationBot preview">

## Hosting
You can host the bot on Free Hosting Like [SillyDev](https://sillydev.co.uk) or any Node.js-supported VPS.
- **Warning if You need to enabled Dashboard Page Please Use Cloudflared Tunnel too or ngrok**

## License
This project is licensed under the Apache License.

## Credits
Developed by Robloxbot Inc, Software Developers. with **NETTH** Host Team
