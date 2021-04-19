import { Player } from './player';
import { ScoreBoard } from './scoreboard';

describe('Test scoreboard.ts', () => {
  let scoreboardA, scoreboardB: ScoreBoard;

  beforeEach(() => {
    scoreboardA = new ScoreBoard('playerA-ID', 'scoreboard A title');
    scoreboardB = new ScoreBoard('playerA-ID', 'scoreboard B title');
  });

  describe('testing add player function', () => {
    test('should add a player if player not in score board', () => {
      expect(scoreboardA.players).toEqual([]);
      scoreboardA.addPlayer('toto', 'emojiToto');
      expect(scoreboardA.players).toEqual([new Player('toto', 'emojiToto', 0)]);
    });
  });

  describe('testing get a player by emoji function', () => {
    test('should return nothing', () => {
      expect(scoreboardA.getPlayerByEmoji('toto')).toBe(undefined);
    });
    test('should return the player in the scoreboard', () => {
      scoreboardA.addPlayer('toto', 'emojiToto');
      expect(scoreboardA.getPlayerByEmoji('emojiToto')).toEqual({
        currentEmoji: 'emojiToto',
        id: 'toto',
        score: 0,
      });
    });
  });

  describe('testing include player function', () => {
    test('should be false if player not in score board', () => {
      expect(scoreboardA.includePlayer('toto')).toBe(false);
    });
    test('should be true if player in score board', () => {
      scoreboardA.addPlayer('toto', 'emojiToto');
      expect(scoreboardA.includePlayer('toto')).toBe(true);
    });
  });

  describe('testing include emoji ', () => {
    test('should be false if emoji not in score board', () => {
      expect(scoreboardA.includeEmoji('emojiToto')).toBe(false);
    });
    test('should be true if emoji in score board', () => {
      scoreboardA.addPlayer('toto', 'emojiToto');
      expect(scoreboardA.includeEmoji('emojiToto')).toBe(true);
    });
  });

  describe('testing change emoji function', () => {
    beforeEach(() => {
      scoreboardB.addPlayer('toto', 'emojiToto');
      scoreboardB.addPlayer('titi', 'emojiTiti');
    });
    test('should correctly update an emoji', () => {
      expect(scoreboardB.includeEmoji('emojiToto')).toBe(true);
      expect(scoreboardB.includeEmoji('emojiTiti')).toBe(true);
      expect(scoreboardB.includeEmoji('emojiToto2')).toBe(false);
      scoreboardB.changeEmoji('toto', 'emojiToto2');
      expect(scoreboardB.includeEmoji('emojiToto')).toBe(false);
      expect(scoreboardB.includeEmoji('emojiTiti')).toBe(true);
      expect(scoreboardB.includeEmoji('emojiToto2')).toBe(true);
    });
  });

  describe('testing increase score function', () => {
    beforeEach(() => {
      scoreboardB.addPlayer('toto', 'emojiToto');
      scoreboardB.addPlayer('titi', 'emojiTiti');
    });
    test('should correctly update score', () => {
      expect(scoreboardB.players.find((p) => p.id === 'toto').score).toBe(0);
      expect(scoreboardB.players.find((p) => p.id === 'titi').score).toBe(0);
      scoreboardB.increaseScore('emojiToto');
      expect(scoreboardB.players.find((p) => p.id === 'toto').score).toBe(1);
      expect(scoreboardB.players.find((p) => p.id === 'titi').score).toBe(0);
    });
  });

  describe('testing react function', () => {
    let reactionToto, userTiti, reactionTutu, userTutu;
    beforeAll(() => {
      reactionToto = {
        emoji: {
          name: 'emojiToto',
        },
      };
      reactionTutu = {
        emoji: {
          name: 'emojiTutu',
        },
      };
      userTutu = {
        id: 'tutu',
      };

      userTiti = {
        id: 'titi',
      };
    });

    beforeEach(() => {
      scoreboardB.addPlayer('toto', 'emojiToto');
      scoreboardB.addPlayer('titi', 'emojiTiti');
    });
    test('should correctly update score when reacting with existing emoji and user', () => {
      expect(scoreboardB.players.find((p) => p.id === 'toto').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'toto').currentEmoji,
      ).toBe('emojiToto');
      expect(scoreboardB.players.find((p) => p.id === 'titi').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'titi').currentEmoji,
      ).toBe('emojiTiti');
      expect(scoreboardB.players.find((p) => p.id === 'tutu')).toBe(undefined);

      scoreboardB.react(reactionToto, userTiti);

      expect(scoreboardB.players.find((p) => p.id === 'toto').score).toBe(1);
      expect(
        scoreboardB.players.find((p) => p.id === 'toto').currentEmoji,
      ).toBe('emojiToto');
      expect(scoreboardB.players.find((p) => p.id === 'titi').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'titi').currentEmoji,
      ).toBe('emojiTiti');
      expect(scoreboardB.players.find((p) => p.id === 'tutu')).toBe(undefined);
    });
    test('should correctly update score when reacting with existing emoji and new user', () => {
      expect(scoreboardB.players.find((p) => p.id === 'toto').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'toto').currentEmoji,
      ).toBe('emojiToto');
      expect(scoreboardB.players.find((p) => p.id === 'titi').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'titi').currentEmoji,
      ).toBe('emojiTiti');
      expect(scoreboardB.players.find((p) => p.id === 'tutu')).toBe(undefined);

      scoreboardB.react(reactionToto, userTutu);

      expect(scoreboardB.players.find((p) => p.id === 'toto').score).toBe(1);
      expect(
        scoreboardB.players.find((p) => p.id === 'toto').currentEmoji,
      ).toBe('emojiToto');
      expect(scoreboardB.players.find((p) => p.id === 'titi').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'titi').currentEmoji,
      ).toBe('emojiTiti');
      expect(scoreboardB.players.find((p) => p.id === 'tutu')).toBe(undefined);
    });
    test('should correctly add new player when reacting with new emoji and user', () => {
      expect(scoreboardB.players.find((p) => p.id === 'toto').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'toto').currentEmoji,
      ).toBe('emojiToto');
      expect(scoreboardB.players.find((p) => p.id === 'titi').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'titi').currentEmoji,
      ).toBe('emojiTiti');
      expect(scoreboardB.players.find((p) => p.id === 'tutu')).toBe(undefined);

      scoreboardB.react(reactionTutu, userTutu);

      expect(scoreboardB.players.find((p) => p.id === 'toto').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'toto').currentEmoji,
      ).toBe('emojiToto');
      expect(scoreboardB.players.find((p) => p.id === 'titi').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'titi').currentEmoji,
      ).toBe('emojiTiti');
      expect(scoreboardB.players.find((p) => p.id === 'tutu').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'tutu').currentEmoji,
      ).toBe('emojiTutu');
    });
    test('should correctly update player emoji when reacting with new emoji and old user', () => {
      expect(scoreboardB.players.find((p) => p.id === 'toto').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'toto').currentEmoji,
      ).toBe('emojiToto');
      expect(scoreboardB.players.find((p) => p.id === 'titi').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'titi').currentEmoji,
      ).toBe('emojiTiti');
      expect(scoreboardB.players.find((p) => p.id === 'tutu')).toBe(undefined);

      scoreboardB.react(reactionTutu, userTiti);

      expect(scoreboardB.players.find((p) => p.id === 'toto').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'toto').currentEmoji,
      ).toBe('emojiToto');
      expect(scoreboardB.players.find((p) => p.id === 'titi').score).toBe(0);
      expect(
        scoreboardB.players.find((p) => p.id === 'titi').currentEmoji,
      ).toBe('emojiTutu');
      expect(scoreboardB.players.find((p) => p.id === 'tutu')).toBe(undefined);
    });
  });

  describe('testing to Embed function', () => {
    beforeEach(() => {
      scoreboardB.addPlayer('toto', 'emojiToto');
      scoreboardB.addPlayer('titi', 'emojiTiti');
    });
    test('should correctly display a scoreboard', () => {
      const result = scoreboardB.toEmbed();
      const expected = `<@toto> (emojiToto) : 0
<@titi> (emojiTiti) : 0`;
      expect(result.description).toBe(expected);
    });
    test('should correctly display a scoreboard with players ordered', () => {
      scoreboardB.increaseScore('emojiTiti');
      scoreboardB.increaseScore('emojiTiti');
      const result = scoreboardB.toEmbed();
      const expected = `<@titi> (emojiTiti) : 2
<@toto> (emojiToto) : 0`;
      expect(result.description).toBe(expected);
    });
  });

  describe('testing from function', () => {
    let fakeData: any;
    beforeEach(() => {
      fakeData = {
        footer: { text: 'FAKEownerId' },
        title: 'FAKE TITLE',
        description: `<@titi> (emojiTiti) : 2
      <@toto> (emojiToto) : 0`,
      };
    });
    test('should correctly display a scoreboard', () => {
      const result = ScoreBoard.from(fakeData);

      expect(result.ownerId).toBe('FAKEownerId');
      expect(result.title).toBe('FAKE TITLE');
      expect(result.players.find((p) => p.id === 'toto').score).toBe(0);
      expect(result.players.find((p) => p.id === 'toto').currentEmoji).toBe(
        'emojiToto',
      );
      expect(result.players.find((p) => p.id === 'titi').score).toBe(2);
      expect(result.players.find((p) => p.id === 'titi').currentEmoji).toBe(
        'emojiTiti',
      );
      expect(result.players.find((p) => p.id === 'tutu')).toBe(undefined);
    });
    test('should correctly display a scoreboard', () => {
      fakeData.description = undefined;
      const result = ScoreBoard.from(fakeData);

      expect(result.ownerId).toBe('FAKEownerId');
      expect(result.title).toBe('FAKE TITLE');
      expect(result.players).toEqual([]);
    });
  });
});
