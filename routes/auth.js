const express = require('express');
const passport = require('passport');
const router = express.Router();

// Auth middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Login page
router.get('/login', (req, res) => {
    res.sendFile('login.html', { root: './public' });
});

// Discord OAuth login route
router.get('/auth/discord', passport.authenticate('discord'));

// Discord OAuth callback route
router.get('/auth/discord/callback', 
    passport.authenticate('discord', { 
        failureRedirect: '/login',
        failureMessage: true
    }),
    (req, res) => {
        // Successfully authenticated
        res.redirect('/profile');
    }
);

// Logout route
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

// Profile page - protected route
router.get('/profile', isAuthenticated, (req, res) => {
    res.sendFile('profile.html', { root: './public' });
});

// API endpoint to get user data
router.get('/api/user', isAuthenticated, (req, res) => {
    // Add creation date if not present (in a production app, you'd get this from DB)
    const userData = {
        ...req.user,
        createdAt: req.user.createdAt || new Date().toISOString()
    };

    // Process guild data to identify admin servers and bot presence
    if (userData.guilds && Array.isArray(userData.guilds)) {
        userData.guilds = userData.guilds.map(guild => {
            // Check if user has admin permissions (0x8 is the ADMINISTRATOR permission flag)
            const isAdmin = (guild.permissions & 0x8) === 0x8;

            // In a real implementation, you would check if your bot is in this guild
            // For now, we'll simulate this by assuming the bot is in guilds with even IDs
            const botInServer = guild.id % 2 === 0; // This is just for demonstration

            return {
                ...guild,
                isAdmin,
                botInServer,
                inviteUrl: `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`
            };
        });
    }

    res.json(userData);
});

// API endpoint to save search history for logged-in users
router.post('/api/save-search', isAuthenticated, (req, res) => {
    try {
        const { lat, lng, displayName } = req.body;
        
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Missing required location data' });
        }
        
        // In a real implementation, you would save this to a database
        // Here we'll just acknowledge the save
        
        // Include the user ID for reference
        const userId = req.user.id;
        
        console.log(`User ${userId} saved location: ${displayName} (${lat}, ${lng})`);
        
        return res.status(200).json({ success: true, message: 'Location saved to history' });
    } catch (error) {
        console.error('Error saving search history:', error);
        return res.status(500).json({ error: 'Failed to save search history' });
    }
});

// API endpoint to get user's search history
router.get('/api/search-history', isAuthenticated, (req, res) => {
    try {
        // In a real implementation, you would fetch this from a database
        // For now, we'll just return an empty array
        
        return res.status(200).json({ 
            history: [],
            message: 'Search history is currently stored locally on your browser'
        });
    } catch (error) {
        console.error('Error fetching search history:', error);
        return res.status(500).json({ error: 'Failed to fetch search history' });
    }
});

// Server configuration page
router.get('/server/:serverId/config', isAuthenticated, (req, res) => {
    const { serverId } = req.params;

    // Check if user has access to this server
    const userGuilds = req.user.guilds || [];
    const targetGuild = userGuilds.find(g => g.id === serverId);

    if (!targetGuild) {
        return res.status(403).send('Server not found in your Discord servers list');
    }
    
    if (!targetGuild.isAdmin) {
        return res.status(403).send('You need to be an admin of this Discord server to configure the bot');
    }

    // Serve the server configuration page
    res.sendFile('server-config.html', { root: './public' });
});

// API endpoint to get server data
router.get('/api/server/:serverId', isAuthenticated, async (req, res) => {
    try {
        const { serverId } = req.params;

        // Check if user has access to this server
        const userGuilds = req.user.guilds || [];
        const targetGuild = userGuilds.find(g => g.id === serverId);

        if (!targetGuild || !targetGuild.isAdmin) {
            return res.status(403).json({ 
                error: 'You need to be an admin of this Discord server to access configuration' 
            });
        }

        // Get the client ID for generating invite URLs
        const clientId = process.env.CLIENT_ID || ''; 

        // Create the invite URL
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${serverId}`;

        // In a real implementation, you would fetch additional server data from your database
        // For now, we'll return basic information based on what we have
        const serverData = {
            id: targetGuild.id,
            name: targetGuild.name,
            icon: targetGuild.icon,
            botInServer: targetGuild.botInServer,
            isAdmin: targetGuild.isAdmin,
            inviteUrl: inviteUrl,
            clientId: clientId,
            
            // Add additional mock data for the UI
            memberCount: Math.floor(Math.random() * 1000) + 10, // Random member count
            channelCount: Math.floor(Math.random() * 20) + 1,   // Random channel count
            commandUsage: Math.floor(Math.random() * 100),      // Random command usage
            
            // Mock channel list
            channels: [
                { id: 'general-' + serverId, name: 'general' },
                { id: 'welcome-' + serverId, name: 'welcome' },
                { id: 'bot-commands-' + serverId, name: 'bot-commands' },
                { id: 'announcements-' + serverId, name: 'announcements' }
            ],
            
            // Mock configuration (in a real implementation, you would fetch this from a database)
            config: {
                prefix: '',
                notificationChannel: '',
                autoResponse: false,
                defaultMap: 'openstreetmap'
            }
        };

        // Return the server data
        res.json(serverData);
    } catch (error) {
        console.error('Error fetching server data:', error);
        res.status(500).json({ error: 'Failed to fetch server data' });
    }
});

// API endpoint for server configuration
router.post('/api/server/:serverId/config', express.json(), isAuthenticated, (req, res) => {
    const { serverId } = req.params;
    const { setting, value } = req.body;

    // Check if user has access to this server and if the bot is in the server
    const userGuilds = req.user.guilds || [];
    const targetGuild = userGuilds.find(g => g.id === serverId);

    if (!targetGuild || !targetGuild.isAdmin) {
        return res.status(403).json({ 
            success: false, 
            error: 'You do not have permission to configure this server' 
        });
    }

    if (!targetGuild.botInServer) {
        return res.status(400).json({ 
            success: false, 
            error: 'Bot is not in this server'
        });
    }

    // Validate setting
    const validSettings = ['prefix', 'autoResponse', 'notificationChannel'];
    if (!validSettings.includes(setting)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid setting'
        });
    }

    // In a real implementation, you would save this configuration to a database
    // For now, we'll just return a success response
    console.log(`Updated ${setting} to ${value} for server ${serverId}`);

    res.json({
        success: true,
        serverId,
        setting,
        value,
        message: 'Configuration updated successfully'
    });
});

// Export the isAuthenticated middleware for use elsewhere
module.exports = {
    router,
    isAuthenticated
};