// Bangla is the primary language and the source of truth for keys.
// Informal "tumi" tone. No guilt words, no "bad food".
export const bn = {
  'app.name': 'EdiByte',
  'app.tagline': 'খাওয়ার আগে জেনে নাও: এই খাবার তোমার জন্য ঠিক তো?',

  'nav.main': 'প্রধান মেনু',
  'nav.skip': 'মূল অংশে যাও',
  'nav.home': 'হোম',
  'nav.photo': 'ছবি',
  'nav.photoLabel': 'খাবারের ছবি তোলো',
  'nav.progress': 'অগ্রগতি',
  'nav.plans': 'পরিকল্পনা',
  'nav.coach': 'কোচ',
  'nav.settings': 'সেটিংস',

  'lang.label': 'ভাষা',
  'lang.bn': 'বাংলা',
  'lang.en': 'English',
  'lang.banglish': 'Banglish',

  'banner.demo': 'ডেমো ডেটা: নমুনা মান দেখানো হচ্ছে, সার্ভার যুক্ত নেই।',
  'banner.offline': 'তুমি এখন অফলাইনে। এই ফোনে রাখা তথ্য দেখা যাবে।',
  'banner.update': 'অ্যাপের নতুন সংস্করণ এসেছে।',
  'banner.reload': 'নতুনটা চালু করো',

  'welcome.title': 'EdiByte-এ স্বাগতম',
  'welcome.body': 'খাবারের ছবি তোলো, খাবারগুলো মিলিয়ে নাও, তারপর দেখো এটা তোমার লক্ষ্যের সাথে কেমন মেলে।',
  'welcome.point1': 'সংখ্যাগুলো আসে খাদ্য তালিকা থেকে, AI থেকে নয়।',
  'welcome.point2': 'তোমার প্রোফাইল আর খাবারের তথ্য এই ফোনেই থাকে।',
  'welcome.point3': 'ছবি কখনো সংরক্ষণ করা হয় না।',
  'welcome.chooseLang': 'কোন ভাষায় চালাবে?',
  'welcome.start': 'শুরু করি',
  'welcome.note': 'এটা সাধারণ পুষ্টি তথ্য, চিকিৎসা পরামর্শ নয়।',

  'route.onboarding': 'তোমার প্রোফাইল',
  'route.home': 'আজ',
  'route.capture': 'খাবারের ছবি',
  'route.confirm': 'খাবার মিলিয়ে নাও',
  'route.result': 'এই খাবার কেমন?',
  'route.coach': 'কোচ',
  'route.progress': 'অগ্রগতি',
  'route.plans': 'পরিকল্পনা',
  'route.settings': 'সেটিংস',
  'route.data': 'ডেটা ও উৎস',
  'route.notFound': 'পাতাটা পাওয়া যায়নি',

  'common.soon': 'এই অংশটা এখন তৈরি হচ্ছে।',
  'common.goHome': 'হোমে যাও',
  'common.loading': 'লোড হচ্ছে…',
  'common.error': 'কিছু একটা ঠিকমতো হয়নি। একটু পরে আবার চেষ্টা করো।',
  'common.continue': 'চালিয়ে যাও',

  'home.photoTitle': 'এই খাবার কি তোমার জন্য ঠিক?',
  'home.photoBody': 'খাওয়ার আগে একটা ছবি তোলো বা গ্যালারি থেকে বেছে নাও।',
  'home.photoCta': 'ছবি দিয়ে দেখি',

  'settings.language': 'অ্যাপের ভাষা',
  'settings.lowData': 'কম ডেটা মোড',
  'settings.lowDataHint': 'ছবি ও বাড়তি লোড বন্ধ থাকে, মোবাইল ডেটা বাঁচে।',
  'settings.dataLink': 'ডেটা ও উৎস দেখো',

  'data.intro': 'অ্যাপের প্রতিটি সংখ্যা কোথা থেকে আসে, এখানে সৎভাবে দেখানো হয়।',
  'data.foods': 'খাবারের সারি',
  'data.verified': 'উৎস থেকে যাচাই করা',
  'data.unverified': 'এখনো যাচাই হয়নি',
  'data.tips': 'পরামর্শ',
  'data.sources': 'উৎস',
  'data.rows': '{n}টি সারি',
  'data.unverifiedNote': 'যাচাই না হওয়া মানগুলো আনুমানিক। অ্যাপে এগুলোর পাশে "যাচাই হয়নি" লেখা থাকে।',
} as const

export type TKey = keyof typeof bn
