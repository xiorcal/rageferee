import * as Discord from 'discord.js';
import { Player } from './player';

export class ScoreBoard {
  players: Player[];
  title: string;
  ownerId: string;

  constructor(ownerId: string, title: string) {
    this.ownerId = ownerId;
    this.title = title;
    this.players = [];
  }

  static from(embed: Discord.MessageEmbed): ScoreBoard {
    const result = new ScoreBoard(embed.footer.text, embed.title);

    const split = (embed.description ?? '').split('\n');

    for (const line of split) {
      if (line.length > 1) {
        result.players.push(Player.from(line));
      }
    }

    return result;
  }

  includePlayer(playerId: string): boolean {
    return this.players.filter((p) => p.id === playerId).length > 0;
  }
  includeEmoji(emoji: string): boolean {
    return this.players.filter((p) => p.currentEmoji === emoji).length > 0;
  }

  toEmbed(): Discord.MessageEmbed {
    return new Discord.MessageEmbed()
      .setTitle(this.title)
      .setDescription(this.players.sort((a, b) => b.score - a.score).join('\n'))
      .setFooter(this.ownerId);
  }

  react(
    reaction: Discord.MessageReaction,
    user: Discord.User | Discord.PartialUser,
  ): ScoreBoard {
    const emoji = reaction.emoji.name;
    const playerId = user.id;
    if (this.includeEmoji(emoji)) {
      this.increaseScore(emoji);
    } else {
      if (this.includePlayer(playerId)) {
        //old player
        this.changeEmoji(playerId, emoji);
      } else {
        // new player
        this.addPlayer(playerId, emoji);
      }
    }

    return this;
  }
  addPlayer(playerId: string, emoji: string): void {
    this.players.push(new Player(playerId, emoji));
  }
  changeEmoji(playerId: string, newEmoji: string): void {
    this.players = this.players.map((p) => {
      if (p.id === playerId) {
        return p.changeEmoji(newEmoji);
      } else {
        return p;
      }
    });
  }
  increaseScore(emoji: string): void {
    this.players = this.players.map((p) => {
      if (p.currentEmoji === emoji) {
        return p.increaseScore();
      } else {
        return p;
      }
    });
  }
}
