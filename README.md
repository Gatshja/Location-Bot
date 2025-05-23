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
   cd Location-Bot
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Edit a `.env.example` to `.env` file and add your credentials

4. Start the bot:
   ```node index.js```
   

# Preview Web&Bot
<img src="https://files.catbox.moe/fqlgub.png" alt="LocationBot preview">

### Website Preview
<img src="https://files.catbox.moe/ywhxr0.png" alt="LocationWeb preview">

### Website Location Preview
<img src="https://files.catbox.moe/7sggae.png" alt="LocationWeb1 preview">

### Admin Page Preview (Work Only Maintenance and System Logs)
<img src="https://files.catbox.moe/44lm12.png" alt="AdminPage preview">

- Adminpage: http://127.0.0.1:8080/admin
- password: adminaccess

## Hosting
You can host the bot on Free Hosting Like [SillyDev](https://sillydev.co.uk) or any Node.js-supported VPS.
- **Warning if You need to enabled Dashboard Page Please Use Cloudflared Tunnel too or ngrok**
- Default Port is **8080** (You can change in **index.js**)

## License
This project is licensed under the Apache License.

## Credits
Developed by Robloxbot Inc, Software Developers. with **NETTH** Host Team
