import { Player } from './player';

describe('Test player.ts', () => {
  let playerA: Player;

  beforeEach(() => (playerA = new Player('playerA-ID', 'playerA-emoji')));
  describe('Test toString', () => {
    test('A player string representation should be correct', () => {
      expect(playerA.toString()).toBe('<@playerA-ID> (playerA-emoji) : 0');
    });
  });
  describe('Test increaseScore', () => {
    test('increasing player score should be visible on display', () => {
      expect(playerA.toString()).toBe('<@playerA-ID> (playerA-emoji) : 0');
      expect(playerA.increaseScore().toString()).toBe(
        '<@playerA-ID> (playerA-emoji) : 1',
      );
      expect(playerA.increaseScore().toString()).toBe(
        '<@playerA-ID> (playerA-emoji) : 2',
      );
    });
    test('increasing 2 times should be 2', () => {
      expect(playerA.increaseScore().increaseScore().toString()).toBe(
        '<@playerA-ID> (playerA-emoji) : 2',
      );
    });
  });
  describe('Test changeEmoji', () => {
    test('changing player emoji should be visible on display', () => {
      expect(playerA.toString()).toBe('<@playerA-ID> (playerA-emoji) : 0');
      expect(playerA.changeEmoji('playerA-emoji2').toString()).toBe(
        '<@playerA-ID> (playerA-emoji2) : 0',
      );
      expect(playerA.changeEmoji('playerA-emoji3').toString()).toBe(
        '<@playerA-ID> (playerA-emoji3) : 0',
      );
    });
  });
  describe('Test increase and changemoji combined', () => {
    test('changing player emoji and increasing score should be visible on display', () => {
      expect(
        playerA.changeEmoji('playerA-emoji2').increaseScore().toString(),
      ).toBe('<@playerA-ID> (playerA-emoji2) : 1');
    });
    test('increasing score and changing player emoji should be visible on display', () => {
      expect(
        playerA.increaseScore().changeEmoji('playerA-emoji2').toString(),
      ).toBe('<@playerA-ID> (playerA-emoji2) : 1');
    });
  });

  describe('Test fromString', () => {
    test('A player should be correctly parsed from correct string', () => {
      expect(Player.from(playerA.toString())).toStrictEqual(playerA);
    });
  });
});
