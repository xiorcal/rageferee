import * as Discord from 'discord.js';
import { Player } from './player';

type reactResponse = {
  scoreUpdated: boolean;
  inputEmoji: string;
  oldEmoji: string;
};

export class ScoreBoard {
  players: Player[];
  title: string;
  ownerId: string;

  constructor(ownerId: string, title: string) {
    this.ownerId = ownerId;
    this.title = title;
    this.players = [];
  }

  static from(embed: Discord.Embed): ScoreBoard {
    const ownerId = embed.footer.text.split('_')[0];
    const result = new ScoreBoard(ownerId, embed.title);

    const split = (embed.description ?? '').split('\n');

    for (const line of split) {
      if (line.length > 1) {
        result.players.push(Player.from(line));
      }
    }

    return result;
  }

  toEmbed(): Discord.EmbedBuilder {
    const embed = new Discord.EmbedBuilder()
      .setTitle(this.title)
      .setDescription(this.getDescription())
      .setFooter({ text: this.ownerId });
    return embed;
  }
  getDescription(): string {
    if (this.players.length > 0) {
      return this.players.sort((a, b) => b.score - a.score).join('\n');
    }
    return null;
  }

  getPlayerByEmoji(emoji: string): Player {
    return this.players.filter((p) => p.currentEmoji === emoji)[0];
  }

  includePlayer(playerId: string): boolean {
    return this.players.filter((p) => p.id === playerId).length > 0;
  }

  includeEmoji(emoji: string): boolean {
    return this.players.filter((p) => p.currentEmoji === emoji).length > 0;
  }

  react(
    reaction: Discord.MessageReaction,
    user: Discord.User | Discord.PartialUser,
  ): reactResponse {
    const emoji = reaction.emoji.name;
    let oldEmoji = emoji;
    const playerId = user.id;
    let scoreIncreased = false;

    if (this.includeEmoji(emoji)) {
      this.increaseScore(emoji);
      scoreIncreased = true;
    } else {
      if (this.includePlayer(playerId)) {
        //old player
        oldEmoji = this.changeEmoji(playerId, emoji);
      } else {
        // new player
        this.addPlayer(playerId, emoji);
      }
    }

    return { scoreUpdated: scoreIncreased, inputEmoji: emoji, oldEmoji };
  }

  addPlayer(playerId: string, emoji: string): void {
    this.players.push(new Player(playerId, emoji));
  }

  changeEmoji(playerId: string, newEmoji: string): string {
    let oldEmoji = '';
    this.players = this.players.map((p) => {
      if (p.id === playerId) {
        oldEmoji = p.currentEmoji;
        return p.changeEmoji(newEmoji);
      } else {
        return p;
      }
    });
    return oldEmoji;
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

export class ScoreBoardAdmin extends ScoreBoard {
  originalChannelId: string;
  originalId: string;

  constructor(embed: Discord.Embed, chan: string, id: string) {
    const ownerId = embed.footer.text.split('_')[0];

    super(ownerId, embed.title);
    const split = (embed.description ?? '').split('\n');

    for (const line of split) {
      if (line.length > 1) {
        this.players.push(Player.from(line));
      }
    }
    this.originalChannelId = chan;
    this.originalId = id;
  }

  resetScores(): void {
    for (const player of this.players) {
      player.score = 0;
    }
  }

  decreaseScore(emoji: string): void {
    this.players = this.players.map((p) => {
      if (p.currentEmoji === emoji) {
        return p.score > 0 ? p.decreaseScore() : p;
      } else {
        return p;
      }
    });
  }

  toAdminEmbed(): Discord.EmbedBuilder {
    const res = super.toEmbed();

    const admin_footer =
      res.data.footer.text +
      '_' +
      this.originalChannelId +
      '_' +
      this.originalId;
    res.setFooter({ text: admin_footer });
    return res;
  }
  static fromAdminEmbed(embed: Discord.Embed): ScoreBoardAdmin {
    const split = embed.footer.text.split('_');
    return new ScoreBoardAdmin(embed, split[1], split[2]);
  }
}
