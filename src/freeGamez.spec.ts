import { Freebies } from './freeGamez';
import fs from 'fs';

const dir = 'test';

describe('Test freeGamez.ts', () => {
  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
  });
  afterAll(() => {
    fs.rmdirSync(dir, { recursive: true });
  });

  describe('retrieving previous state from should work', () => {
    test('without a file', () => {
      const freebies = new Freebies(
        'https://www.indiegamebundles.com/category/free/feed/',
        'test/nofile.json',
      );
      expect(freebies.getOldFreebies()).toEqual([]);
    });
    test('with an empty file', () => {
      fs.writeFileSync('test/empty_file.json', '');

      const freebies = new Freebies(
        'https://www.indiegamebundles.com/category/free/feed/',
        'test/empty_file.json',
      );
      expect(freebies.getOldFreebies()).toEqual([]);
    });

    test('with a correct file', () => {
      fs.writeFileSync(
        'test/correct.json',
        '{"freebies":[{"title":"GetLawlessLandsforfreeonIndieGala","link":"https://www.indiegamebundles.com/get-lawless-lands-for-free-on-indiegala/","isoDate":"2021-05-22T08:07:38.000Z","categories":["Freegames","drmfree","freegame","indiegala"]},{"title":"GetSamorost1forFREEonSteam","link":"https://www.indiegamebundles.com/get-samorost-1-for-free-on-steam/","isoDate":"2021-05-20T19:36:08.000Z","categories":["Freegames","freegame","freesteamkey"]}]}',
      );

      const freebies = new Freebies(
        'https://www.indiegamebundles.com/category/free/feed/',
        'test/correct.json',
      );
      const actual = freebies.getOldFreebies();
      expect(actual.length).toEqual(2);
      expect(actual[0].title).toEqual('GetLawlessLandsforfreeonIndieGala');
      expect(actual[1].title).toEqual('GetSamorost1forFREEonSteam');
    });
  });
});
