import { TELEGRAM_STARS_PRICE } from "./limits.js";

export const BASE_INVOICE = {
  currency: 'XTR', // Telegram Stars only
  description:
    'Buy Unlimited custom mentions for this group and tag @everyone you need. Forever.',
  photo_url:
    'https://cdn.buymeacoffee.com/uploads/rewards/2024-02-23/1/111305_IMG_0129.jpeg@1200w_0e.jpeg',
  title: 'Unlimited custom mentions forever',
  prices: [
    {
      amount: TELEGRAM_STARS_PRICE,
      label: 'Unlimited',
    },
  ],
  provider_token: '', // empty for Telegram Stars
}
