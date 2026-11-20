// The three website quality levels. Edit prices and features here — the UI and the
// server both read this file. Prices are in INR per month, billed yearly.
export const PLANS = [
  {
    id: 'basic',
    name: 'Shuruaat',
    meaning: 'The start',
    price: 0,
    priceNote: 'Free forever',
    address: 'bolbiz.in/s/yourname',
    features: [
      'One-page site in your language and English',
      'WhatsApp and call buttons',
      'Accessibility checked',
      'Free BolBiz web address',
    ],
  },
  {
    id: 'standard',
    name: 'Dukaan',
    meaning: 'The shop',
    price: 149,
    priceNote: 'per month, billed yearly',
    address: 'yourname.in',
    recommended: true,
    features: [
      'Everything in Shuruaat',
      'Your own domain from GoDaddy',
      'Business email: hello@yourname.in',
      'Contact form — messages translated to your language',
      'QR poster for your shop',
    ],
  },
  {
    id: 'premium',
    name: 'Brand',
    meaning: 'Your brand',
    price: 349,
    priceNote: 'per month, billed yearly',
    address: 'yourname.in',
    features: [
      'Everything in Dukaan',
      'Premium design with your story',
      '“Order this” WhatsApp button on every item',
      'Highlights and common questions sections',
      'Ready-made WhatsApp and Instagram launch posts',
    ],
  },
];

export const PLAN_IDS = PLANS.map((p) => p.id);
export const planById = (id) => PLANS.find((p) => p.id === id) || PLANS[1];
