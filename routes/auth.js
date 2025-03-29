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
        successRedirect: '/profile'
    })
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

    // Check if user has access to this server and if the bot is in the server
    const userGuilds = req.user.guilds || [];
    const targetGuild = userGuilds.find(g => g.id === serverId);

    if (!targetGuild || !targetGuild.isAdmin) {
        return res.status(403).send('You do not have permission to configure this server');
    }

    if (!targetGuild.botInServer) {
        // Redirect to invite page if bot is not in the server
        return res.redirect(targetGuild.inviteUrl);
    }

    // In a real implementation, you would load the server configuration page
    // For now, we'll just send a placeholder response
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Server Configuration - ${targetGuild.name}</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1 {
                    color: #5865F2;
                }
                .back-link {
                    display: inline-block;
                    margin-top: 20px;
                    color: #5865F2;
                    text-decoration: none;
                }
                .back-link:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <h1>Server Configuration for ${targetGuild.name}</h1>
            <p>This is a placeholder for the server configuration page. In a real implementation, you would see configuration options for the bot in this server.</p>
            <a href="/profile" class="back-link">← Back to Profile</a>
        </body>
        </html>
    `);
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