'use strict';

/**
 * A ping pong bot, whenever you send "ping", it replies "pong".
 */

// Import the discord.js module
const Discord = require('discord.js');
require('dotenv').config();

// Create an instance of a Discord client
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */
client.on('ready', () => {
    console.log('I am ready!');
});

// Create an event listener for messages
client.on('message', message => {
    if (!message.author.bot) {
        // If the message is "ping"
        if (message.content === 'ping') {
            // Send "pong" to the same channel
            message.channel.send('pong');
        }
        if (message.content === 'pong') {
            // Send "pong" to the same channel
            message.channel.send('ping');
        }
    }
});
client.on('messageReactionAdd', async (reaction, user) => {
    // When we receive a reaction we check if the reaction is partial or not
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message: ', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }
    if (reaction.message.author.bot) {
        reaction.message.edit(reaction.message.content + '!')
        reaction.remove()
    }

});


// Log our bot in using the token from https://discord.com/developers/applications
client.login(process.env.BOT_TOKEN);