'use strict';
/**
 * A ping pong bot, whenever you send "ping", it replies "pong".
 */

import * as Discord from 'discord.js';
import * as dotenv from 'dotenv';
import { ScoreBoard } from './scoreboard';

dotenv.config();

// Create an instance of a Discord client
const client = new Discord.Client({
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});

const helpMessage = `
To add yourself to the board, react with an unused emoji
To vote react with a used emoji
To change your emoji react with an unused emoji
(this message will delete itself after ~40 sec)`;

/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */
client.on('ready', () => {
  console.log('I am ready!');
});

// Create an event listener for messages
client.on('message', (message) => {
  //users messages
  if (!message.author.bot) {
    // If the message is "ping"
    if (message.content.startsWith('!create')) {
      const title = message.content.replace('!create', '').trim();
      console.log('title : ', title);

      if (!title.length) {
        message.channel.send('Please provide a title');
      } else {
        //create a new scornewS tracking
        message.channel
          .send(createNewScoreboard(title, message.author).toEmbed())
          .then((newMessage) => {
            newMessage
              .react('❓')
              .then(() => newMessage.react('❌'))
              .then(() => message.delete())
              .then(() => newMessage.pin());
          });
      }
    }
  }
  // self messages
  if (message.author === client.user) {
    // delete pin mention
    if (message.type === 'PINS_ADD') message.delete({ timeout: 3000 });
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
  // only manage self posted messages and ignore self reactions
  if (reaction.message.author === client.user && user !== client.user) {
    switch (reaction.emoji.name) {
      case '❓':
        sendHelpMessage(reaction);
        resetReaction(reaction, '❓');
        break;
      case '❌':
        handleDelete(reaction, user);
        break;

      default:
        handle_reaction(reaction, user);
        break;
    }
  }
});

function handleDelete(
  reaction: Discord.MessageReaction,
  user: Discord.User | Discord.PartialUser,
) {
  const owner = reaction.message.embeds[0].footer.text;
  if (owner === user.id) {
    const oldState = new Discord.MessageEmbed(reaction.message.embeds[0]);
    reaction.message.delete();
    user.send('congrats, you deleted your scoreboard ! previous state was :');
    user.send(oldState);
  } else {
    user.send('only owner can delete a scoreboard');
    resetReaction(reaction, '❌');
  }
}

function sendHelpMessage(reaction: Discord.MessageReaction) {
  reaction.message
    .reply(helpMessage)
    .then((postedHelpMessage) => postedHelpMessage.delete({ timeout: 40000 }));
}

function resetReaction(reaction: Discord.MessageReaction, emoji: string): void {
  reaction.remove().then(() => reaction.message.react(emoji));
}

function handle_reaction(
  reaction: Discord.MessageReaction,
  user: Discord.User | Discord.PartialUser,
) {
  const scoreBoard = ScoreBoard.from(reaction.message.embeds[0]);
  const scoreIncreased = scoreBoard.react(reaction, user);
  reaction.message.edit(scoreBoard.toEmbed());

  if (scoreIncreased) {
    const targetUser = scoreBoard.getPlayerByEmoji(reaction.emoji.name);
    reaction.message.channel
      .send(
        `<@${user.id}> added a point in ${scoreBoard.title} to <@${targetUser?.id}>.`,
      )
      .then((m) => m.delete({ timeout: 60000 }));
  }

  resetReaction(reaction, reaction.emoji.name);
}

function createNewScoreboard(title: string, author: Discord.User): ScoreBoard {
  return new ScoreBoard(author.id, title);
}

// Log our bot in using the token from https://discord.com/developers/applications
client.login(process.env.BOT_TOKEN).catch((err) => {
  console.error('Something went wrong while starting the rageferee: ', err);
});
