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
          .send(createNewScoreboard(title, message.author))
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
  // only manage self posted messages and ignore self recations
  if (reaction.message.author === client.user && user !== client.user) {
    switch (reaction.emoji.name) {
      case '❓':
        reaction.message
          .reply(helpMessage)
          .then((postedHelpMessage) =>
            postedHelpMessage.delete({ timeout: 40000 }),
          );
        resetReaction(reaction, '❓');
        break;
      case '❌':
        const owner = reaction.message.embeds[0].footer.text;
        if (owner === user.id) {
          const oldState = new Discord.MessageEmbed(reaction.message.embeds[0]);
          reaction.message.delete();
          user.send(
            'congrats, you deleted your scoreboard ! previous state was :',
          );
          user.send(oldState);
        } else {
          user.send('only owner can delete a scoreboard');
          resetReaction(reaction, '❌');
        }
        break;

      default:
        handle_reaction(reaction, user);
        break;
    }
  }
});

function resetReaction(reaction: Discord.MessageReaction, emoji: string): void {
  reaction.remove().then(() => reaction.message.react(emoji));
}

function handle_reaction(
  reaction: Discord.MessageReaction,
  user: Discord.User | Discord.PartialUser,
) {
  const message = reaction.message;
  const oldDesc = message.embeds[0]?.description ?? '';
  const flagExistingEmoji = oldDesc.includes(reaction.emoji.name);
  const flagExistingUser = oldDesc.includes(user.id);

  let newDesc: string;

  if (flagExistingEmoji) {
    newDesc = oldDesc
      .split('\n')
      .map((l) => {
        if (l.includes(reaction.emoji.name)) {
          const [desc, score] = l.split(' : ');
          const newScore = parseInt(score, 10) + 1;
          return desc + ' : ' + newScore;
        } else {
          return l;
        }
      })
      .join('\n');
  } else {
    // old player, new emoji
    if (flagExistingUser) {
      newDesc = oldDesc
        .split('\n')
        .map((l) => {
          if (l.includes(user.id)) {
            const [desc, score] = l.split(' : ');
            const oldReaction = desc.match(/[^(]+\(([^)]+)\).*/)[1];
            message.react(oldReaction).then((r) => r.remove());
            return (
              '<@' + user.id + '> (' + reaction.emoji.name + ') : ' + score
            );
          } else {
            return l;
          }
        })
        .join('\n');
    } else {
      // brand new player
      newDesc =
        oldDesc + '\n<@' + user.id + '> (' + reaction.emoji.name + ') : 0';
    }
  }

  const newEmbed = new Discord.MessageEmbed(message.embeds[0]).setDescription(
    newDesc,
  );
  message.edit(newEmbed);

  resetReaction(reaction, reaction.emoji.name);
}

function createNewScoreboard(
  title: string,
  author: Discord.User,
): Discord.MessageEmbed {
  const embed = new Discord.MessageEmbed()
    .setTitle(title)
    .setDescription('')
    .setFooter(author.id);

  return embed;
}

// Log our bot in using the token from https://discord.com/developers/applications
client.login(process.env.BOT_TOKEN);
