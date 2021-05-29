import Parser from 'rss-parser';
import StormDB from 'stormdb';
import * as Discord from 'discord.js';

type Data = {
  freebies: Freebie[];
  lastUpdated: number;
};
class Freebie {
  title: string;
  link: string;
  isoDate: string;
  categories: string[];
  description: string;
  toDiscordMessage = () => {
    const message = new Discord.MessageEmbed()
      .setTitle(this.title)
      .setDescription(this.description)
      .setURL(this.link);
    message.addField('categories', this.categories);
    return message;
  };
  constructor(
    title: string,
    link: string,
    isoDate: string,
    categories: string[],
    description: string,
  ) {
    this.title = title;
    this.link = link;
    this.isoDate = isoDate;
    this.categories = categories;
    this.description = description;
  }
}

export class Freebies {
  data_feed_url: string;
  db: StormDB;

  constructor(data_feed_url: string, storage_filename: string) {
    this.data_feed_url = data_feed_url;
    const engine = new StormDB.localFileEngine(storage_filename);
    this.db = new StormDB(engine);
    this.db.default({ freebies: [], lastUpdated: Date.now() });
  }

  async getNewFreebies(): Promise<Freebie[]> {
    const old: Freebie[] = this.getOldFreebies();
    const potentialNews = await this.retrieveDistant();
    const news = potentialNews.freebies.filter((maybeNew) => {
      return !old.some((a) => a.link === maybeNew.link);
    });
    this.db
      .set('freebies', news.concat(old))
      .set('lastUpdated', Date.now())
      .save();
    return news;
  }

  getOldFreebies(): Freebie[] {
    return this.db.get('freebies').value();
  }

  async retrieveDistant(): Promise<Data> {
    const itemsData: Freebie[] = [];
    const parser: Parser<any, Freebie> = new Parser();
    const feed = await parser.parseURL(this.data_feed_url);
    feed.items.forEach((item) => {
      itemsData.push(
        new Freebie(
          item.title,
          item.link,
          item.isoDate,
          item.categories,
          item.content,
        ),
      );
      itemsData.sort((a, b) => Date.parse(b.isoDate) - Date.parse(a.isoDate));
    });
    return {
      freebies: itemsData,
      lastUpdated: Date.parse(itemsData[0].isoDate),
    };
  }
}
