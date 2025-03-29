require('dotenv').config();
const { REST, Routes } = require('discord.js');

// Get your bot's token and client ID from environment variables
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Define your bot commands
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
                    { name: 'Geoapify', value: 'geoapify' },
                    { name: 'LocationIQ', value: 'locationiq' },
                    { name: 'Yandex Map', value: 'yandex' },
                    { name: 'RoMap', value: 'romap' },
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
            }
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
                    { name: 'Geoapify', value: 'geoapify' },
                    { name: 'LocationIQ', value: 'locationiq' },
                    { name: 'Yandex Map', value: 'yandex' },
                    { name: 'RoMap', value: 'romap' },
                    { name: 'Maptoolkit', value: 'maptoolkit' },
                    { name: 'Journey', value: 'journey' },
                ],
            },
        ],
    },
    {
        name: 'iss',
        description: 'Get the current location of the International Space Station (ISS).',
        options: [
            {
                name: 'map_type',
                type: 3, // STRING type
                description: 'Choose map provider',
                required: false,
                choices: [
                    { name: 'Geoapify', value: 'geoapify' },
                    { name: 'LocationIQ', value: 'locationiq' },
                    { name: 'RoMap', value: 'romap' },
                    { name: 'Journey', value: 'journey' },
                ],
            },
        ],
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

// Create a new REST instance
const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

// Register commands function
async function registerCommands() {
    try {
        console.log('🔄 Started refreshing application (/) commands...');

        // The put method is used to fully refresh all commands
        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands!`);
        console.log('📜 Registered commands:');
        data.forEach((cmd, index) => {
            console.log(`${index + 1}. /${cmd.name}: ${cmd.description}`);
        });
    } catch (error) {
        // If there was an error, log it
        console.error('❌ Error registering commands:');
        console.error(error);
    }
}

// Execute the registration
registerCommands();