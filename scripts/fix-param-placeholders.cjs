const fs = require('fs');
const path = require('path');

const updates = {
  hi: {
    'progress.daysStreak': '{days} दिनों का पठन सिलसिला चालू है 🔥',
    'progress.minutesLeft': 'लक्ष्य से केवल {min} मिनट दूर!',
    'childModal.editSub': '{name} के लिए कक्षा, भाषा या सुगमता सेटिंग्स अपडेट करें',
    'childModal.deleteSub': '{name} की सभी प्रगति और उपलब्धियाँ हमेशा के लिए हटा दी जाएंगी।',
  },
  pa: {
    'nav.streakDays': '{count} ਦਿਨਾਂ ਦੀ ਲੜੀ',
    'home.storiesIndiaDesc': '{lang} ਵਿੱਚ ਭਾਰਤ ਭਰ ਦੀਆਂ ਲੋਕ-ਕਥਾਵਾਂ ਅਤੇ ਦਿਲਚਸਪ ਸਫ਼ਰ ਪੜ੍ਹੋ।',
    'home.streak': '{count} ਦਿਨਾਂ ਦੀ ਲੜੀ',
    'progress.daysStreak': '{days} ਦਿਨਾਂ ਦੀ ਪੜ੍ਹਨ ਲੜੀ ਜਾਰੀ ਹੈ 🔥',
    'progress.minutesLeft': 'ਟੀਚੇ ਤੋਂ ਸਿਰਫ਼ {min} ਮਿੰਟ ਦੂਰ!',
    'childModal.editSub': '{name} ਲਈ ਜਮਾਤ, ਭਾਸ਼ਾ ਜਾਂ ਪਹੁੰਚਯੋਗਤਾ ਸੈਟਿੰਗਾਂ ਅੱਪਡੇਟ ਕਰੋ',
    'childModal.deleteSub': '{name} ਦੀ ਸਾਰੀ ਤਰੱਕੀ ਅਤੇ ਪ੍ਰਾਪਤੀਆਂ ਪੱਕੇ ਤੌਰ ਤੇ ਹਟਾ ਦਿੱਤੀਆਂ ਜਾਣਗੀਆਂ।',
    'profileSelect.welcomeMsg': 'ਜੀ ਆਇਆਂ ਨੂੰ, {name}! ਅੱਜ ਕੌਣ ਸਿੱਖ ਰਿਹਾ ਹੈ?',
    'profileSelect.welcome': 'ਜੀ ਆਇਆਂ ਨੂੰ, {name}! ਅੱਜ ਕੌਣ ਸਿੱਖ ਰਿਹਾ ਹੈ?',
  },
  bn: {
    'progress.daysStreak': '{days} দিনের নিয়মিত পড়ার রেকর্ড! 🌟',
    'progress.minutesLeft': 'লক্ষ্য থেকে মাত্র {min} মিনিট দূরে!',
    'childModal.editSub': '{name} এর জন্য শ্রেণি, ভাষা বা অ্যাক্সেસિবিলিটি সেটিংস আপডেট করুন',
    'childModal.deleteSub': '{name} এর সমস্ত অগ্রগতি এবং অর্জন স্থায়ীভাবে মুছে ফেলা হবে।',
  },
  ta: {
    'nav.streakDays': '{count} நாட்கள் தொடர்',
    'home.storiesIndiaDesc': '{lang} மொழியில் இந்தியாவின் நாட்டுப்புறக் கதைகளும் வாசியுங்கள்.',
    'home.streak': '{count} நாட்கள் தொடர்',
    'progress.daysStreak': '{days} நாட்கள் தொடர் வாசிப்பு தொடர்கிறது 🔥',
    'progress.minutesLeft': 'இலக்கை அடைய இன்னும் {min} நிமிடங்களே!',
    'childModal.editSub': '{name}க்கான வகுப்பு, மொழி அல்லது அணுகல்தன்மை அமைப்புகளைப் புதுப்பிக்கவும்',
    'childModal.deleteSub': '{name}வின் அனைத்து முன்னேற்றங்களும் சாதனைகளும் நிரந்தரமாக நீக்கப்படும்.',
    'profileSelect.welcomeMsg': 'மீண்டும் வருக, {name}! இன்று யார் கற்கிறார்கள்?',
    'profileSelect.welcome': 'மீண்டும் வருக, {name}! இன்று யார் கற்கிறார்கள்?',
    'activity.preparingDesc': '{name}க்காக {title} பயிற்சியைத் தயார் செய்கிறோம்…',
    'activity.completedDesc': '{title} பயிற்சியில் சிறந்த முயற்சி! ஒவ்வொரு பயிற்சியும் உங்கள் வாசிப்புத் திறனை வளர்க்கும்.',
    'voice.noNativeVoice': '{lang} மொழிக்கான உள்ளூர் குரல் எதுவும் கிடைக்கவில்லை',
  },
  or: {
    'nav.streakDays': '{count} ଦିନର ଧାରାବାହିକତା',
    'home.storiesIndiaDesc': '{lang} ରେ ଭାରତର ବିଭିନ୍ନ ପ୍ରାନ୍ତର ଲୋକକଥା ଏବଂ ରୋମାଞ୍ଚକର ଗଳ୍ପ ପଢ଼ନ୍ତୁ।',
    'home.streak': '{count} ଦିନର ଧାରାବାହିକତା',
    'progress.daysStreak': '{days} ଦିନର ପଠନ ଧାରାବାହିକତା ଚାଲୁ ରହିଛି 🔥',
    'progress.minutesLeft': 'ଲକ୍ଷ୍ୟ ହାସଲ ପାଇଁ ମାତ୍ର {min} ମିନିଟ୍ ବାକି!',
    'childModal.editSub': '{name} ପାଇଁ ଶ୍ରେଣୀ, ଭାଷା କିମ୍ବା ସୁଗମତା ସେଟିଙ୍ଗସ୍ ଅପଡେଟ୍ କରନ୍ତୁ',
    'childModal.deleteSub': '{name}ଙ୍କ ସମସ୍ତ ଅଗ୍ରଗତି ଏବଂ ସଫଳତା ସବୁଦିନ ପାଇଁ ଲିଭିଯିବ।',
    'profileSelect.welcomeMsg': 'ସ୍ୱାଗତ, {name}! ଆଜି କିଏ ପଢ଼ିବାକୁ ଯାଉଛି?',
    'profileSelect.welcome': 'ସ୍ୱାଗତ, {name}! ଆଜି କିଏ ପଢ଼ିବାକୁ ଯାଉଛି?',
    'activity.preparingDesc': '{name}ଙ୍କ ପାଇଁ {title} ପ୍ରସ୍ତୁତ କରାଯାଉଛି…',
    'activity.completedDesc': '{title} ରେ ଉତ୍ତମ ପ୍ରୟାସ! ପ୍ରତ୍ୟେକ ଅଭ୍ୟାସ ଆପଣଙ୍କ ପଠନ ଶକ୍ତି ବୃଦ୍ଧି କରେ।',
    'voice.noNativeVoice': '{lang} ଭାଷା ପାଇଁ କୌଣସି ସ୍ଥାନୀୟ ସ୍ୱର ମିଳିଲା ନାହିଁ',
  }
};

for (const [lang, map] of Object.entries(updates)) {
  const filePath = path.resolve(__dirname, `../src/i18n/locales/${lang}.ts`);
  let content = fs.readFileSync(filePath, 'utf-8');

  for (const [k, newVal] of Object.entries(map)) {
    const keyName = k.split('.').pop();
    // Regex to match `keyName: '...',` or `keyName: "...",`
    const regex = new RegExp(`(${keyName}\\s*:\\s*)(['"][^'"]*['"])`, 'g');
    content = content.replace(regex, `$1${JSON.stringify(newVal)}`);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated placeholders in ${lang}.ts`);
}

console.log('✓ All placeholders synchronized.');
