'use strict';
/**
 * A ping pong bot, whenever you send "ping", it replies "pong".
 */

import * as Discord from 'discord.js';
import * as dotenv from 'dotenv';
import { ScoreBoard, ScoreBoardAdmin } from './scoreboard';
import StormDB from 'stormdb';
import { Freebies } from './freeGamez';
import * as cron from 'node-cron';

dotenv.config();

const prefix = '!';
const storage_filename = 'freebies_channels.json';
const cron_every_30min = '*/30 * * * * *';

const engine = new StormDB.localFileEngine(storage_filename);
const db = new StormDB(engine);
db.default({ chans: [] });

const freebiesHandler = new Freebies(
  'https://www.indiegamebundles.com/category/free/feed/',
  'freebies_data.json',
);

// Create an instance of a Discord client
const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildMessageReactions,
    Discord.GatewayIntentBits.DirectMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.DirectMessageReactions,
  ],
  partials: [
    Discord.Partials.Channel,
    Discord.Partials.Message,
    Discord.Partials.Reaction,
  ],
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
client.on('messageCreate', async (message) => {
  //users messages
  if (!message.author.bot) {
    // If the message is "ping"
    if (message.content.startsWith(prefix)) {
      handleCommand(message);
    }
    // private message
    else if (message.channel.type === Discord.ChannelType.DM) {
      handleDM(message);
    }
  }
  // self messages
  if (message.author === client.user) {
    // delete pin mention
    if (message.type === Discord.MessageType.ChannelPinnedMessage)
      setTimeout(() => {
        message.delete();
      }, 3000);
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  let nonPartialReaction, nonPartialUser;
  // When we receive a reaction we check if the reaction is partial or not
  if (reaction.partial) {
    // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
    try {
      nonPartialReaction = await reaction.fetch();
    } catch (error) {
      console.error('Something went wrong when fetching the message: ', error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  } else {
    nonPartialReaction = reaction;
  }
  if (user.partial) {
    // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
    try {
      nonPartialUser = await user.fetch();
    } catch (error) {
      console.error('Something went wrong when fetching the user: ', error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  } else {
    nonPartialUser = user;
  }

  if (
    reaction.message.channel.type === Discord.ChannelType.DM &&
    nonPartialUser !== client.user
  ) {
    handleDmReaction(nonPartialReaction, nonPartialUser);
  } else {
    // only manage self posted messages and ignore self reactions
    if (
      nonPartialReaction.message.author === client.user &&
      nonPartialUser !== client.user
    ) {
      switch (nonPartialReaction.emoji.name) {
        case '❓':
          sendHelpMessage(nonPartialReaction);
          resetReaction(nonPartialReaction, '❓');
          break;
        case '❌':
          handleDelete(nonPartialReaction, nonPartialUser);
          break;
        case '⚙️':
          sendAdminMessage(nonPartialReaction, nonPartialUser);
          nonPartialReaction.remove();
          break;
        default:
          handleReaction(nonPartialReaction, nonPartialUser);
          break;
      }
    }
  }
});

function handleCommand(message: Discord.Message) {
  const rawInput = message.content.slice(prefix.length).trim().split(' ');
  const command = rawInput.shift().toLowerCase();
  const args = rawInput;
  switch (command) {
    case 'create':
      handleCreate(message, args.join(' '));
      break;
    case 'logs':
      handleLogs(message);
      break;
    case 'replace_miraltar':
      handleRegisterFreebies(message);
      break;
    default:
      break;
  }
}

function handleCreate(message: Discord.Message, title: string) {
  if (!title.length) {
    message.channel.send('Please provide a title');
  } else {
    //create a new scoreboard tracking
    message.channel
      .send({ embeds: [createNewScoreboard(title, message.author).toEmbed()] })
      .then((newMessage) => {
        newMessage
          .react('❓')
          .then(() => newMessage.react('❌'))
          .then(() => message.delete())
          .then(() => newMessage.pin());
      });
  }
}

function handleLogs(message: Discord.Message) {
  console.log(message);
  return;
}

function handleDelete(reaction: Discord.MessageReaction, user: Discord.User) {
  const owner = reaction.message.embeds[0].footer.text;
  if (owner === user.id) {
    const oldState = reaction.message.embeds[0];
    reaction.message.delete();
    user.send('congrats, you deleted your scoreboard ! previous state was :');
    user.send({ embeds: [oldState] });
  } else {
    user.send('only owner can delete a scoreboard');
    resetReaction(reaction, '❌');
  }
}
function handleRegisterFreebies(message: Discord.Message) {
  const chanId = message.channel.id;
  let current_chans: string[] = db.get('chans').value();
  if (current_chans.indexOf(chanId) === -1) {
    current_chans.push(chanId);
    db.set('chans', current_chans).save();
    message.channel.send('registered');
  } else {
    message.channel.send('already registered, removing');
    current_chans = current_chans.filter((chan) => chan !== chanId);
    db.set('chans', current_chans).save();
  }
}

function sendHelpMessage(reaction: Discord.MessageReaction) {
  reaction.message
    .reply(helpMessage)
    .then((postedHelpMessage) =>
      setTimeout(() => postedHelpMessage.delete(), 40000),
    );
}

function resetReaction(reaction: Discord.MessageReaction, emoji: string): void {
  reaction.remove().then(() => reaction.message.react(emoji));
}

function handleReaction(reaction: Discord.MessageReaction, user: Discord.User) {
  const scoreBoard = ScoreBoard.from(reaction.message.embeds[0]);
  const result = scoreBoard.react(reaction, user);
  reaction.message.edit({ embeds: [scoreBoard.toEmbed()] });

  if (result.scoreUpdated) {
    const targetUser = scoreBoard.getPlayerByEmoji(reaction.emoji.name);
    reaction.message.channel
      .send(
        `||<@${user.id}>|| voted for <@${targetUser?.id}> (${scoreBoard.title}).`,
      )
      .then((m) => setTimeout(() => m.delete(), 60000));
  } else {
    //changing emoji, delete old
    reaction.message.reactions.resolve(result.oldEmoji).remove();
  }
  resetReaction(reaction, reaction.emoji.name);
}

function createNewScoreboard(title: string, author: Discord.User): ScoreBoard {
  return new ScoreBoard(author.id, title);
}

async function sendAdminMessage(
  reaction: Discord.MessageReaction,
  user: Discord.User,
) {
  const scoreBoard: ScoreBoardAdmin = new ScoreBoardAdmin(
    reaction.message.embeds[0],
    reaction.message.channel.id,
    reaction.message.id,
  );

  if (user.dmChannel === null) {
    await user.createDM();
  }
  user.dmChannel.send(
    "use the :repeat: reaction to reset scores; react with existing user reaction to decrease score of matching user \n ⚠️ changes will not be reflected here and I can't remove your reaction here",
  );
  user.dmChannel
    .send({ embeds: [scoreBoard.toAdminEmbed()] })
    .then((newMessage) => {
      newMessage.react('🔁');
      for (const player of scoreBoard.players) {
        newMessage.react(player.currentEmoji);
      }
    });
}

function handleDM(message: Discord.Message) {
  switch (message.content) {
    case 'admin':
      message.channel.send(
        "To admin a post you've created, first react with the ⚙️ emoji to the board you want to admin",
      );
      break;

    case 'help':
    default:
      message.channel.send(
        'you should use one of the following command : "help", "admin"',
      );
      break;
  }
}

function handleDmReaction(
  reaction: Discord.MessageReaction,
  user: Discord.User,
) {
  const scoreBoard: ScoreBoardAdmin = ScoreBoardAdmin.fromAdminEmbed(
    reaction.message.embeds[0],
  );
  if (scoreBoard.ownerId !== user.id) {
    reaction.message.channel.send('you no admin man');
    return;
  }
  switch (reaction.emoji.name) {
    case '🔁':
      scoreBoard.resetScores();

      break;
    default:
      scoreBoard.decreaseScore(reaction.emoji.name);
      break;
  }
  updateOriginal(scoreBoard);
  reaction.message.delete().then(() =>
    reaction.message.channel
      .send({ embeds: [scoreBoard.toAdminEmbed()] })
      .then((newMessage) => {
        newMessage.react('🔁');
        for (const player of scoreBoard.players) {
          newMessage.react(player.currentEmoji);
        }
      }),
  );
}

function updateOriginal(scoreBoard: ScoreBoardAdmin) {
  client.channels.fetch(scoreBoard.originalChannelId).then((channel) => {
    if (channel.type === Discord.ChannelType.GuildText) {
      const textChan = channel as Discord.TextChannel;
      textChan.messages
        .fetch(scoreBoard.originalId)
        .then((original) => original.edit({ embeds: [scoreBoard.toEmbed()] }));
    }
  });
}

// Log our bot in using the token from https://discord.com/developers/applications
client.login(process.env.BOT_TOKEN).catch((err) => {
  console.error('Something went wrong while starting the rageferee: ', err);
});

function checkAndPublishFreebies() {
  freebiesHandler
    .getNewFreebies()
    .then((newOnes) => {
      if (newOnes.length > 0) {
        const channels: string[] = db.get('chans').value();
        channels.forEach((chan) => {
          const channel = client.channels.cache.get(chan);
          if (channel.type === Discord.ChannelType.GuildText) {
            newOnes.forEach((freebie) => {
              channel.send({ embeds: [freebie.toDiscordMessage()] });
            });
          }
        });
      }
    })
    .catch((error) => {
      console.error(error);
    });
}

const task = cron.schedule(
  cron_every_30min,
  () => {
    checkAndPublishFreebies();
  },
  {
    scheduled: false,
  },
);

setTimeout(() => {
  task.start();
}, 5000);
