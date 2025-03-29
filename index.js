require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const passport = require('./auth/discord');
const { router: authRoutes, isAuthenticated } = require('./routes/auth');

// 🔑 Your Bot Token and API Keys
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // Your Discord Bot Client ID
const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY; // Your LocationIQ API Key
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY; // Your Geoapify API Key
const MAPTOOLKIT_API_KEY = process.env.MAPTOOLKIT_API_KEY; // Your Maptoolkit API Key
const JOURNEY_API_KEY = process.env.JOURNEY_API_KEY; // Your Journey API Key


// Maintenance mode settings
let maintenanceMode = false;
let maintenanceMessage = "🛠️ We're currently performing maintenance on the bot. Please try again later!";
let maintenanceEndTime = null;
let maintenanceReason = "Scheduled maintenance";

// Create a new Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Register commands
const commands = [
    {
        name: 'location',
        description: 'Get the location details of a specific place.',
        options: [
            {
                name: 'place',
                type: 3, // STRING type
                description: 'Enter the name of the place.',
                required: true,
            },
            {
                name: 'map_type',
                type: 3, // STRING type
                description: 'Choose map provider',
                required: false,
                choices: [
                    { name: 'OpenStreetMap', value: 'openstreetmap' },
                    { name: 'Yandex Map', value: 'yandex' },
                    { name: 'RoMap', value: 'romap' },
                    { name: 'Geoapify', value: 'geoapify' },
                    { name: 'Maptoolkit', value: 'maptoolkit' },
                    { name: 'Journey', value: 'journey' },
                ],
            },
        ],
    },
    {
        name: 'satellite-map',
        description: 'Get satellite imagery of a location.',
        options: [
            {
                name: 'place',
                type: 3, // STRING type
                description: 'Enter the name of the place.',
                required: true,
            },
            {
                name: 'zoom',
                type: 4, // INTEGER type
                description: 'Zoom level (1-19, default is 12)',
                required: false,
            },

        ],
    },
    {
        name: 'game',
        description: 'Play a location guessing game.',
        options: [
            {
                name: 'type',
                type: 3, // STRING type
                description: 'Choose the game type',
                required: true,
                choices: [
                    { name: 'World Landmarks', value: 'landmarks' },
                    { name: 'Capital Cities', value: 'capitals' },
                    { name: 'Random Locations', value: 'random' },
                ],
            },
            {
                name: 'difficulty',
                type: 3, // STRING type
                description: 'Choose difficulty level',
                required: false,
                choices: [
                    { name: 'Easy', value: 'easy' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Hard', value: 'hard' },
                ],
            },
        ],
    },
    {
        name: 'customlocation',
        description: 'Get location details using specific coordinates.',
        options: [
            {
                name: 'latitude',
                type: 3, // STRING type
                description: 'Enter the latitude (e.g., 40.7128).',
                required: true,
            },
            {
                name: 'longitude',
                type: 3, // STRING type
                description: 'Enter the longitude (e.g., -74.0060).',
                required: true,
            },
            {
                name: 'map_type',
                type: 3, // STRING type
                description: 'Choose map provider',
                required: false,
                choices: [
                    { name: 'OpenStreetMap', value: 'openstreetmap' },
                    { name: 'Yandex Map', value: 'yandex' },
                    { name: 'RoMap', value: 'romap' },
                    { name: 'Geoapify', value: 'geoapify' },
                    { name: 'Maptoolkit', value: 'maptoolkit' },
                    { name: 'Journey', value: 'journey' },
                ],
            },
        ],
    },
    {
        name: 'iss',
        description: 'Get the current location of the International Space Station (ISS).',
    },
    {
        name: 'status',
        description: 'Get current status information about the bot (CPU, memory, uptime).',
    },
    {
        name: 'help',
        description: 'Show available bot commands.',
    },
    {
        name: 'info',
        description: 'Get information about the bot.',
    },
];

// Register commands with Discord API
const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

async function registerCommands() {
    try {
        console.log('🔄 Registering application (/) commands...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('✅ Successfully registered application (/) commands.');
        console.log('📜 Command list:');
        commands.forEach(cmd => {
            console.log(`- /${cmd.name}: ${cmd.description}`);
        });
    } catch (error) {
        console.error('❌ Error registering commands:', error);
        console.error(error);
    }
}


(async () => {
    try {
        console.log('🔄 Refreshing application (/) commands with force update...');
        await registerCommands();
        console.log('✅ Successfully registered application (/) commands.');
        console.log('📜 Command list:');
        commands.forEach(cmd => {
            console.log(`- /${cmd.name}: ${cmd.description}`);
        });
    } catch (error) {
        console.error('❌ Error registering commands:', error);
        console.error(error);
    }
})();

// Bot Ready Event
client.once('ready', () => {
    console.log('✅ Bot is online!');

    // Log registered commands for debugging
    const registeredCommands = client.application.commands.cache;
    console.log(`🔍 Registered commands count: ${registeredCommands.size}`);
    if (registeredCommands.size === 0) {
        console.log('⚠️ No commands are registered! This may take up to an hour to sync with Discord.');
        console.log('ℹ️ Forcing command registration update...');

        // Force update application commands
        (async () => {
            try {
                await registerCommands();
                console.log('🔄 Commands registration forced refresh completed');
            } catch (error) {
                console.error('❌ Error during forced command refresh:', error);
            }
        })();
    } else {
        console.log('✅ Commands registered successfully:');
        registeredCommands.forEach(cmd => {
            console.log(`- /${cmd.name}`);
        });
    }

    // Set up rotating status messages
    const activities = [
        { name: 'Location', type: 3 }, // WATCHING
        { name: `/location`, type: 2 },  // LISTENING
        { name: `/game`, type: 0 }  // PLAYING
    ];

    let currentActivity = 0;

    // Update status every 30 seconds
    setInterval(() => {
        const activity = activities[currentActivity];
        client.user.setActivity(activity.name, { type: activity.type });

        // Move to next activity (loop back to first if at the end)
        currentActivity = (currentActivity + 1) % activities.length;
    }, 20000); // 20 seconds

    // Set initial status
    client.user.setActivity(activities[0].name, { type: activities[0].type });
});

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Audit logging function
function logCommandUsage(userId, username, guildId, guildName, commandName, options = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        userId,
        username,
        guildId,
        guildName,
        commandName,
        options
    };

    // Daily log file
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logFile = path.join(logsDir, `command-usage-${date}.log`);

    // Append to log file
    fs.appendFile(
        logFile, 
        JSON.stringify(logEntry) + '\n', 
        err => {
            if (err) console.error('Error writing to audit log:', err);
        }
    );

    // Update command usage stats in memory
    commandUsageStats[commandName] = (commandUsageStats[commandName] || 0) + 1;
    totalCommandsUsed++;

    console.log(`📝 Command logged: ${username} used /${commandName}`);
}

// Command usage statistics (for API endpoint)
let commandUsageStats = {};
let totalCommandsUsed = 0;

// Command Handling
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    // Check if bot is in maintenance mode
    if (maintenanceMode && commandName !== 'help' && commandName !== 'info') {
        const embed = new EmbedBuilder()
            .setTitle('🛠️ Bot Under Maintenance')
            .setDescription(maintenanceMessage)
            .setColor('#FF9800')
            .addFields({ name: 'Reason', value: maintenanceReason || 'Scheduled maintenance' });

        if (maintenanceEndTime) {
            const endTime = new Date(maintenanceEndTime);
            const now = new Date();

            if (endTime > now) {
                const timeLeft = Math.round((endTime - now) / (1000 * 60)); // minutes
                embed.addFields({ name: 'Estimated Time', value: `Approximately ${timeLeft} minutes remaining` });
                embed.setFooter({ text: `Maintenance scheduled to end at ${endTime.toLocaleString()}` });
            }
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    // Log the command usage
    logCommandUsage(
        interaction.user.id,
        interaction.user.tag,
        interaction.guild?.id || 'DM',
        interaction.guild?.name || 'Direct Message',
        commandName,
        Object.fromEntries(
            interaction.options?._hoistedOptions?.map(o => [o.name, o.value]) || []
        )
    );

    // 📍 /location Command
    if (commandName === 'location') {
        const place = interaction.options.getString('place');
        const mapType = interaction.options.getString('map_type') || 'openstreetmap';
        try {
            await interaction.deferReply();

            const response = await axios.get(
                `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_API_KEY}&q=${place}&format=json`
            );

            const location = response.data[0];
            const latitude = location.lat;
            const longitude = location.lon;
            const displayName = location.display_name;

            // If LocationIQ failed and mapType was set to locationiq, use an alternative
            if (mapType === 'locationiq' && !displayName.includes(',')) {
                console.log('LocationIQ API key may be invalid, defaulting to Geoapify');
                mapType = 'geoapify';
            }

            // Generate map URL based on selected map type
            let mapUrl;
            let footerText;

            switch(mapType) {
                case 'yandex':
                    mapUrl = `https://static-maps.yandex.ru/1.x/?ll=${longitude},${latitude}&size=640,360&z=12&l=map&lang=en-US&pt=${longitude},${latitude},pm2rdm`;
                    footerText = '🗺️ Map powered by Yandex Maps (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                case 'romap':
                    mapUrl = `${process.env.ROMAP_API_URL}/map?lat=${latitude}&lon=${longitude}&zoom=13&width=640&height=360&apikey=${process.env.ROMAP_API_KEY}`;
                    footerText = '🗺️ Map powered by RoMap (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                case 'locationiq':
                    mapUrl = `https://maps.locationiq.com/v3/staticmap?key=${LOCATIONIQ_API_KEY}&center=${latitude},${longitude}&zoom=12&size=640x360&markers=icon:large-red-cutout|${latitude},${longitude}&format=png`;
                    footerText = '🗺️ Map powered by LocationIQ (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                case 'maptoolkit':
                    mapUrl = `https://maptoolkit.p.rapidapi.com/staticmap/?maptype=terrain&size=640x360&center=${latitude},${longitude}&zoom=12&rapidapi-key=${process.env.MAPTOOLKIT_API_KEY}`;
                    footerText = '🗺️ Map powered by Maptoolkit (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                case 'journey':
                    mapUrl = `https://api.journey.tech/v1/static-map?key=${JOURNEY_API_KEY}&width=640&height=360&lat=${latitude}&lng=${longitude}&zoom=12&scale=2`;
                    footerText = '🗺️ Map powered by Journey (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                default: // geoapify
                    mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=640&height=360&center=lonlat:${longitude},${latitude}&zoom=12&apiKey=${GEOAPIFY_API_KEY}`;
                    footerText = '🗺️ Map powered by Geoapify (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
            }

            const embed = new EmbedBuilder()
                .setTitle('📍 Location Details')
                .addFields(
                    { name: '📍 **Location:**', value: displayName },
                    { name: '🧭 **Coordinates:**', value: `Latitude: ${latitude}, Longitude: ${longitude}` }
                )
                .setImage(mapUrl)
                .setFooter({ text: footerText });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('❌ Error fetching location data:', error);
            await interaction.editReply('Failed to fetch location data. Please try again later.');
        }
    }

    // 🛰️ /iss Command
    else if (commandName === 'iss') {
        try {
            await interaction.deferReply();
            const mapType = interaction.options.getString('map_type') || 'openstreetmap'; // Default map type

            const issResponse = await axios.get('http://api.open-notify.org/iss-now.json');
            const { latitude, longitude } = issResponse.data.iss_position;

            // Generate map URL based on selected map type
            let mapUrl;
            let footerText;

            switch(mapType) {
                case 'romap':
                    mapUrl = `${process.env.ROMAP_API_URL}/map?lat=${latitude}&lon=${longitude}&zoom=4&width=640&height=360&apikey=${process.env.ROMAP_API_KEY}`;
                    footerText = '🗺️ Map powered by RoMap (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                case 'locationiq':
                    mapUrl = `https://maps.locationiq.com/v3/staticmap?key=${LOCATIONIQ_API_KEY}&center=${latitude},${longitude}&zoom=4&size=640x360&markers=icon:large-red-cutout|${latitude},${longitude}&format=png`;
                    footerText = '🗺️ Map powered by LocationIQ (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                case 'maptoolkit':
                    mapUrl = `https://maptoolkit.p.rapidapi.com/staticmap/?maptype=terrain&size=640x360&center=${latitude},${longitude}&zoom=4&rapidapi-key=${process.env.MAPTOOLKIT_API_KEY}`;
                    footerText = '🗺️ Map powered by Maptoolkit (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                case 'journey':
                    mapUrl = `https://api.journey.tech/v1/static-map?key=${JOURNEY_API_KEY}&width=640&height=360&lat=${latitude}&lng=${longitude}&zoom=4&scale=2`;
                    footerText = '🗺️ Map powered by Journey (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                default: // geoapify
                    mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=640&height=360&center=lonlat:${longitude},${latitude}&zoom=4&apiKey=${GEOAPIFY_API_KEY}`;
                    footerText = '🗺️ Map powered by Geoapify (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
            }

            const embed = new EmbedBuilder()
                .setTitle('🛰️ International Space Station Location')
                .addFields(
                    { name: '🧭 **Coordinates:**', value: `Latitude: ${latitude}, Longitude: ${longitude}` }
                )
                .setImage(mapUrl)
                .setFooter({ text: footerText });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('❌ Error fetching ISS location:', error);
            await interaction.editReply('Failed to fetch ISS location. Please try again later.');
        }
    }

    // 🔍 /help Command
    else if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('🔍 Help - List of Commands')
            .setDescription('Here are the available commands:')
            .addFields(
                { name: '/location', value: 'Get location details of a specific place.' },
                { name: '/satellite-map', value: 'Get satellite imagery of a location with customizable zoom level.' },
                { name: '/customlocation', value: 'Get location details using specific latitude and longitude coordinates.' },
                { name: '/iss', value: 'Get the current location of the ISS.' },
                { name: '/game', value: 'Play a location guessing game! Choose from World Landmarks, Capital Cities, or Random Locations.' },
                { name: '/status', value: 'Get current status information about the bot (CPU, memory, uptime).' },
                { name: '/info', value: 'Get information about the bot.' }
            )
            .setFooter({ text: '🗺️ Location Bot by Robloxbot Inc, Software Developers' });

        await interaction.reply({ embeds: [embed] });
    }

    // ℹ️ /info Command
    else if (commandName === 'info') {
        const embed = new EmbedBuilder()
            .setTitle('ℹ️ Bot Information')
            .setDescription('A Location Bot powered by APIs. Explore locations and ISS positions on Discord.')
            .addFields(
                { name: 'Owner', value: 'Robloxbot Inc, Software Developers' },
                { name: 'API', value: 'Powered by LocationIQ, Yandex Maps, and RoMap' }
            )
            .setFooter({ text: '🗺️ Explore the world with LocationIQ Maps!' });

        await interaction.reply({ embeds: [embed] });
    }

    // 🛰️ /satellite-map Command
    else if (commandName === 'satellite-map') {
        const place = interaction.options.getString('place');
        const zoom = interaction.options.getInteger('zoom') || 12; // Default zoom level

        try {
            await interaction.deferReply();

            // Get coordinates from the place name
            const response = await axios.get(
                `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_API_KEY}&q=${place}&format=json`
            );

            const location = response.data[0];
            const latitude = location.lat;
            const longitude = location.lon;
            const displayName = location.display_name;

            // Validate zoom level (1-19)
            const validZoom = Math.min(Math.max(zoom, 1), 19);

            // Use Yandex satellite map
            const mapUrl = `https://static-maps.yandex.ru/1.x/?ll=${longitude},${latitude}&size=640,360&z=${validZoom}&l=sat&lang=en-US&pt=${longitude},${latitude},pm2rdm`;
            const footerText = '🛰️ Satellite imagery powered by Yandex Maps (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify)';

            const embed = new EmbedBuilder()
                .setTitle('🛰️ Satellite View')
                .addFields(
                    { name: '📍 **Location:**', value: displayName },
                    { name: '🧭 **Coordinates:**', value: `Latitude: ${latitude}, Longitude: ${longitude}` },
                    { name: '🔍 **Zoom Level:**', value: `${validZoom}` }
                )
                .setImage(mapUrl)
                .setFooter({ text: footerText });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('❌ Error fetching satellite data:', error);
            await interaction.editReply('Failed to fetch satellite imagery. Please try again later or check the location name.');
        }
    }

    // 📊 /status Command
    else if (commandName === 'status') {
        try {
            await interaction.deferReply();

            // Get CPU usage (process and system)
            const os = require('os');
            const startUsage = process.cpuUsage();
            const startTime = process.hrtime();

            // Do a busy-work to measure CPU
            for (let i = 0; i < 1000000; i++) {}

            const elapTime = process.hrtime(startTime);
            const elapUsage = process.cpuUsage(startUsage);
            const elapTimeMS = elapTime[0] * 1000 + elapTime[1] / 1000000;
            const cpuPercent = Math.round((100 * (elapUsage.user + elapUsage.system) / 1000) / elapTimeMS);

            // Calculate system CPU load average
            const cpuLoad = os.loadavg()[0].toFixed(2);

            // Get memory usage
            const usedMemory = process.memoryUsage();
            const heapUsed = Math.round(usedMemory.heapUsed / 1024 / 1024 * 100) / 100;
            const heapTotal = Math.round(usedMemory.heapTotal / 1024 / 1024 * 100) / 100;
            const rssMemory = Math.round(usedMemory.rss / 1024 / 1024 * 100) / 100;

            // System memory info
            const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100;
            const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100;
            const usedMem = totalMem - freeMem;
            const memoryPercentage = Math.round((usedMem / totalMem) * 100);

            // Get uptime
            const uptimeSeconds = process.uptime();
            const days = Math.floor(uptimeSeconds / 86400);
            const hours = Math.floor((uptimeSeconds % 86400) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const seconds = Math.floor(uptimeSeconds % 60);

            const uptimeFormatted = 
                (days > 0 ? `${days} days, ` : '') + 
                (hours > 0 ? `${hours} hours, ` : '') + 
                (minutes > 0 ? `${minutes} minutes, ` : '') + 
                `${seconds} seconds`;

            // Create embed with the information
            const embed = new EmbedBuilder()
                .setTitle('📊 Bot Status')
                .setDescription('Current system performance metrics')
                .addFields(
                    { 
                        name: '⏱️ Uptime', 
                        value: uptimeFormatted,
                        inline: false
                    },
                    { 
                        name: '🔄 CPU Usage', 
                        value: `Process: ${cpuPercent}%\nSystem Load: ${cpuLoad}`,
                        inline: true 
                    },
                    { 
                        name: '💾 Memory Usage', 
                        value: `Process: ${rssMemory} MB\nHeap: ${heapUsed}/${heapTotal} MB\nSystem: ${usedMem.toFixed(2)}/${totalMem} GB (${memoryPercentage}%)`,
                        inline: true 
                    },
                    {
                        name: '🖥️ System Info',
                        value: `Platform: ${os.platform()} ${os.release()}\nCPU: ${os.cpus()[0].model}\nCores: ${os.cpus().length}`,
                        inline: false
                    }
                )
                .setFooter({ text: `Requested at ${new Date().toISOString()}` })
                .setColor('#00BFFF');

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Error in status command:', error);
            await interaction.editReply('Failed to retrieve status information. Please try again later.');
        }
    }

    // 🎮 /game Command 
    else if (commandName === 'game') {
        const gameType = interaction.options.getString('type');
        const difficulty = interaction.options.getString('difficulty') || 'medium';

        try {
            await interaction.deferReply();

            // Get game data based on the selected type and difficulty
            const gameData = await getGameData(gameType, difficulty);

            if (!gameData) {
                return interaction.editReply('Failed to load game data. Please try again later.');
            }

            // Create an embed with the game information
            const embed = new EmbedBuilder()
                .setTitle(`🎮 Guess The Location - ${formatGameType(gameType)}`)
                .setDescription(`Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}\n\nCan you guess what location is shown in the image?`)
                .setImage(gameData.imageUrl)
                .setFooter({ text: '🗺️ Reply with your guess within 60 seconds!' });

            const response = await interaction.editReply({ 
                embeds: [embed],
                components: [
                    {
                        type: 1, // Action Row
                        components: [
                            {
                                type: 2, // Button
                                style: 2, // Secondary style
                                custom_id: 'hint',
                                label: '💡 Get a Hint',
                            },
                            {
                                type: 2, // Button
                                style: 4, // Danger style
                                custom_id: 'give_up',
                                label: '❌ Give Up',
                            }
                        ]
                    }
                ]
            });

            // Create a message collector to wait for the user's guess
            const filter = m => m.author.id === interaction.user.id;
            const collector = interaction.channel.createMessageCollector({ 
                filter, 
                time: 60000, // 60 seconds
                max: 1 
            });

            // Store the game data in a temporary variable for the collector
            const gameSession = {
                locationName: gameData.locationName,
                country: gameData.country,
                hint: gameData.hint,
                difficulty,
                gameType
            };

            // Listen for button interactions
            const buttonCollector = response.createMessageComponentCollector({ 
                time: 60000 // 60 seconds
            });

            buttonCollector.on('collect', async i => {
                if (i.customId === 'hint') {
                    await i.reply({
                        content: `**Hint:** ${gameSession.hint}`,
                        ephemeral: true
                    });
                } else if (i.customId === 'give_up') {
                    buttonCollector.stop();
                    collector.stop('giveup');

                    await i.update({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(`🎮 Game Over - ${formatGameType(gameType)}`)
                                .setDescription(`The location was: **${gameSession.locationName}** (${gameSession.country})`)
                                .setImage(gameData.imageUrl)
                                .setFooter({ text: '🗺️ Better luck next time!' })
                        ],
                        components: []
                    });
                }
            });

            collector.on('collect', async message => {
                const guess = message.content.toLowerCase();
                const answer = gameSession.locationName.toLowerCase();

                // Check if the guess is correct (allow partial matches based on difficulty)
                let correctThreshold;
                switch (difficulty) {
                    case 'easy': correctThreshold = 0.5; break;
                    case 'medium': correctThreshold = 0.7; break;
                    case 'hard': correctThreshold = 0.9; break;
                    default: correctThreshold = 0.7;
                }

                const similarity = calculateSimilarity(guess, answer);
                const isCorrect = similarity >= correctThreshold;

                if (isCorrect) {
                    await interaction.followUp({
                        content: `✅ Congratulations, ${interaction.user}! You guessed correctly! The location is indeed **${gameSession.locationName}** (${gameSession.country}).`,
                        allowedMentions: { users: [interaction.user.id] }
                    });
                } else {
                    await interaction.followUp({
                        content: `❌ Sorry, ${interaction.user}. That's incorrect. The location was **${gameSession.locationName}** (${gameSession.country}).`,
                        allowedMentions: { users: [interaction.user.id] }
                    });
                }

                buttonCollector.stop();
            });

            collector.on('end', (collected, reason) => {
                if (reason !== 'giveup' && collected.size === 0) {
                    interaction.followUp({
                        content: `⏰ Time's up! The location was **${gameSession.locationName}** (${gameSession.country}).`,
                        components: []
                    });

                    if (!buttonCollector.ended) {
                        buttonCollector.stop();
                    }

                    interaction.editReply({
                        components: []
                    }).catch(console.error);
                }
            });

        } catch (error) {
            console.error('❌ Error in game command:', error);
            await interaction.editReply('An error occurred while setting up the game. Please try again later.');
        }
    }

    // 📌 /customlocation Command
    else if (commandName === 'customlocation') {
        const latitude = interaction.options.getString('latitude');
        const longitude = interaction.options.getString('longitude');
        const mapType = interaction.options.getString('map_type') || 'openstreetmap';

        try {
            await interaction.deferReply();

            // Validate the coordinates
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);

            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return interaction.editReply('Invalid coordinates. Latitude must be between -90 and 90, and longitude between -180 and 180.');
            }

            // Get location details using reverse geocoding
            const response = await axios.get(
                `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lng}&format=json`
            );

            const displayName = response.data.display_name || 'Unknown Location';

            // If LocationIQ failed and mapType was set to locationiq, use an alternative
            if (mapType === 'locationiq' && !displayName.includes(',')) {
                console.log('LocationIQ API key may be invalid, defaulting to Geoapify');
                mapType = 'geoapify';
            }

            // Generate map URL based on selected map type
            let mapUrl;
            let footerText;

            switch(mapType) {
                case 'yandex':
                    mapUrl = `https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&size=640,360&z=12&l=map&lang=en-US&pt=${lng},${lat},pm2rdm`;
                    footerText = '🗺️ Map poweredby Yandex Maps (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                case 'romap':
                    mapUrl = `${process.env.ROMAP_API_URL}/map?lat=${lat}&lon=${lng}&zoom=13&width=640&height=360&apikey=${process.env.ROMAP_API_KEY}`;
                    footerText = '🗺️ Map powered by RoMap (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                case 'locationiq':
                    mapUrl = `https://maps.locationiq.com/v3/staticmap?key=${LOCATIONIQ_API_KEY}&center=${lat},${lng}&zoom=12&size=640x360&markers=icon:large-red-cutout|${lat},${lng}&format=png`;
                    footerText = '🗺️ Map powered by LocationIQ (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                case 'maptoolkit':
                    mapUrl = `https://maptoolkit.p.rapidapi.com/staticmap/?maptype=terrain&size=640x360&center=${lat},${lng}&zoom=12&rapidapi-key=${process.env.MAPTOOLKIT_API_KEY}`;
                    footerText = '🗺️ Map powered by Maptoolkit (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                case 'journey':
                    mapUrl = `https://api.journey.tech/v1/static-map?key=${JOURNEY_API_KEY}&width=640&height=360&lat=${lat}&lng=${lng}&zoom=12&scale=2`;
                    footerText = '🗺️ Map powered by Journey (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
                    break;
                default: // geoapify
                    mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=640&height=360&center=lonlat:${lng},${lat}&zoom=12&apiKey=${GEOAPIFY_API_KEY}`;
                    footerText = '🗺️ Map powered by Geoapify (APIs: LocationIQ, OpenStreetMap, Yandex, RoMap, Geoapify, Maptoolkit, Journey)';
            }

            const embed = new EmbedBuilder()
                .setTitle('📌 Custom Location')
                .addFields(
                    { name: '📌 **Location:**', value: displayName },
                    { name: '🧭 **Coordinates:**', value: `Latitude: ${lat}, Longitude: ${lng}` }
                )
                .setImage(mapUrl)
                .setFooter({ text: footerText });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('❌ Error fetching custom location data:', error);
            await interaction.editReply('Failed to fetch location data. Please check the coordinates and try again.');
        }
    }
});

const express = require('express')
const app = express();
const port = 6484

// Serve static files after route handlers
// Configure session
app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 604800000 // 7 days
    }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware to check maintenance mode
app.use((req, res, next) => {
    // Skip the maintenance check for API requests and the maintenance page itself
    if (req.path.startsWith('/api/') || req.path === '/maintenance.html') {
        return next();
    }

    // If in maintenance mode, redirect to maintenance page
    if (maintenanceMode && req.path !== '/admin') {
        return res.sendFile(path.join(__dirname, './public/maintenance.html'));
    }

    next();
});

// Setup view engine for templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

app.use(express.static(path.join(__dirname, './public')));

// Register auth routes
app.use(authRoutes);

// API endpoint to provide LocationIQ key to frontend
app.get('/api/config', (req, res) => {
    res.json({
        locationiqKey: LOCATIONIQ_API_KEY
    });
});

// API endpoint to provide bot and server statistics
app.get('/api/stats', async (req, res) => {
    try {
        // Get real data from the Discord client
        const serverCount = client.guilds.cache.size;
        // Sum up all members across all guilds the bot is in
        const userCount = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);

        console.log(`Stats requested: ${serverCount} servers, ${userCount} users`);

        res.json({
            servers: serverCount || 0,
            users: userCount || 0,
            commandsUsed: totalCommandsUsed,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching bot stats:', error);
        res.status(500).json({ error: 'Failed to fetch bot statistics' });
    }
});

// New API endpoint to access command usage statistics
app.get('/api/command-stats', async (req, res) => {
    try {
        res.json({
            totalCommands: totalCommandsUsed,
            commandBreakdown: commandUsageStats,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching command stats:', error);
        res.status(500).json({ error: 'Failed to fetch command statistics' });
    }
});

// Maintenance mode endpoints
app.get('/api/maintenance/status', (req, res) => {
    res.json({
        maintenanceMode,
        maintenanceMessage,
        maintenanceReason,
        maintenanceEndTime,
        lastUpdated: new Date().toISOString()
    });
});

app.post('/api/maintenance/toggle', express.json(), (req, res) => {
    // Simple admin password check - in production, use proper authentication
    if (req.body.adminPassword !== 'adminaccess') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    maintenanceMode = req.body.enabled;

    if (req.body.message) {
        maintenanceMessage = req.body.message;
    }

    if (req.body.reason) {
        maintenanceReason = req.body.reason;
    }

    if (req.body.endTime) {
        maintenanceEndTime = req.body.endTime;
    } else {
        maintenanceEndTime = null;
    }

    console.log(`Maintenance mode ${maintenanceMode ? 'enabled' : 'disabled'}`);

    // Check if commands are registered while toggling maintenance mode
    const registeredCommands = client.application?.commands.cache.size || 0;
    console.log(`Current registered commands: ${registeredCommands}`);

    if (registeredCommands === 0 && !maintenanceMode) {
        console.log('⚠️ No commands detected. Attempting to re-register...');
        registerCommands().then(() => {
            console.log('✅ Command registration attempted');
        }).catch(err => {
            console.error('❌ Failed to register commands:', err);
        });
    }

    res.json({
        success: true,
        maintenanceMode,
        maintenanceMessage,
        maintenanceReason,
        maintenanceEndTime,
        commandsRegistered: registeredCommands
    });
});

// API route for location search
app.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        const response = await axios.get(
            `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_API_KEY}&q=${query}&format=json`
        );
        res.json(response.data[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch location' });
    }
});

// Handle clean URL routes
// Handle clean URL routes - moved before static file middleware
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './public/index.html'));
});

app.get('/location-search', (req, res) => {
    res.sendFile(path.join(__dirname, './public/index.html'));
});

app.get('/info', (req, res) => {
    res.sendFile(path.join(__dirname, './public/index.html'));
});

app.get('/status', (req, res) => {
    res.sendFile(path.join(__dirname, './public/index.html'));
});

// Admin dashboard route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, './public/admin.html'));
});

// API endpoint to access logs
app.post('/api/logs', express.json(), (req, res) => {
    // Basic authentication
    if (req.body.adminPassword !== 'adminaccess') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        // Get requested date or use today
        const requestedDate = req.body.date || new Date().toISOString().split('T')[0];
        const logType = req.body.type || 'all';

        // Construct log file path
        const logFile = path.join(logsDir, `command-usage-${requestedDate}.log`);

        // Check if log file exists
        if (!fs.existsSync(logFile)) {
            return res.json([]);
        }

        // Read and parse log file
        const logContents = fs.readFileSync(logFile, 'utf8');
        const logLines = logContents.trim().split('\n');
        const logEntries = logLines.map(line => JSON.parse(line));

        // Filter logs by type if specified
        let filteredLogs = logEntries;
        if (logType !== 'all') {
            filteredLogs = logEntries.filter(entry => {
                if (logType === 'command') {
                    return ['location', 'game', 'customlocation', 'iss'].includes(entry.commandName);
                }
                if (logType === 'error') {
                    return entry.error;
                }
                if (logType === 'system') {
                    return ['help', 'info'].includes(entry.commandName);
                }
                return true;
            });
        }

        // Return filtered logs
        res.json(filteredLogs);
    } catch (error) {
        console.error('Error accessing logs:', error);
        res.status(500).json({ error: 'Failed to access logs' });
    }
});

// API endpoint for user analytics
app.post('/api/user-analytics', express.json(), (req, res) => {
    // Basic authentication
    if (req.body.adminPassword !== 'adminaccess') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        // Get all log files
        const logFiles = fs.readdirSync(logsDir).filter(file => file.startsWith('command-usage-'));

        // Load and parse all logs
        let allLogs = [];
        logFiles.forEach(file => {

            const logPath = path.join(logsDir, file);
            const logContents = fs.readFileSync(logPath, 'utf8');
            const logLines = logContents.trim().split('\n');
            allLogs = allLogs.concat(logLines.map(line => JSON.parse(line)));
        });

        // Calculate unique users
        const uniqueUsers = new Set();
        const userCommandCounts = {};
        const userFavoriteCommands = {};
        const userServers = {};

        allLogs.forEach(log => {
            const userId = log.userId;
            uniqueUsers.add(userId);

            // Count commands per user
            userCommandCounts[userId] = (userCommandCounts[userId] || 0) + 1;

            // Track favorite commands
            if (!userFavoriteCommands[userId]) {
                userFavoriteCommands[userId] = {};
            }
            userFavoriteCommands[userId][log.commandName] = (userFavoriteCommands[userId][log.commandName] || 0) + 1;

            // Track servers per user
            if (!userServers[userId]) {
                userServers[userId] = new Set();
            }
            userServers[userId].add(log.guildId);
        });

        // Calculate average commands per user
        const avgCommands = uniqueUsers.size > 0 
            ? (allLogs.length / uniqueUsers.size).toFixed(1)
            : 0;

        // Calculate user engagement levels
        const powerUsers = Object.values(userCommandCounts).filter(count => count >= 10).length;
        const casualUsers = Object.values(userCommandCounts).filter(count => count >= 2 && count < 10).length;
        const oneTimeUsers = Object.values(userCommandCounts).filter(count => count === 1).length;

        // Get new users today
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = allLogs.filter(log => {
            const logDate = new Date(log.timestamp).toISOString().split('T')[0];
            return logDate === today;
        });
        const todayUsers = new Set(todayLogs.map(log => log.userId));
        const newUsersToday = Array.from(todayUsers).filter(userId => {
            // User is new if their earliest log is from today
            const userLogs = allLogs.filter(log => log.userId === userId);
            const earliestLog = userLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];
            return new Date(earliestLog.timestamp).toISOString().split('T')[0] === today;
        }).length;

        // Command distribution
        const commandCounts = {};
        allLogs.forEach(log => {
            commandCounts[log.commandName] = (commandCounts[log.commandName] || 0) + 1;
        });

        // Prepare top users data
        const topUsers = Object.entries(userCommandCounts)
            .map(([userId, commandCount]) => {
                // Find the username associated with this user ID
                const userLogs = allLogs.filter(log => log.userId === userId);
                const username = userLogs.length > 0 ? userLogs[0].username : 'Unknown User';

                // Find favorite command
                const commands = userFavoriteCommands[userId] || {};
                let favoriteCommand = 'none';
                let maxCount = 0;

                Object.entries(commands).forEach(([cmd, count]) => {
                    if (count > maxCount) {
                        favoriteCommand = cmd;
                        maxCount = count;
                    }
                });

                // Count servers
                const serverCount = userServers[userId] ? userServers[userId].size : 0;

                return {
                    userId,
                    username,
                    commandsUsed: commandCount,
                    favoriteCommand,
                    serverCount
                };
            })
            .sort((a, b) => b.commandsUsed - a.commandsUsed)
            .slice(0, 10)
            .map((user, index) => ({
                ...user,
                rank: index + 1
            }));

        // Calculate activity data (past 7 days)
        const activityData = {
            labels: [],
            datasets: [{
                label: 'Active Users',
                data: []
            }]
        };

        // Get dates for the past 7 days
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const formattedDate = date.toISOString().split('T')[0];
            dates.push(formattedDate);

            // Add to labels (shorter format for display)
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            activityData.labels.push(dayNames[date.getDay()]);

            // Count active users for this day
            const activeDayUsers = new Set(
                allLogs
                    .filter(log => new Date(log.timestamp).toISOString().split('T')[0] === formattedDate)
                    .map(log => log.userId)
            );

            activityData.datasets[0].data.push(activeDayUsers.size);
        }

        // Return the analytics data
        res.json({
            uniqueUsers: uniqueUsers.size,
            averageCommands: avgCommands,
            newUsersToday,
            topUsers,
            userEngagement: {
                powerUsers,
                casualUsers,
                oneTimeUsers
            },
            commandDistribution: commandCounts,
            activityData
        });
    } catch (error) {
        console.error('Error generating user analytics:', error);
        res.status(500).json({ 
            error: 'Failed to generate user analytics',
            message: error.message
        });
    }
});

// API endpoint to refresh commands
app.post('/api/refresh-commands', express.json(), async (req, res) => {
    // Basic authentication
    if (req.body.adminPassword !== 'adminaccess') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        await registerCommands();

        // Get current command count
        const registeredCommands = client.application.commands.cache.size;

        res.json({
            success: true,
            message: `Successfully refreshed ${registeredCommands} commands`,
            commandsRegistered: registeredCommands
        });
    } catch (error) {
        console.error('Error refreshing commands:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to refresh commands: ' + error.message
        });
    }
});

// Catch-all route to serve index.html for all other paths
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, './public/index.html'));
});




app.listen(port, '0.0.0.0', () =>
console.log(`Your app is listening at http://0.0.0.0:${port}`)
);

// Game Helper Functions
function formatGameType(gameType) {
    switch(gameType) {
        case 'landmarks': return 'World Landmarks';
        case 'capitals': return 'Capital Cities';
        case 'random': return 'Random Locations';
        default: return 'Unknown';
    }
}

// Function to calculate text similarity for fuzzy matching guesses
function calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;

    // Simple check if one string contains the other
    if (str1.includes(str2) || str2.includes(str1)) {
        return 0.8;
    }

    // Basic Levenshtein distance implementation
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i-1] === str2[j-1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i-1][j] + 1,
                matrix[i][j-1] + 1,
                matrix[i-1][j-1] + cost
            );
        }
    }

    const maxLen = Math.max(len1, len2);
    if (maxLen === 0) return 1.0;

    return 1 - matrix[len1][len2] / maxLen;
}

// Game data repository
async function getGameData(gameType, difficulty) {
    try {
        let locations;

        switch(gameType) {
            case 'landmarks':
                locations = [
                    // Easy landmarks
                    {
                        locationName: "Eiffel Tower",
                        country: "France",
                        imageUrl: "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=800&auto=format&fit=crop",
                        hint: "This iron lattice tower is located on the Champ de Mars in Paris.",
                        difficulty: "easy"
                    },
                    {
                        locationName: "Statue of Liberty",
                        country: "USA",
                        imageUrl: "https://images.unsplash.com/photo-1605130284535-11dd9eedc48a?w=800&auto=format&fit=crop",
                        hint: "A gift from France to the United States, located in New York Harbor.",
                        difficulty: "easy"
                    },
                    {
                        locationName: "Taj Mahal",
                        country: "India",
                        imageUrl: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&auto=format&fit=crop",
                        hint: "An ivory-white marble mausoleum on the southern bank of the Yamuna river in Agra.",
                        difficulty: "easy"
                    },
                    {
                        locationName: "Colosseum",
                        country: "Italy",
                        imageUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop",
                        hint: "An ancient amphitheater in the center of Rome where gladiatorial contests were held.",
                        difficulty: "easy"
                    },
                    {
                        locationName: "Great Wall of China",
                        country: "China",
                        imageUrl: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop",
                        hint: "An ancient fortification built to protect Chinese states from nomadic groups.",
                        difficulty: "easy"
                    },

                    // Medium landmarks
                    {
                        locationName: "Machu Picchu",
                        country: "Peru",
                        imageUrl: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&auto=format&fit=crop",
                        hint: "An Incan citadel set high in the Andes Mountains, built in the 15th century.",
                        difficulty: "medium"
                    },
                    {
                        locationName: "Petra",
                        country: "Jordan",
                        imageUrl: "https://images.unsplash.com/photo-1580834341580-8c17a3a550cc?w=800&auto=format&fit=crop",
                        hint: "An ancient city carved into rose-colored rock, also known as the 'Rose City'.",
                        difficulty: "medium"
                    },
                    {
                        locationName: "Stonehenge",
                        country: "United Kingdom",
                        imageUrl: "https://images.unsplash.com/photo-1564207550505-74a2e4b473ed?w=800&auto=format&fit=crop",
                        hint: "A prehistoric monument consisting of a ring of standing stones in Wiltshire, England.",
                        difficulty: "medium"
                    },
                    {
                        locationName: "Acropolis of Athens",
                        country: "Greece",
                        imageUrl: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&auto=format&fit=crop",
                        hint: "An ancient citadel located on a rocky outcrop above the city of Athens containing the Parthenon.",
                        difficulty: "medium"
                    },
                    {
                        locationName: "Chichen Itza",
                        country: "Mexico",
                        imageUrl: "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&auto=format&fit=crop",
                        hint: "A complex of Mayan ruins on Mexico's Yucatán Peninsula with a step pyramid known as El Castillo.",
                        difficulty: "medium"
                    },

                    // Hard landmarks
                    {
                        locationName: "Angkor Wat",
                        country: "Cambodia",
                        imageUrl: "https://images.unsplash.com/photo-1564393419408-5d77ada0ba12?w=800&auto=format&fit=crop",
                        hint: "The largest religious monument in the world, originally constructed as a Hindu temple.",
                        difficulty: "hard"
                    },
                    {
                        locationName: "Moai Statues",
                        country: "Easter Island, Chile",
                        imageUrl: "https://images.unsplash.com/photo-1510711547938-04fb9010e471?w=800&auto=format&fit=crop",
                        hint: "Monolithic human figures carved by the Rapa Nui people on a remote island in the Pacific Ocean.",
                        difficulty: "hard"
                    },
                    {
                        locationName: "Potala Palace",
                        country: "Tibet, China",
                        imageUrl: "https://images.unsplash.com/photo-1530107973768-581951e62d34?w=800&auto=format&fit=crop",
                        hint: "A dzong fortress in Lhasa that was the winter palace of the Dalai Lamas.",
                        difficulty: "hard"
                    },
                    {
                        locationName: "Sigiriya",
                        country: "Sri Lanka",
                        imageUrl: "https://images.unsplash.com/photo-1583452924150-ea5c4fe8c07d?w=800&auto=format&fit=crop",
                        hint: "An ancient rock fortress with frescoes located in central Sri Lanka, also known as 'Lion Rock'.",
                        difficulty: "hard"
                    },
                    {
                        locationName: "Göbekli Tepe",
                        country: "Turkey",
                        imageUrl: "https://images.unsplash.com/photo-1580893246395-52aead8960dc?w=800&auto=format&fit=crop",
                        hint: "The oldest known megalithic temple structure, built before the invention of pottery or metal tools.",
                        difficulty: "hard"
                    }
                ];
                break;

            case 'capitals':
                locations = [
                    // Easy capitals
                    {
                        locationName: "London",
                        country: "United Kingdom",
                        imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop",
                        hint: "This city is home to Big Ben and the Tower Bridge.",
                        difficulty: "easy"
                    },
                    {
                        locationName: "Paris",
                        country: "France",
                        imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop",
                        hint: "This city is known as the 'City of Light'.",
                        difficulty: "easy"
                    },
                    {
                        locationName: "Washington D.C.",
                        country: "USA",
                        imageUrl: "https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&auto=format&fit=crop",
                        hint: "Home to the White House and the Capitol Building.",
                        difficulty: "easy"
                    },
                    {
                        locationName: "Rome",
                        country: "Italy",
                        imageUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop",
                        hint: "The Eternal City known for the Colosseum and the Vatican.",
                        difficulty: "easy"
                    },
                    {
                        locationName: "Beijing",
                        country: "China",
                        imageUrl: "https://images.unsplash.com/photo-1505993597083-3bd19fb75e57?w=800&auto=format&fit=crop",
                        hint: "Home to the Forbidden City and the Great Wall of China nearby.",
                        difficulty: "easy"
                    },

                    // Medium capitals
                    {
                        locationName: "Tokyo",
                        country: "Japan",
                        imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop",
                        hint: "This metropolis is the most populous urban area in the world.",
                        difficulty: "medium"
                    },
                    {
                        locationName: "Brasília",
                        country: "Brazil",
                        imageUrl: "https://images.unsplash.com/photo-1595981234058-a9302fb97229?w=800&auto=format&fit=crop",
                        hint: "A planned city built in the shape of an airplane or butterfly.",
                        difficulty: "medium"
                    },
                    {
                        locationName: "Moscow",
                        country: "Russia",
                        imageUrl: "https://images.unsplash.com/photo-1520106212299-d99c443e4568?w=800&auto=format&fit=crop",
                        hint: "Home to the Kremlin and Red Square.",
                        difficulty: "medium"
                    },
                    {
                        locationName: "Bangkok",
                        country: "Thailand",
                        imageUrl: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=800&auto=format&fit=crop",
                        hint: "Known for ornate shrines and vibrant street life.",
                        difficulty: "medium"
                    },
                    {
                        locationName: "Cairo",
                        country: "Egypt",
                        imageUrl: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&auto=format&fit=crop",
                        hint: "Located near the ancient pyramids of Giza.",
                        difficulty: "medium"
                    },

                    // Hard capitals
                    {
                        locationName: "Canberra",
                        country: "Australia",
                        imageUrl: "https://images.unsplash.com/photo-1599587867523-162bf887563a?w=800&auto=format&fit=crop",
                        hint: "A planned capital city with a large artificial lake in its center.",
                        difficulty: "hard"
                    },
                    {
                        locationName: "Astana (Nur-Sultan)",
                        country: "Kazakhstan",
                        imageUrl: "https://images.unsplash.com/photo-1556464200-d99119631951?w=800&auto=format&fit=crop",
                        hint: "A futuristic capital city featuring the Bayterek Tower.",
                        difficulty: "hard"
                    },
                    {
                        locationName: "Wellington",
                        country: "New Zealand",
                        imageUrl: "https://images.unsplash.com/photo-1589871173932-557bc73477c4?w=800&auto=format&fit=crop",
                        hint: "The windiest city in the world, located at the southernmost point of North Island.",
                        difficulty: "hard"
                    },
                    {
                        locationName: "Addis Ababa",
                        country: "Ethiopia",
                        imageUrl: "https://images.unsplash.com/photo-1549386772-811295a2d2bc?w=800&auto=format&fit=crop",
                        hint: "Located on the Ethiopian highlands, it's the highest capital city in Africa.",
                        difficulty: "hard"
                    },
                    {
                        locationName: "Ulaanbaatar",
                        country: "Mongolia",
                        imageUrl: "https://images.unsplash.com/photo-1564611861053-def2205c44bf?w=800&auto=format&fit=crop",
                        hint: "The coldest capital city in the world, surrounded by vast steppes.",
                        difficulty: "hard"
                    }
                ];
                break;

            case 'random':
                locations = [
                    // Easy random locations
                    {
                        locationName: "Grand Canyon",
                        country: "USA",
                        imageUrl: "https://images.unsplash.com/photo-1615551043360-33de8b5f410c?w=800&auto=format&fit=crop",
                        hint: "A steep-sided canyon carved by the Colorado River in Arizona.",
                        difficulty: "easy"
                    },
                    {
                        locationName: "Mount Fuji",
                        country: "Japan",
                        imageUrl: "https://images.unsplash.com/photo-1578637387939-43c525550085?w=800&auto=format&fit=crop",
                        hint: "The highest mountain in Japan, an active volcano near Tokyo.",
                        difficulty: "easy"
                    },
                    {
                        locationName: "Venice",
                        country: "Italy",
                        imageUrl: "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=800&auto=format&fit=crop",
                        hint: "A city built on more than 100 small islands in a lagoon in the Adriatic Sea.",
                        difficulty: "easy"
                    },
                    {
                        locationName: "Niagara Falls",
                        country: "Canada/USA",
                        imageUrl: "https://images.unsplash.com/photo-1565700252938-e9c3d310f02f?w=800&auto=format&fit=crop",
                        hint: "A group of three waterfalls at the southern end of Niagara Gorge on the border of two countries.",
                        difficulty: "easy"
                    },
                    {
                        locationName: "Great Barrier Reef",
                        country: "Australia",
                        imageUrl: "https://images.unsplash.com/photo-1559314555-e3b508a2a41e?w=800&auto=format&fit=crop",
                        hint: "The world's largest coral reef system composed of over 2,900 individual reefs.",
                        difficulty: "easy"
                    },

                    // Medium random locations
                    {
                        locationName: "Santorini",
                        country: "Greece",
                        imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&auto=format&fit=crop",
                        hint: "An island known for its white-washed buildings with blue domes.",
                        difficulty: "medium"
                    },
                    {
                        locationName: "Zhangjiajie National Forest Park",
                        country: "China",
                        imageUrl: "https://images.unsplash.com/photo-1508804052814-cd3ba865a116?w=800&auto=format&fit=crop",
                        hint: "Magnificent quartz-sandstone pillars that inspired the 'Hallelujah Mountains' in Avatar.",
                        difficulty: "medium"
                    },
                    {
                        locationName: "Victoria Falls",
                        country: "Zimbabwe/Zambia",
                        imageUrl: "https://images.unsplash.com/photo-1600315422516-ded01899b974?w=800&auto=format&fit=crop",
                        hint: "Known locally as 'The Smoke That Thunders', this is one of the world's largest waterfalls.",
                        difficulty: "medium"
                    },
                    {
                        locationName: "Dead Sea",
                        country: "Jordan/Israel",
                        imageUrl: "https://images.unsplash.com/photo-1496769336828-c522a3a7e33c?w=800&auto=format&fit=crop",
                        hint: "A salt lake whose banks are more than 400m below sea level, the lowest point on dry land.",
                        difficulty: "medium"
                    },
                    {
                        locationName: "Torres del Paine",
                        country: "Chile",
                        imageUrl: "https://images.unsplash.com/photo-1544825441-5bff48e8c8af?w=800&auto=format&fit=crop",
                        hint: "A national park known for its soaring mountains, bright blue icebergs, and golden pampas.",
                        difficulty: "medium"
                    },

                    // Hard random locations
                    {
                        locationName: "Lake Baikal",
                        country: "Russia",
                        imageUrl: "https://images.unsplash.com/photo-1551845041-63e8e76836ea?w=800&auto=format&fit=crop",
                        hint: "The world's deepest and oldest freshwater lake.",difficulty: "hard"
                    },
                    {
                        locationName: "Plitvice Lakes",
                        country: "Croatia",
                        imageUrl: "https://images.unsplash.com/photo-1566132127697-4524fea60007?w=800&auto=format&fit=crop",
                        hint: "A series of 16 terraced lakes joined by waterfalls.",
                        difficulty: "hard"
                    },
                    {
                        locationName: "Socotra Island",
                        country: "Yemen",
                        imageUrl: "https://images.unsplash.com/photo-1577509868146-ec4152be6be9?w=800&auto=format&fit=crop",
                        hint: "An island with a very unique ecosystem including the famous Dragon's Blood Trees.",
                        difficulty: "hard"
                    },
                    {
                        locationName: "Salar de Uyuni",
                        country: "Bolivia",
                        imageUrl: "https://images.unsplash.com/photo-1547754980-3df97fed72a8?w=800&auto=format&fit=crop",
                        hint: "The world's largest salt flat, which becomes a giant mirror during the rainy season.",
                        difficulty: "hard"
                    },
                    {
                        locationName: "Antelope Canyon",
                        country: "USA",
                        imageUrl: "https://images.unsplash.com/photo-1602088693770-ad7e694c439d?w=800&auto=format&fit=crop",
                        hint: "A slot canyon on Navajo land known for its wave-like structure and light beams.",
                        difficulty: "hard"
                    }
                ];
                break;

            default:
                return null;
        }

        // Filter by difficulty if specified
        if (difficulty) {
            const filteredLocations = locations.filter(loc => loc.difficulty === difficulty);
            // If no locations match the criteria, use all for that game type
            locations = filteredLocations.length > 0 ? filteredLocations : locations;
        }

        // Improved randomization - select a random location from the filtered list
        const randomIndex = Math.floor(Math.random() * locations.length);
        return locations[randomIndex];
    } catch (error) {
        console.error('Error getting game data:', error);
        return null;
    }
}

// Bot Login
client.login(DISCORD_BOT_TOKEN);