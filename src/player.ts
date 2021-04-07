export class Player {
  id: string;
  currentEmoji: string;
  score: number;

  constructor(initialUser: string, emoji: string, score = 0) {
    this.id = initialUser;
    this.currentEmoji = emoji;
    this.score = score;
  }

  static regexLine = /<@([^>]+)> \(([^)]+)\) : ([0-9]+)/;
  static from(line: string): Player {
    const data = line.trim().match(Player.regexLine);
    // 0 full match, then capturing groups
    const [, id, emoji, score] = data;
    return new Player(id, emoji, parseInt(score, 10));
  }

  changeEmoji(newEmoji: string): Player {
    this.currentEmoji = newEmoji;
    return this;
  }
  increaseScore(): Player {
    this.score++;
    return this;
  }

  toString(): string {
    return '<@' + this.id + '> (' + this.currentEmoji + ') : ' + this.score;
  }
}
