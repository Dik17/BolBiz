export const sampleSpec = (over = {}) => ({
  slug: 'aji-che-modak',
  primary_lang: 'mr',
  brand_color: '#8a2b0f',
  icon: '🍰',
  contact: { whatsapp: '+91 98765 43210', map_query: 'Kothrud Pune' },
  content: {
    primary: {
      business_name: 'आजीचे मोदक',
      tagline: 'घरी बनवलेले ताजे मोदक आणि केक',
      about: 'आम्ही कोथरूडमध्ये घरी मोदक बनवतो. ऑर्डर व्हॉट्सॲपवर घ्या.',
      offerings: [{ name: 'उकडीचे मोदक', price: '₹40 / नग' }],
      ui: { about_heading: 'आमच्याबद्दल', offerings_heading: 'आमचे पदार्थ', contact_heading: 'संपर्क', whatsapp_label: 'व्हॉट्सॲपवर ऑर्डर करा', call_label: 'फोन करा', hours_label: 'वेळ', address_label: 'पत्ता', name_label: 'तुमचे नाव', phone_label: 'फोन किंवा ईमेल', message_label: 'संदेश', send_label: 'संदेश पाठवा' },
    },
    en: {
      business_name: "Aji's Modaks",
      tagline: 'Fresh home-made modaks and cakes',
      about: 'We make modaks at home in Kothrud. Order on WhatsApp.',
      offerings: [{ name: 'Steamed modak', price: '₹40 each' }],
      ui: {},
    },
  },
  ...over,
});
