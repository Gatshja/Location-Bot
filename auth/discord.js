
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const dotenv = require('dotenv');
dotenv.config();

// Configure Discord OAuth2 strategy
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:6484/auth/discord/callback',
    scope: ['identify', 'email', 'guilds'],
    proxy: true
}, function(accessToken, refreshToken, profile, done) {
    // Store the user profile in the session
    return done(null, profile);
}));

// Serialize user data for the session
passport.serializeUser(function(user, done) {
    done(null, user);
});

// Deserialize user from the session
passport.deserializeUser(function(user, done) {
    done(null, user);
});

module.exports = passport;
