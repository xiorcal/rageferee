'use strict';
/**
 * A ping pong bot, whenever you send "ping", it replies "pong".
 */

import * as Discord from 'discord.js';
import * as dotenv from 'dotenv';
import { ScoreBoard } from './scoreboard';
import StormDB from 'stormdb';
import { Freebies } from './freeGamez';
import * as cron from 'node-cron';
import ytdl from 'ytdl-core';

dotenv.config();

const prefix = '!';
const storage_filename = 'freebies_channels.json';
const cron_every_30min = '*/30 * * * * *';

const queues = new Map();

const engine = new StormDB.localFileEngine(storage_filename);
const db = new StormDB(engine);
db.default({ chans: [] });

const freebiesHandler = new Freebies(
  'https://www.indiegamebundles.com/category/free/feed/',
  'freebies_data.json',
);

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
    if (message.content.startsWith(prefix)) {
      handleCommand(message);
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
    case 'p':
    case 'play':
      handlePlay(message);
      break;
    case 'skip':
      handleSkip(message);
      break;
    case 'stop':
    case 'leave':
      handleStop(message);
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

async function handlePlay(message: Discord.Message) {
  const args = message.content.split(' ');

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      'You need to be in a voice channel to play music!',
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
    return message.channel.send(
      'I need the permissions to join and speak in your voice channel!',
    );
  }

  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
  };
  const serverQueue = queues.get(message.guild.id);
  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };

    queues.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      const connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queues.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function play(guild: Discord.Guild, song: any) {
  const serverQueue = queues.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queues.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on('finish', () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on('error', (error) => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}
function handleSkip(message: Discord.Message) {
  const serverQueue = queues.get(message.guild.id);

  if (!message.member.voice.channel)
    return message.channel.send(
      'You have to be in a voice channel to stop the music!',
    );
  if (!serverQueue)
    return message.channel.send('There is no song that I could skip!');
  serverQueue.connection.dispatcher.end();
}

function handleStop(message: Discord.Message) {
  const serverQueue = queues.get(message.guild.id);

  if (!message.member.voice.channel)
    return message.channel.send(
      'You have to be in a voice channel to stop the music!',
    );

  if (!serverQueue)
    return message.channel.send('There is no song that I could stop!');

  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function handleLogs(message: Discord.Message) {
  console.log(message);
  return;
}

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
        `||<@${user.id}>|| voted for <@${targetUser?.id}> (${scoreBoard.title}).`,
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

function checkAndPublishFreebies() {
  freebiesHandler
    .getNewFreebies()
    .then((newOnes) => {
      if (newOnes.length > 0) {
        const channels: string[] = db.get('chans').value();
        channels.forEach((chan) => {
          const channel = client.channels.cache.get(chan);
          if (channel.isText()) {
            newOnes.forEach((freebie) => {
              channel.send(freebie.toDiscordMessage());
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
