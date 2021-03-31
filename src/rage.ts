'use strict';
/**
 * A ping pong bot, whenever you send "ping", it replies "pong".
 */

import * as Discord from 'discord.js';
import * as dotenv from 'dotenv';

dotenv.config();

// Create an instance of a Discord client
const client = new Discord.Client({
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});

const helpMessage = 'TODO help message';

/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */
client.on('ready', () => {
  console.log('I am ready!');
});

// Create an event listener for messages
client.on('message', (message) => {
  if (!message.author.bot) {
    // If the message is "ping"
    if (message.content.startsWith('!create ')) {
      const args = message.content.split(' ');
      if (args.length < 2) {
        message.channel.send('Please provide a title');
        return;
      }
      //create a new score tracking
      message.channel
        .send(createNewScoreboard(args[1], message.author))
        .then((message) => {
          // message.react('❓')
          //     .then(() => message.react('➖'))
          //     .then(() => message.react('❌'))
        });
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
  if (user.partial) {
    // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
    try {
      await user.fetch();
    } catch (error) {
      console.error('Something went wrong when fetching the user: ', error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }
  // only manage self posted messages
  if (reaction.message.author === client.user) {
    switch (reaction.emoji.name) {
      case '❓':
        reaction.message.channel.send(helpMessage);
        break;
      case '➖':
        break;
      case '❌':
        if (reaction.message.embeds[0].author === user) {
          reaction.message.delete();
          user.send('congrats, you deleted your scoreboard !');
        } else {
          user.send('only owner can delete a scoreboard');
        }
        break;

      default:
        handle_reaction(reaction, user);
        break;
    }

    reaction.remove();
  }
});

const handle_reaction = (
  reaction: Discord.MessageReaction,
  user: Discord.User | Discord.PartialUser,
) => {
  if (reaction.count > 1) {
    // already existing
  } else {
    //new player !
  }
};

function createNewScoreboard(
  title: string,
  author: Discord.User,
): Discord.MessageEmbed {
  const embed = new Discord.MessageEmbed()
    .setTitle(title)
    .setDescription('<@' + author.id + '>')
    .addField('<@' + author.id + '>', 1, true);

  return embed;
}

// Log our bot in using the token from https://discord.com/developers/applications
client.login(process.env.BOT_TOKEN);
