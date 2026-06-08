import { Telegraf } from "telegraf";

let _instance: Telegraf | null = null;

export function getBot(): Telegraf {
  if (!_instance) {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN manquant dans .env");
    }
    _instance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  }
  return _instance;
}
