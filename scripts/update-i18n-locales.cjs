const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, '..', 'src', 'i18n', 'types.ts');
let typesContent = fs.readFileSync(typesPath, 'utf8');

// Ensure TranslationSchema has landing and other enhanced keys
if (!typesContent.includes('landing?: {')) {
  const landingTypeDefinition = `  landing?: {
    navWhy?: string;
    navActivities?: string;
    navReader?: string;
    navAdaptive?: string;
    navTeam?: string;
    navParentSignIn?: string;
    navInstantDemo?: string;
    badge?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    btnTryDemo?: string;
    btnParentAccess?: string;
    statChildren?: string;
    statLanguages?: string;
    statReadingWin?: string;
    statEvidence?: string;
    interactiveBadge?: string;
    interactiveTitle?: string;
    interactiveSubtitle?: string;
    fontToggle?: string;
    contrastToggle?: string;
    soundToggle?: string;
    adaptiveBadge?: string;
    adaptiveTitle?: string;
    adaptiveSubtitle?: string;
    card1Title?: string;
    card1Desc?: string;
    card2Title?: string;
    card2Desc?: string;
    card3Title?: string;
    card3Desc?: string;
    card4Title?: string;
    card4Desc?: string;
    teamBadge?: string;
    teamTitle?: string;
    teamSubtitle?: string;
    faqBadge?: string;
    faqTitle?: string;
    faqSubtitle?: string;
    rightsAttribution?: string;
    rightsNotice?: string;
    contactTeam?: string;
  };
`;
  const lastBrace = typesContent.lastIndexOf('}');
  typesContent = typesContent.substring(0, lastBrace) + landingTypeDefinition + '}\n';
  fs.writeFileSync(typesPath, typesContent, 'utf8');
  console.log('✓ Updated src/i18n/types.ts with landing definitions');
}

// Translations per language
const landingTranslations = {
  en: {
    navWhy: 'Why DyslexiMate',
    navActivities: 'Curated Activities',
    navReader: 'Interactive Reader',
    navAdaptive: 'Adaptive AI Architecture',
    navTeam: 'Meet Team PINAKA',
    navParentSignIn: 'Parent Sign In',
    navInstantDemo: '🚀 Launch Demo',
    badge: 'AI-POWERED DYSLEXIA LEARNING SYSTEM',
    heroTitle: 'Empowering every child to read with confidence & joy.',
    heroSubtitle: 'Adaptive multisensory journeys, AI phonics coaching, and calm multilingual storytelling crafted for neurodivergent minds.',
    btnTryDemo: 'Launch Instant Demo 🚀',
    btnParentAccess: 'Parent Sign In 🛡️',
    statChildren: '10,000+ Happy Learners',
    statLanguages: '6 Indian Languages',
    statReadingWin: 'Multisensory Phonics',
    statEvidence: 'Evidence-Based Pedagogy',
    interactiveBadge: 'LIVE ACCESSIBILITY LAB',
    interactiveTitle: 'Experience the Interactive Reader',
    interactiveSubtitle: 'Test dyslexia-friendly fonts, letter spacing, audio chimes, and b/d mirror training.',
    fontToggle: 'Dyslexia-Friendly Font (OpenDyslexic)',
    contrastToggle: 'High Contrast Focus',
    soundToggle: 'Celebration Chimes & Sound Effects',
    adaptiveBadge: 'NEURODIVERGENT-FIRST PEDAGOGY',
    adaptiveTitle: 'Built for How Dyslexic Minds Learn',
    adaptiveSubtitle: 'Scientifically validated multisensory methods enhanced with adaptive AI micro-pacing.',
    card1Title: 'Multisensory Phonics',
    card1Desc: 'Visual contours, auditory feedback, and tactile cues combine to cement letter-sound correspondences.',
    card2Title: 'Letter Mirror Training',
    card2Desc: 'Targeted discrimination exercises eliminate b/d, p/q, and m/w confusion through spatial orientation drills.',
    card3Title: 'Calm Story Narration',
    card3Desc: 'Gentle, unhurried female multilingual storytelling models proper cadence and expressive phrasing.',
    card4Title: 'Adaptive AI Pathing',
    card4Desc: 'Continuous micro-assessments adjust challenge difficulty dynamically to ensure success and build self-esteem.',
    teamBadge: 'MEET TEAM PINAKA',
    teamTitle: 'Built with empathy by Team PINAKA.',
    teamSubtitle: 'We are a passionate team dedicated to leveraging technology for educational accessibility, equity, and neurodivergent empowerment.',
    faqBadge: 'COMMONLY ASKED QUESTIONS',
    faqTitle: 'Everything you need to know about DyslexiMate',
    faqSubtitle: 'Clear answers for parents, educators, and reading coaches.',
    rightsAttribution: 'Rights & attribution',
    rightsNotice: '© 2026 Team PINAKA. All rights reserved. The DyslexiMate name, logo, and original app materials may not be copied or redistributed without permission.',
    contactTeam: 'Contact Team PINAKA'
  },
  hi: {
    navWhy: 'डिसलेक्सीमेट क्यों',
    navActivities: 'पसंदीदा गतिविधियाँ',
    navReader: 'इंटरैक्टिव रीडर',
    navAdaptive: 'एडेप्टिव एआई आर्किटेक्चर',
    navTeam: 'टीम पिनाका से मिलें',
    navParentSignIn: 'अभिभावक लॉगिन',
    navInstantDemo: '🚀 डेमो शुरू करें',
    badge: 'एआई-संचालित डिस्लेक्सिया शिक्षण प्रणाली',
    heroTitle: 'हर बच्चे को आत्मविश्वास और आनंद से पढ़ना सिखाना।',
    heroSubtitle: 'न्यूरोडाइवर्जेंट बच्चों के लिए विशेष रूप से डिज़ाइन की गई बहुसंवेदी यात्राएं, एआई फोनिक्स और सौम्य बहुभाषी कहानी पाठ।',
    btnTryDemo: 'तुरंत डेमो शुरू करें 🚀',
    btnParentAccess: 'अभिभावक पोर्टल 🛡️',
    statChildren: '१०,०००+ खुशहाल बच्चे',
    statLanguages: '६ भारतीय भाषाएँ',
    statReadingWin: 'मल्टीसेंसरी फोनिक्स',
    statEvidence: 'प्रमाण-आधारित शिक्षण',
    interactiveBadge: 'लाइव सुलभता प्रयोगशाला',
    interactiveTitle: 'इंटरैक्टिव रीडर का अनुभव करें',
    interactiveSubtitle: 'डिस्लेक्सिया-अनुकूल फॉन्ट, अक्षर अंतराल, ऑडियो चाइम्स और b/d दर्पण अभ्यास का परीक्षण करें।',
    fontToggle: 'डिस्लेक्सिया-अनुकूल फॉन्ट (OpenDyslexic)',
    contrastToggle: 'उच्च कंट्रास्ट फोकस',
    soundToggle: 'उत्साहवर्धक ध्वनियाँ और प्रभाव',
    adaptiveBadge: 'न्यूरोडाइवर्जेंट-प्रथम शिक्षण',
    adaptiveTitle: 'डिस्लेक्सिक दिमाग के सीखने के तरीके पर आधारित',
    adaptiveSubtitle: 'वैज्ञानिक रूप से सिद्ध बहुसंवेदी विधियाँ और एआई अनुकूलन।',
    card1Title: 'बहुसंवेदी फोनिक्स',
    card1Desc: 'दृश्य आकृति, श्रवण प्रतिक्रिया और स्पर्श संकेत मिलकर ध्वनि-अक्षर संबंध को मजबूत करते हैं।',
    card2Title: 'दर्पण अक्षर प्रशिक्षण',
    card2Desc: 'लक्षित भेद अभ्यास b/d, p/q और m/w के भ्रम को दूर करने में मदद करते हैं।',
    card3Title: 'शांत कहानी वाचन',
    card3Desc: 'शांत, स्नेही महिला वाचक की आवाज़ में कहानियाँ जो सही उच्चारण और प्रवाह सिखाती हैं।',
    card4Title: 'अनुकूलनीय एआई पथ',
    card4Desc: 'गतिविधि की कठिनाई को बच्चे की सीखने की गति के अनुसार स्वचालित रूप से समायोजित करता है।',
    teamBadge: 'टीम पिनाका',
    teamTitle: 'टीम पिनाका द्वारा संवेदनशीलता से निर्मित।',
    teamSubtitle: 'हम शैक्षिक सुलभता और न्यूरोडाइवर्जेंट सशक्तिकरण के लिए समर्पित एक उत्साही टीम हैं।',
    faqBadge: 'अक्सर पूछे जाने वाले प्रश्न',
    faqTitle: 'डिसलेक्सीमेट के बारे में महत्वपूर्ण जानकारी',
    faqSubtitle: 'माता-पिता और शिक्षकों के लिए स्पष्ट उत्तर।',
    rightsAttribution: 'अधिकार एवं आभार',
    rightsNotice: '© २०२६ टीम पिनाका। सर्वाधिकार सुरक्षित। डिस्लेक्सीमेट नाम, लोगो और सामग्री बिना अनुमति के पुनः उपयोग नहीं की जा सकती।',
    contactTeam: 'टीम पिनाका से संपर्क करें'
  },
  pa: {
    navWhy: 'ਡਿਸਲੈਕਸੀਮੇਟ ਕਿਉਂ',
    navActivities: 'ਸਿੱਖਣ ਗਤੀਵਿਧੀਆਂ',
    navReader: 'ਇੰਟਰਐਕਟਿਵ ਰੀਡਰ',
    navAdaptive: 'ਅਨੁਕੂਲਿਤ ਏਆਈ ਢਾਂਚਾ',
    navTeam: 'ਟੀਮ ਪਿਨਾਕਾ ਨਾਲ ਮਿਲੋ',
    navParentSignIn: 'ਮਾਪੇ ਲੌਗਇਨ',
    navInstantDemo: '🚀 ਡੈਮੋ ਸ਼ੁਰੂ ਕਰੋ',
    badge: 'ਏਆਈ-ਅਧਾਰਿਤ ਡਿਸਲੈਕਸੀਆ ਸਿੱਖਣ ਪ੍ਰਣਾਲੀ',
    heroTitle: 'ਹਰ ਬੱਚੇ ਨੂੰ ਆਤਮ-ਵਿਸ਼ਵਾਸ ਅਤੇ ਖੁਸ਼ੀ ਨਾਲ ਪੜ੍ਹਨਾ ਸਿਖਾਉਣਾ।',
    heroSubtitle: 'ਨਿਊਰੋਡਾਈਵਰਜੈਂਟ ਬੱਚਿਆਂ ਲਈ ਬਣਾਈਆਂ ਗਈਆਂ ਬਹੁ-ਸੰਵੇਦੀ ਯਾਤਰਾਵਾਂ, ਏਆਈ ਫੋਨਿਕਸ ਕੋਚਿੰਗ ਅਤੇ ਸ਼ਾਂਤ ਬਹੁਭਾਸ਼ਾਈ ਕਹਾਣੀ ਸੁਣਾਉਣਾ।',
    btnTryDemo: 'ਤੁਰੰਤ ਡੈਮੋ ਸ਼ੁਰੂ ਕਰੋ 🚀',
    btnParentAccess: 'ਮਾਪੇ ਪੋਰਟਲ 🛡️',
    statChildren: '੧੦,੦੦੦+ ਖੁਸ਼ ਵਿਦਿਆਰਥੀ',
    statLanguages: '੬ ਭਾਰਤੀ ਭਾਸ਼ਾਵਾਂ',
    statReadingWin: 'ਮਲਟੀਸੈਂਸਰੀ ਫੋਨਿਕਸ',
    statEvidence: 'ਪ੍ਰਮਾਣਿਤ ਸਿੱਖਿਆ ਵਿਗਿਆਨ',
    interactiveBadge: 'ਲਾਈਵ ਪਹੁੰਚਯੋਗਤਾ ਲੈਬ',
    interactiveTitle: 'ਇੰਟਰਐਕਟਿਵ ਰੀਡਰ ਦਾ ਅਨੁਭਵ ਕਰੋ',
    interactiveSubtitle: 'ਡਿਸਲੈਕਸੀਆ-ਅਨੁਕੂਲ ਫੌਂਟ, ਅੱਖਰ ਵਿੱਥ, ਆਡੀਓ ਚਾਈਮਜ਼ ਅਤੇ b/d ਸ਼ੀਸ਼ਾ ਅਭਿਆਸ ਦੀ ਪਰਖ ਕਰੋ।',
    fontToggle: 'ਡਿਸਲੈਕਸੀਆ-ਅਨੁਕੂਲ ਫੌਂਟ (OpenDyslexic)',
    contrastToggle: 'ਹਾਈ ਕੰਟ੍ਰਾਸਟ ਫੋਕਸ',
    soundToggle: 'ਖੁਸ਼ੀ ਵਾਲੀਆਂ ਧੁਨੀਆਂ ਅਤੇ ਪ੍ਰਭਾਵ',
    adaptiveBadge: 'ਨਿਊਰੋਡਾਈਵਰਜੈਂਟ-ਪਹਿਲ ਅਧਿਆਪਨ',
    adaptiveTitle: 'ਡਿਸਲੈਕਸਿਕ ਬੱਚਿਆਂ ਦੇ ਸਿੱਖਣ ਤਰੀਕੇ ਲਈ ਬਣਿਆ',
    adaptiveSubtitle: 'ਵਿਗਿਆਨਕ ਤੌਰ ਤੇ ਪ੍ਰਮਾਣਿਤ ਬਹੁ-ਸੰਵੇਦੀ ਢੰਗ ਅਤੇ ਅਨੁਕੂਲ ਏਆਈ।',
    card1Title: 'ਬਹੁ-ਸੰਵੇਦੀ ਫੋਨਿਕਸ',
    card1Desc: 'ਦਿੱਖ, ਆਵਾਜ਼ ਅਤੇ ਛੋਹ ਦੇ ਸੁਮੇਲ ਨਾਲ ਅੱਖਰਾਂ ਤੇ ਧੁਨੀਆਂ ਦੀ ਸਮਝ ਪੱਕੀ ਕਰੋ।',
    card2Title: 'ਸ਼ੀਸ਼ਾ ਅੱਖਰ ਸਿਖਲਾਈ',
    card2Desc: 'b/d, p/q ਅਤੇ m/w ਵਿੱਚ ਉਲਝਣ ਨੂੰ ਦੂਰ ਕਰਨ ਲਈ ਵਿਸ਼ੇਸ਼ ਅਭਿਆਸ।',
    card3Title: 'ਸ਼ਾਂਤ ਕਹਾਣੀ ਉਚਾਰਨ',
    card3Desc: 'ਮਮਤਾ ਭਰੀ ਔਰਤ ਦੀ ਆਵਾਜ਼ ਵਿੱਚ ਕਹਾਣੀਆਂ ਜੋ ਸ਼ੁੱਧ ਉਚਾਰਨ ਅਤੇ ਸਹੀ ਰਫ਼ਤਾਰ ਸਿਖਾਉਂਦੀਆਂ ਹਨ।',
    card4Title: 'ਅਨੁਕੂਲ ਏਆਈ ਰਾਹ',
    card4Desc: 'ਬੱਚੇ ਦੀ ਤਰੱਕੀ ਅਨੁਸਾਰ ਅਭਿਆਸਾਂ ਦਾ ਪੱਧਰ ਆਪਣੇ-ਆਪ ਤੈਅ ਕਰਦਾ ਹੈ।',
    teamBadge: 'ਟੀਮ ਪਿਨਾਕਾ',
    teamTitle: 'ਟੀਮ ਪਿਨਾਕਾ ਵੱਲੋਂ ਹਮਦਰਦੀ ਨਾਲ ਤਿਆਰ ਕੀਤਾ ਗਿਆ।',
    teamSubtitle: 'ਅਸੀਂ ਸਿੱਖਿਆ ਪਹੁੰਚਯੋਗਤਾ ਅਤੇ ਨਿਊਰੋਡਾਈਵਰਜੈਂਟ ਸਸ਼ਕਤੀਕਰਨ ਲਈ ਸਮਰਪਿਤ ਇੱਕ ਉਤਸ਼ਾਹੀ ਟੀਮ ਹਾਂ।',
    faqBadge: 'ਆਮ ਪੁੱਛੇ ਜਾਂਦੇ ਸਵਾਲ',
    faqTitle: 'ਡਿਸਲੈਕਸੀਮੇਟ ਬਾਰੇ ਸਭ ਕੁਝ ਜਾਣੋ',
    faqSubtitle: 'ਮਾਪਿਆਂ ਅਤੇ ਅਧਿਆਪਕਾਂ ਲਈ ਸਪਸ਼ਟ ਜਵਾਬ।',
    rightsAttribution: 'ਅਧਿਕਾਰ ਅਤੇ ਜ਼ਿੰਮੇਵਾਰੀ',
    rightsNotice: '© ੨੦੨੬ ਟੀਮ ਪਿਨਾਕਾ। ਸਾਰੇ ਹੱਕ ਰਾਖਵੇਂ ਹਨ। ਡਿਸਲੈਕਸੀਮੇਟ ਨਾਮ, ਲੋਗੋ ਅਤੇ ਸਮੱਗਰੀ ਬਿਨਾਂ ਆਗਿਆ ਤੋਂ ਵਰਤੀ ਨਹੀਂ ਜਾ ਸਕਦੀ।',
    contactTeam: 'ਟੀਮ ਪਿਨਾਕਾ ਨਾਲ ਸੰਪਰਕ ਕਰੋ'
  },
  bn: {
    navWhy: 'ডিসলেক্সিমিট কেন',
    navActivities: 'কিউরেটেড কার্যক্রম',
    navReader: 'ইন্টারেক্টিভ রিডার',
    navAdaptive: 'অভিযোজিত এআই আর্কিটেকচার',
    navTeam: 'টিম পিনাকার সাথে পরিচিত হোন',
    navParentSignIn: 'অভিভাবক লগইন',
    navInstantDemo: '🚀 ডেমো শুরু করুন',
    badge: 'এআই-চালিত ডিসলেক্সিয়া শিখন পদ্ধতি',
    heroTitle: 'প্রত্যেক শিশুর মধ্যে আত্মবিশ্বাস ও আনন্দের সাথে পড়ার ক্ষমতা গড়ে তোলা।',
    heroSubtitle: 'নিউরোডাইভারজেন্ট শিশুদের জন্য তৈরি বহুমুখী সংবেদনশীল যাত্রা, এআই ধ্বনিতত্ত্ব কোচিং এবং শান্ত বহুভাষিক গল্প পাঠ।',
    btnTryDemo: 'তাত্ক্ষণিক ডেমো শুরু করুন 🚀',
    btnParentAccess: 'অভিভাবক প্রবেশদ্বার 🛡️',
    statChildren: '১০,০০০+ আনন্দিত শিক্ষার্থী',
    statLanguages: '৬টি ভারতীয় ভাষা',
    statReadingWin: 'মাল্টিসেন্সরি ফোনিক্স',
    statEvidence: 'প্রমাণ-ভিত্তিক শিক্ষাদান',
    interactiveBadge: 'লাইভ অ্যাক্সেসিবিলিটি ল্যাব',
    interactiveTitle: 'ইন্টারেক্টিভ রিডারের অভিজ্ঞতা নিন',
    interactiveSubtitle: 'ডিসলেক্সিয়া-বান্ধব ফন্ট, অক্ষরের ব্যবধান, অডিও চাইমস এবং b/d মিরর অনুশীলনের পরীক্ষা করুন।',
    fontToggle: 'ডিসলেক্সিয়া-বান্ধব ফন্ট (OpenDyslexic)',
    contrastToggle: 'উচ্চ কনট্রাস্ট ফোকাস',
    soundToggle: 'আনন্দদায়ক শব্দ ও প্রতিক্রিয়া',
    adaptiveBadge: 'নিউরোডাইভারজেন্ট-প্রথম শিক্ষাদান',
    adaptiveTitle: 'ডিসলেক্সিক মন যেভাবে শেখে সেভাবেই তৈরি',
    adaptiveSubtitle: 'বৈজ্ঞানিকভাবে প্রমাণিত বহুমুখী সংবেদনশীল পদ্ধতি এবং এআই অভিযোজন।',
    card1Title: 'বহুমুখী সংবেদনশীল ফোনিক্স',
    card1Desc: 'ভিজ্যুয়াল রূপরেখা, অডিও প্রতিক্রিয়া এবং স্পর্শকাতর সংকেত একসাথে বর্ণ ও ধ্বনির সম্পর্ক দৃঢ় করে।',
    card2Title: 'মিরর বর্ণ প্রশিক্ষণ',
    card2Desc: 'b/d, p/q এবং m/w এর বিভ্রান্তি দূর করার জন্য নির্দেশিত অনুশীলন।',
    card3Title: 'শান্ত গল্প কথন',
    card3Desc: 'স্নেহময়ী নারী কণ্ঠে শান্ত গল্প বলা যা সঠিক উচ্চারণ এবং পড়ার ছন্দ শেখায়।',
    card4Title: 'অভিযোজিত এআই পথ',
    card4Desc: 'শিশুর দক্ষতা অনুযায়ী স্বয়ংক্রিয়ভাবে অনুশীলনের কাঠিন্য মানিয়ে নেয়।',
    teamBadge: 'টিম পিনাকা',
    teamTitle: 'টিম পিনাকা দ্বারা সহানুভূতির সাথে নির্মিত।',
    teamSubtitle: 'আমরা শিক্ষাগত অন্তর্ভুক্তি এবং নিউরোডাইভারজেন্ট ক্ষমতায়নে নিবেদিত একটি উদ্যোগী দল।',
    faqBadge: 'সাধারণ প্রশ্নোত্তর',
    faqTitle: 'ডিসলেক্সিমেট সম্পর্কে যা কিছু জানা প্রয়োজন',
    faqSubtitle: 'অভিভাবক এবং শিক্ষকদের জন্য স্পষ্ট উত্তর।',
    rightsAttribution: 'স্বত্বাধিকার ও কৃতজ্ঞতা',
    rightsNotice: '© ২০২৬ টিম পিনাকা। সর্বস্বত্ব সংরক্ষিত। ডিসলেক্সিমিট নাম, লোগো এবং উপাদান অনুমতি ছাড়া ব্যবহার নিষিদ্ধ।',
    contactTeam: 'টিম পিনাকার সাথে যোগাযোগ করুন'
  },
  ta: {
    navWhy: 'டிஸ்லெக்ஸிமேட் ஏன்',
    navActivities: 'பயிற்சி செயல்பாடுகள்',
    navReader: 'ஊடாடும் வாசிப்பாளர்',
    navAdaptive: 'தகவமைப்பு AI கட்டமைப்பு',
    navTeam: 'பினாகா குழுவை சந்திக்கவும்',
    navParentSignIn: 'பெற்றோர் உள்நுழைவு',
    navInstantDemo: '🚀 டெமோவைத் தொடங்கு',
    badge: 'AI-இயங்கும் டிஸ்லெக்ஸியா கற்றல் தளம்',
    heroTitle: 'ஒவ்வொரு குழந்தையும் தன்னம்பிக்கையுடனும் மகிழ்ச்சியுடனும் வாசிக்க உதவுதல்.',
    heroSubtitle: 'நியூரோடைவர்ஜென்ட் குழந்தைகளுக்காக உருவாக்கப்பட்ட பலபுலன் கற்றல், AI ஒலிப்பியல் பயிற்சி மற்றும் அமைதியான பலமொழி கதைசொல்லல்.',
    btnTryDemo: 'உடனடி டெமோவைத் தொடங்கு 🚀',
    btnParentAccess: 'பெற்றோர் தளம் 🛡️',
    statChildren: '10,000+ மகிழ்ச்சியான மாணவர்கள்',
    statLanguages: '6 இந்திய மொழிகள்',
    statReadingWin: 'பலபுலன் ஒலிப்பியல்',
    statEvidence: 'ஆதாரபூர்வ கற்பித்தல் முறை',
    interactiveBadge: 'நேரலை அணுகல் ஆய்வகம்',
    interactiveTitle: 'ஊடாடும் வாசிப்பாளரை அனுபவியுங்கள்',
    interactiveSubtitle: 'டிஸ்லெக்ஸியா-நட்பு எழுத்துருக்கள், இடைவெளிகள், ஒலி விளைவுகள் மற்றும் b/d கண்ணாடிப் பயிற்சிகளை சோதிக்கவும்.',
    fontToggle: 'டிஸ்லெக்ஸியா-நட்பு எழுத்துரு (OpenDyslexic)',
    contrastToggle: 'உயர் மாறுபட்ட காட்சி',
    soundToggle: 'கொண்டாட்ட ஒலிகள் & விளைவுகள்',
    adaptiveBadge: 'நியூரோடைவர்ஜென்ட்-முதல் கற்பித்தல்',
    adaptiveTitle: 'டிஸ்லெக்ஸியா உள்ள குழந்தைகள் கற்கும் முறையில் வடிவமைக்கப்பட்டது',
    adaptiveSubtitle: 'அறிவியல் பூர்வமாக நிரூபிக்கப்பட்ட பலபுலன் கற்பித்தல் மற்றும் AI தகவமைப்பு.',
    card1Title: 'பலபுலன் ஒலிப்பியல்',
    card1Desc: 'பார்வை வடிவங்கள், கேட்டல் மற்றும் தொடுதல் குறிப்புகள் இணைந்து எழுத்து-ஒலி தொடர்பை வலுப்படுத்துகின்றன.',
    card2Title: 'கண்ணாடி எழுத்துப் பயிற்சி',
    card2Desc: 'b/d, p/q மற்றும் m/w குழப்பங்களை தீர்க்க உதவும் இலக்கு நோக்கிய பயிற்சிகள்.',
    card3Title: 'அமைதியான கதை வாசிப்பு',
    card3Desc: 'அமைதியான, அன்பான பெண் குரலில் சரியான உச்சரிப்பு மற்றும் வாசிப்பு லயத்தை கற்றுத்தரும் கதைகள்.',
    card4Title: 'தகவமைப்பு AI கற்றல் பாதை',
    card4Desc: 'குழந்தையின் வேகத்திற்கு ஏற்ப தானாகவே நிலைகளை மாற்றியமைத்து வெற்றியை உறுதி செய்கிறது.',
    teamBadge: 'பினாகா குழு',
    teamTitle: 'பினாகா குழுவினால் பரிவுடன் உருவாக்கப்பட்டது.',
    teamSubtitle: 'கல்வி அணுகல்தன்மை மற்றும் நியூரோடைவர்ஜென்ட் அதிகாரமளித்தலுக்கு அர்ப்பணிக்கப்பட்ட ஒரு ஆர்வமிக்க குழு.',
    faqBadge: 'அடிக்கடி கேட்கப்படும் கேள்விகள்',
    faqTitle: 'டிஸ்லெக்ஸிமேட் பற்றி நீங்கள் தெரிந்து கொள்ள வேண்டியவை',
    faqSubtitle: 'பெற்றோர்கள் மற்றும் ஆசிரியர்களுக்கான தெளிவான பதில்கள்.',
    rightsAttribution: 'உரிமைகள் & குறிப்பு',
    rightsNotice: '© 2026 பினாகா குழு. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை. டிஸ்லெக்ஸிமேட் பெயர், சின்னம் மற்றும் உள்ளடக்கங்களை அனுமதியின்றி பயன்படுத்த முடியாது.',
    contactTeam: 'பினாகா குழுவை தொடர்பு கொள்ளவும்'
  },
  or: {
    navWhy: 'ଡିସଲେକ୍ସିମେଟ୍ କାହିଁକି',
    navActivities: 'ଶିକ୍ଷଣ କାର୍ଯ୍ୟକଳାପ',
    navReader: 'ଇଣ୍ଟରାକ୍ଟିଭ୍ ରିଡର',
    navAdaptive: 'ଅନୁକୂଳ AI ସଂରଚନା',
    navTeam: 'ଟିମ୍ ପିନାକାଙ୍କ ସହ ମିଶନ୍ତୁ',
    navParentSignIn: 'ଅଭିଭାବକ ଲଗଇନ୍',
    navInstantDemo: '🚀 ଡେମୋ ଆରମ୍ଭ କରନ୍ତୁ',
    badge: 'AI-ଚାଳିତ ଡିସଲେକ୍ସିଆ ଶିକ୍ଷଣ ପ୍ରଣାଳୀ',
    heroTitle: 'ପ୍ରତ୍ୟେକ ଶିଶୁକୁ ଆତ୍ମବିଶ୍ୱାସ ଏବଂ ଆନନ୍ଦର ସହିତ ପଢ଼ିବାକୁ ସକ୍ଷମ କରିବା।',
    heroSubtitle: 'ନିଉରୋଡାଇଭରଜେଣ୍ଟ ପିଲାମାନଙ୍କ ପାଇଁ ପ୍ରସ୍ତୁତ ବହୁ-ଇନ୍ଦ୍ରିୟ ଶିକ୍ଷା, AI ଫୋନିକ୍ସ କୋଚିଂ ଏବଂ ଶାନ୍ତ ବହୁଭାଷୀ ଗଳ୍ପ ପାଠ।',
    btnTryDemo: 'ତୁରନ୍ତ ଡେମୋ ଆରମ୍ଭ କରନ୍ତୁ 🚀',
    btnParentAccess: 'ଅଭିଭାବକ ପୋର୍ଟାଲ 🛡️',
    statChildren: '୧୦,୦୦୦+ ଖୁସି ଶିକ୍ଷାର୍ଥୀ',
    statLanguages: '୬ ଟି ଭାରତୀୟ ଭାଷା',
    statReadingWin: 'ମଲ୍ଟିସେନ୍ସରୀ ଫୋନିକ୍ସ',
    statEvidence: 'ପ୍ରମାଣ-ଆଧାରିତ ଶିକ୍ଷାଦାନ',
    interactiveBadge: 'ଲାଇଭ୍ ସୁବିଧା ପରୀକ୍ଷାଗାର',
    interactiveTitle: 'ଇଣ୍ଟରାକ୍ଟିଭ୍ ରିଡରର ଅନୁଭବ ନିଅନ୍ତୁ',
    interactiveSubtitle: 'ଡିସଲେକ୍ସିଆ-ଅନୁକୂଳ ଫଣ୍ଟ, ଅକ୍ଷର ବ୍ୟବଧାନ, ଅଡିଓ ଚାଇମସ୍ ଏବଂ b/d ଦର୍ପଣ ଅଭ୍ୟାସ ପରୀକ୍ଷା କରନ୍ତୁ।',
    fontToggle: 'ଡିସଲେକ୍ସିଆ-ଅନୁକୂଳ ଫଣ୍ଟ (OpenDyslexic)',
    contrastToggle: 'ଉଚ୍ଚ କଣ୍ଟ୍ରାଷ୍ଟ ଧ୍ୟାନ',
    soundToggle: 'ଉତ୍ସାହଜନକ ଧ୍ୱନି ଏବଂ ପ୍ରଭାବ',
    adaptiveBadge: 'ନିଉରୋଡାଇଭରଜେଣ୍ଟ-ପ୍ରଥମ ଶିକ୍ଷାଦାନ',
    adaptiveTitle: 'ଡିସଲେକ୍ସିକ୍ ମନ ଯେପରି ଶିଖେ ସେହିପରି ନିର୍ମିତ',
    adaptiveSubtitle: 'ବୈଜ୍ଞାନିକ ଭାବରେ ପ୍ରମାଣିତ ବହୁ-ଇନ୍ଦ୍ରିୟ ପଦ୍ଧତି ଏବଂ AI ଅନୁକୂଳତା।',
    card1Title: 'ବହୁ-ଇନ୍ଦ୍ରିୟ ଫୋନିକ୍ସ',
    card1Desc: 'ଦୃଶ୍ୟ, ଶ୍ରବଣ ଏବଂ ସ୍ପର୍ଶର ସମନ୍ୱୟରେ ଅକ୍ଷର ଏବଂ ଧ୍ୱନିର ସମ୍ପର୍କ ସୁଦୃଢ଼ ହୁଏ।',
    card2Title: 'ଦର୍ପଣ ଅକ୍ଷର ତାଲିମ',
    card2Desc: 'b/d, p/q ଏବଂ m/w ମଧ୍ୟରେ ଭ୍ରମ ଦୂର କରିବା ପାଇଁ ସ୍ୱତନ୍ତ୍ର ଅଭ୍ୟାସ।',
    card3Title: 'ଶାନ୍ତ ଗଳ୍ପ କଥନ',
    card3Desc: 'ସ୍ନେହମୟୀ ମହିଳା କଣ୍ଠରେ ଶାନ୍ତ ଗଳ୍ପ ପାଠ ଯାହା ସଠିକ୍ ଉଚ୍ଚାରଣ ଏବଂ ପଢ଼ିବାର ପ୍ରବାହ ଶିଖାଏ।',
    card4Title: 'ଅନୁକୂଳ AI ପଥ',
    card4Desc: 'ପିଲାର ଶିଖିବା ଗତି ଅନୁସାରେ କାର୍ଯ୍ୟକଳାପର କଠିନତା ସ୍ୱୟଂଚାଳିତ ଭାବେ ନିୟନ୍ତ୍ରିତ ହୁଏ।',
    teamBadge: 'ଟିମ୍ ପିନାକା',
    teamTitle: 'ଟିମ୍ ପିନାକା ଦ୍ୱାରା ସହାନୁଭୂତିର ସହ ନିର୍ମିତ।',
    teamSubtitle: 'ଆମେ ଶିକ୍ଷାଗତ ସୁଲଭତା ଏବଂ ନିଉରୋଡାଇଭରଜେଣ୍ଟ ସଶକ୍ତୀକରଣ ପାଇଁ ସମର୍ପିତ ଏକ ଉତ୍ସାହୀ ଦଳ।',
    faqBadge: 'ପ୍ରାୟତଃ ପଚରାଯାଉଥିବା ପ୍ରଶ୍ନ',
    faqTitle: 'ଡିସଲେକ୍ସିମେଟ୍ ବିଷୟରେ ଆପଣ ଯାହା ଜାଣିବା ଉଚିତ',
    faqSubtitle: 'ଅଭିଭାବକ ଏବଂ ଶିକ୍ଷକମାନଙ୍କ ପାଇଁ ସ୍ପଷ୍ଟ ଉତ୍ତର।',
    rightsAttribution: 'ଅଧିକାର ଏବଂ କୃତଜ୍ଞତା',
    rightsNotice: '© ୨୦୨୬ ଟିମ୍ ପିନାକା। ସର୍ବସ୍ୱତ୍ୱ ସଂରକ୍ଷିତ। ଡିସଲେକ୍ସିମେଟ୍ ନାମ, ଲୋଗୋ ଏବଂ ବିଷୟବସ୍ତୁ ବିନା ଅନୁମତିରେ ବ୍ୟବହାର ନିଷିଦ୍ଧ।',
    contactTeam: 'ଟିମ୍ ପିନାକାଙ୍କ ସହ ଯୋଗାଯୋଗ କରନ୍ତୁ'
  }
};

// Progress extras (for en, bn, etc.)
const progressExtras = {
  en: {
    practiceTimeCard: 'Practice Time',
    minutesUnit: 'min',
    weekComparison: '+18% from last week',
    wordsMasteredCard: 'Words Mastered',
    wordsUnit: 'words',
    newThisWeek: '12 new this week',
    readingSpeedCard: 'Reading Speed',
    wpmUnit: 'WPM',
    speedProgress: 'Gentle & growing pace',
    readingTrendTitle: 'Daily Reading Activity',
    trendSubtitle: 'Minutes spent in adaptive quests and reading practice',
    fluencyRateTitle: 'Reading Accuracy & Fluency',
    rateSubtitle: 'Overall challenge accuracy across all learning realms',
    recentBadgesTitle: 'Superpower Badges Earned',
    badgesSubtitle: 'Milestones celebrated along your learning path',
    weeklyGoalTitle: 'Weekly Practice Goal',
    weeklyGoalSubtitle: 'Aim for 10 minutes of reading joy each day',
    minutesLeft: '{min} min left to reach this week goal!',
    daysStreak: '{days} Day Reading Streak! 🌟',
    hallOfAchievements: "HALL OF ACHIEVEMENTS · {name}'s Trophy Room",
    trophyRoomTitle: 'Superpowers & Milestone Trophies!',
    hootieCheer: '🦉 Hootie cheers: "Look how far you\'ve come! Every quest you play makes your reading superpowers shine brighter!"',
    starsEarned: '{count} Stars Earned',
    happyPoints: '{count} Happy Points',
    levelsWon: '{count} / 15 Levels Won',
    superpowerTrophies: 'Superpower Trophies',
    superpowerTrophiesDesc: 'Earn medals as you practice letters, sounds, words, and stories across adventure destinations.',
    recentActivity: 'Recent Quest Sessions',
    recentActivityDesc: 'Your latest practice challenges and achievements.',
    wordExplorerTitle: 'Word Explorer',
    wordExplorerDesc: 'Collect decodable words and master new sounds across realms.',
    readingChampionTitle: 'Reading Champion',
    readingChampionDesc: 'Build daily reading habits with active challenge quests.',
    spellingStarTitle: 'Spelling Star',
    spellingStarDesc: 'Reach awesome reading accuracy on challenges and words.',
    soundDetectiveTitle: 'Sound Detective',
    soundDetectiveDesc: 'Solve tricky sound clues in Alphabet Forest & Sound Safari.',
    wordWizardTitle: 'Word Wizard',
    wordWizardDesc: 'Defeat tricky letter traps in Word Wonderland & Spelling Castle.',
    storyRoyaltyTitle: 'Story Royalty',
    storyRoyaltyDesc: 'Conquer Rhyme River and claim the Storybook Kingdom crown.'
  },
  hi: {
    hallOfAchievements: "उपलब्धियों का कक्ष · {name} का ट्रॉफी रूम",
    trophyRoomTitle: 'सुपरपावर्स और मील के पत्थर ट्रॉफी!',
    hootieCheer: '🦉 हूटी प्रोत्साहित करता है: "देखो तुम कितनी दूर आ गए हो! हर गतिविधि तुम्हारी पढ़ने की शक्ति को और चमकाती है!"',
    starsEarned: '{count} सितारे अर्जित',
    happyPoints: '{count} हैप्पी पॉइंट्स',
    levelsWon: '{count} / 15 स्तर जीते',
    superpowerTrophies: 'सुपरपावर ट्रॉफियां',
    superpowerTrophiesDesc: 'विभिन्न साहसिक स्थलों पर अक्षरों, ध्वनियों, शब्दों और कहानियों का अभ्यास करके पदक अर्जित करें।',
    recentActivity: 'हालिया अभ्यास सत्र',
    recentActivityDesc: 'आपकी नवीनतम चुनौतियाँ और उपलब्धियाँ।',
    wordExplorerTitle: 'शब्द खोजकर्ता',
    wordExplorerDesc: 'नए शब्दों को एकत्रित करें और विभिन्न लोकों में ध्वनियों पर महारत हासिल करें।',
    readingChampionTitle: 'पठन चैंपियन',
    readingChampionDesc: 'दैनिक चुनौतियों के साथ नियमित रूप से पढ़ने की आदत बनाएं।',
    spellingStarTitle: 'वर्तनी सितारा',
    spellingStarDesc: 'अभ्यासों और शब्दों में शानदार सटीकता प्राप्त करें।',
    soundDetectiveTitle: 'ध्वनि जासूस',
    soundDetectiveDesc: 'अल्फाबेट फॉरेस्ट और साउंड सफारी में पेचीदा ध्वनि सुराग हल करें।',
    wordWizardTitle: 'शब्द जादूगर',
    wordWizardDesc: 'वर्ड वंडरलैंड और स्पेलिंग कैसल में कठिन अक्षरों की पहेलियाँ सुलझाएं।',
    storyRoyaltyTitle: 'कहानी सम्राट',
    storyRoyaltyDesc: 'राइम रिवर को पार करें और स्टोरीबुक किंगडम का मुकुट हासिल करें।'
  },
  pa: {
    hallOfAchievements: "ਪ੍ਰਾਪਤੀਆਂ ਦਾ ਹਾਲ · {name} ਦਾ ਟਰਾਫੀ ਰੂਮ",
    trophyRoomTitle: 'ਸੁਪਰਪਾਵਰਾਂ ਅਤੇ ਪ੍ਰਾਪਤੀਆਂ ਦੀਆਂ ਟਰਾਫੀਆਂ!',
    hootieCheer: '🦉 ਹੂਟੀ ਉਤਸ਼ਾਹਿਤ ਕਰਦਾ ਹੈ: "ਦੇਖੋ ਤੁਸੀਂ ਕਿੰਨੀ ਦੂਰ ਆ ਗਏ ਹੋ! ਹਰ ਖੋਜ ਤੁਹਾਡੀ ਪੜ੍ਹਨ ਸ਼ਕਤੀ ਨੂੰ ਹੋਰ ਚਮਕਾਉਂਦੀ ਹੈ!"',
    starsEarned: '{count} ਤਾਰੇ ਪ੍ਰਾਪਤ ਕੀਤੇ',
    happyPoints: '{count} ਹੈਪੀ ਪੁਆਇੰਟਸ',
    levelsWon: '{count} / 15 ਪੜਾਅ ਜਿੱਤੇ',
    superpowerTrophies: 'ਸੁਪਰਪਾਵਰ ਟਰਾਫੀਆਂ',
    superpowerTrophiesDesc: 'ਅੱਖਰਾਂ, ਧੁਨੀਆਂ, ਸ਼ਬਦਾਂ ਅਤੇ ਕਹਾਣੀਆਂ ਦਾ ਅਭਿਆਸ ਕਰਕੇ ਮੈਡਲ ਜਿੱਤੋ।',
    recentActivity: 'ਹਾਲੀਆ ਅਭਿਆਸ ਸੈਸ਼ਨ',
    recentActivityDesc: 'ਤੁਹਾਡੀਆਂ ਨਵੀਆਂ ਚੁਣੌਤੀਆਂ ਅਤੇ ਪ੍ਰਾਪਤੀਆਂ।',
    wordExplorerTitle: 'ਸ਼ਬਦ ਖੋਜੀ',
    wordExplorerDesc: 'ਨਵੇਂ ਸ਼ਬਦ ਇਕੱਠੇ ਕਰੋ ਅਤੇ ਵੱਖ-ਵੱਖ ਖੇਤਰਾਂ ਵਿੱਚ ਧੁਨੀਆਂ ਸਿੱਖੋ।',
    readingChampionTitle: 'ਪੜ੍ਹਨ ਚੈਂਪੀਅਨ',
    readingChampionDesc: 'ਰੋਜ਼ਾਨਾ ਚੁਣੌਤੀਆਂ ਨਾਲ ਪੜ੍ਹਨ ਦੀਆਂ ਆਦਤਾਂ ਬਣਾਓ।',
    spellingStarTitle: 'ਸਪੈਲਿੰਗ ਸਟਾਰ',
    spellingStarDesc: 'ਚੁਣੌਤੀਆਂ ਅਤੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਸ਼ਾਨਦਾਰ ਸ਼ੁੱਧਤਾ ਪ੍ਰਾਪਤ ਕਰੋ।',
    soundDetectiveTitle: 'ਧੁਨੀ ਜਾਸੂਸ',
    soundDetectiveDesc: 'ਅਲਫਾਬੇਟ ਫੋਰੈਸਟ ਅਤੇ ਸਾਊਂਡ ਸਫਾਰੀ ਵਿੱਚ ਗੁੰਝਲਦਾਰ ਆਵਾਜ਼ਾਂ ਦੇ ਸੁਰਾਗ ਹੱਲ ਕਰੋ।',
    wordWizardTitle: 'ਸ਼ਬਦ ਜਾਦੂਗਰ',
    wordWizardDesc: 'ਵਰਡ ਵੰਡਰਲੈਂਡ ਅਤੇ ਸਪੈਲਿੰਗ ਕੈਸਲ ਵਿੱਚ ਔਖੇ ਅੱਖਰਾਂ ਨੂੰ ਜਿੱਤੋ।',
    storyRoyaltyTitle: 'ਕਹਾਣੀ ਬਾਦਸ਼ਾਹ',
    storyRoyaltyDesc: 'ਰਾਈਮ ਰਿਵਰ ਨੂੰ ਪਾਰ ਕਰੋ ਅਤੇ ਸਟੋਰੀਬੁੱਕ ਕਿੰਗਡਮ ਦਾ ਤਾਜ ਹਾਸਲ ਕਰੋ।'
  },
  bn: {
    practiceTimeCard: 'অনুশীলনের সময়',
    minutesUnit: 'মিনিট',
    weekComparison: 'গত সপ্তাহের চেয়ে +১৮%',
    wordsMasteredCard: 'আয়ত্ত করা শব্দ',
    wordsUnit: 'শব্দ',
    newThisWeek: 'এই সপ্তাহে ১২টি নতুন',
    readingSpeedCard: 'পড়ার গতি',
    wpmUnit: 'শব্দ/মিনিট',
    speedProgress: 'শান্ত ও ক্রমবর্ধমান গতি',
    readingTrendTitle: 'দৈনিক পড়ার কার্যক্রম',
    trendSubtitle: 'অভিযোজিত পাঠ এবং পড়ার অনুশীলনে ব্যয় করা সময়',
    fluencyRateTitle: 'পড়ার নির্ভুলতা ও সাবলীলতা',
    rateSubtitle: 'সমস্ত শিখন ক্ষেত্রে সামগ্রিক অনুশীলনের নির্ভুলতা',
    recentBadgesTitle: 'অর্জিত সুপারপাওয়ার ব্যাজ',
    badgesSubtitle: 'আপনার শিখন পথের মাইলফলক উদযাপন',
    weeklyGoalTitle: 'সাপ্তাহিক অনুশীলনের লক্ষ্য',
    weeklyGoalSubtitle: 'প্রতিদিন ১০ মিনিট পড়ার আনন্দ উপভোগ করুন',
    minutesLeft: 'সাপ্তাহিক লক্ষ্যে পৌঁছাতে আর {min} মিনিট বাকি!',
    daysStreak: '{days} দিনের নিয়মিত পড়ার রেকর্ড! 🌟',
    hallOfAchievements: "কৃতিত্বের দরবার · {name} এর ট্রফি রুম",
    trophyRoomTitle: 'সুপারপাওয়ার এবং মাইলফলক ট্রফি!',
    hootieCheer: '🦉 হুটি উৎসাহিত করছে: "দেখো তুমি কতদূর এগিয়ে এসেছ! প্রতিটি অনুশীলন তোমার পড়ার শক্তিকে আরও উজ্জ্বল করে তোলে!"',
    starsEarned: '{count}টি তারকা অর্জিত',
    happyPoints: '{count} হ্যাপি পয়েন্টস',
    levelsWon: '{count} / ১৫টি স্তর জয়ী',
    superpowerTrophies: 'সুপারপাওয়ার ট্রফি',
    superpowerTrophiesDesc: 'বর্ণ, ধ্বনি, শব্দ এবং গল্পের অনুশীলনের মাধ্যমে পদক অর্জন করুন।',
    recentActivity: 'সাম্প্রতিক অনুশীলন সেশন',
    recentActivityDesc: 'আপনার সর্বশেষ চ্যালেঞ্জ এবং অর্জন।',
    wordExplorerTitle: 'শব্দ অভিযাত্রী',
    wordExplorerDesc: 'নতুন শব্দ সংগ্রহ করুন এবং বিভিন্ন রাজ্যে ধ্বনি আয়ত্ত করুন।',
    readingChampionTitle: 'পড়ার চ্যাম্পিয়ন',
    readingChampionDesc: 'দৈনিক চ্যালেঞ্জের মাধ্যমে নিয়মিত পড়ার অভ্যাস গড়ে তুলুন।',
    spellingStarTitle: 'বানান তারকা',
    spellingStarDesc: 'চ্যালেঞ্জ এবং শব্দে অসাধারণ নির্ভুলতা অর্জন করুন।',
    soundDetectiveTitle: 'ধ্বনি গোয়েন্দা',
    soundDetectiveDesc: 'অ্যালফাবেট ফরেস্ট এবং সাউন্ড সাফারিতে জটিল শব্দের সূত্র সমাধান করুন।',
    wordWizardTitle: 'শব্দ জাদুকর',
    wordWizardDesc: 'ওয়ার্ড ওয়ান্ডারল্যান্ড এবং স্পেলিং ক্যাসেলে কঠিন অক্ষরের ধাঁধা সমাধান করুন।',
    storyRoyaltyTitle: 'গল্পের রাজা',
    storyRoyaltyDesc: 'রাইম রিভার জয় করুন এবং স্টোরিবুক কিংডমের মুকুট অর্জন করুন।'
  },
  ta: {
    hallOfAchievements: "சாதனைக் கூடம் · {name} இன் கோப்பை அறை",
    trophyRoomTitle: 'சூப்பர் பவர் மற்றும் மைல்கல் கோப்பைகள்!',
    hootieCheer: '🦉 ஹூட்டி பாராட்டுகிறது: "நீங்கள் எவ்வளவு தூரம் முன்னேறி இருக்கிறீர்கள் பாருங்கள்! ஒவ்வொரு பயிற்சியும் உங்கள் வாசிப்புத் திறனை மெருகேற்றுகிறது!"',
    starsEarned: '{count} நட்சத்திரங்கள் பெறப்பட்டன',
    happyPoints: '{count} மகிழ்ச்சி புள்ளிகள்',
    levelsWon: '{count} / 15 நிலைகள் வென்றன',
    superpowerTrophies: 'சூப்பர் பவர் கோப்பைகள்',
    superpowerTrophiesDesc: 'எழுத்துக்கள், ஒலிகள், சொற்கள் மற்றும் கதைகளைப் பயிற்சி செய்து பதக்கங்களை வெல்லுங்கள்.',
    recentActivity: 'சமீபத்திய பயிற்சி அமர்வுகள்',
    recentActivityDesc: 'உங்கள் சமீபத்திய சவால்கள் மற்றும் சாதனைகள்.',
    wordExplorerTitle: 'சொல் ஆராய்ச்சியாளர்',
    wordExplorerDesc: 'புதிய சொற்களைச் சேகரித்து பல பகுதிகளில் புதிய ஒலிகளில் தேர்ச்சி பெறுங்கள்.',
    readingChampionTitle: 'வாசிப்பு வெற்றியாளர்',
    readingChampionDesc: 'தினசரி சவால்கள் மூலம் வழக்கமான வாசிப்புப் பழக்கத்தை வளர்த்துக் கொள்ளுங்கள்.',
    spellingStarTitle: 'எழுத்துப்பிழை விண்மீன்',
    spellingStarDesc: 'சவால்கள் மற்றும் சொற்களில் சிறந்த துல்லியத்தைப் பெறுங்கள்.',
    soundDetectiveTitle: 'ஒலித் துப்பறியாளர்',
    soundDetectiveDesc: 'ஆல்ஃபபெட் ஃபாரஸ்ட் மற்றும் சவுண்ட் சஃபாரியில் தந்திரமான ஒலித் தடயங்களைத் தீர்க்கவும்.',
    wordWizardTitle: 'சொல் மந்திரவாதி',
    wordWizardDesc: 'வேர்ட் வொண்டர்லேண்ட் மற்றும் ஸ்பெல்லிங் கேஸிலில் கடினமான எழுத்துப் புதிர்களை வெல்லுங்கள்.',
    storyRoyaltyTitle: 'கதை அரசர்',
    storyRoyaltyDesc: 'ரைம் நதியை வென்று ஸ்டோரிபுக் கிங்டத்தின் கிரீடத்தைப் பெறுங்கள்.'
  },
  or: {
    hallOfAchievements: "ସଫଳତା କକ୍ଷ · {name}ଙ୍କ ଟ୍ରଫି ରୁମ୍",
    trophyRoomTitle: 'ସୁପରପାୱାର ଏବଂ ସଫଳତାର ଟ୍ରଫି!',
    hootieCheer: '🦉 ହୁଟି ଉତ୍ସାହିତ କରୁଛି: "ଦେଖ ତୁମେ କେତେ ଆଗକୁ ଆସିଛ! ପ୍ରତ୍ୟେକ କାର୍ଯ୍ୟ ତୁମର ପଢ଼ିବା ଶକ୍ତିକୁ ଆହୁରି ଉଜ୍ଜ୍ୱଳ କରୁଛି!"',
    starsEarned: '{count} ତାରକା ଅର୍ଜିତ',
    happyPoints: '{count} ହାପି ପଏଣ୍ଟସ୍',
    levelsWon: '{count} / 15 ସ୍ତର ଜିତିଛନ୍ତି',
    superpowerTrophies: 'ସୁପରପାୱାର ଟ୍ରଫି',
    superpowerTrophiesDesc: 'ଅକ୍ଷର, ଧ୍ୱନି, ଶବ୍ଦ ଏବଂ ଗଳ୍ପ ଅଭ୍ୟାସ କରି ପଦକ ହାସଲ କରନ୍ତୁ।',
    recentActivity: 'ସାମ୍ପ୍ରତିକ ଅଭ୍ୟାସ ସେସନ୍',
    recentActivityDesc: 'ଆପଣଙ୍କର ନୂତନ ଚ୍ୟାଲେଞ୍ଜ ଏବଂ ସଫଳତା।',
    wordExplorerTitle: 'ଶବ୍ଦ ଅନୁସନ୍ଧାନକାରୀ',
    wordExplorerDesc: 'ନୂଆ ଶବ୍ଦ ସଂଗ୍ରହ କରନ୍ତୁ ଏବଂ ବିଭିନ୍ନ କ୍ଷେତ୍ରରେ ଧ୍ୱନି ଶିଖନ୍ତୁ।',
    readingChampionTitle: 'ପଠନ ଚାମ୍ପିଅନ୍',
    readingChampionDesc: 'ଦୈନନ୍ଦିନ ଚ୍ୟାଲେଞ୍ଜ ସହିତ ନିୟମିତ ପଢ଼ିବା ଅଭ୍ୟାସ ଗଢ଼ି ତୋଳନ୍ତୁ।',
    spellingStarTitle: 'ବନାନ ତାରକା',
    spellingStarDesc: 'ଚ୍ୟାଲେଞ୍ଜ ଏବଂ ଶବ୍ଦଗୁଡ଼ିକରେ ଉତ୍କୃଷ୍ଟ ସଠିକତା ହାସଲ କରନ୍ତୁ।',
    soundDetectiveTitle: 'ଧ୍ୱନି ଗୋଇନ୍ଦା',
    soundDetectiveDesc: 'ଆଲଫାବେଟ୍ ଫରେଷ୍ଟ ଏବଂ ସାଉଣ୍ଡ ସଫାରିରେ କଠିନ ଧ୍ୱନି ସୁରାକ ସମାଧାନ କରନ୍ତୁ।',
    wordWizardTitle: 'ଶବ୍ଦ ଯାଦୁକର',
    wordWizardDesc: 'ୱାର୍ଡ ୱାଣ୍ଡରଲ୍ୟାଣ୍ଡ ଏବଂ ସ୍ପେଲିଂ କ୍ୟାସଲରେ ଜଟିଳ ଅକ୍ଷର ପହେଳି ସମାଧାନ କରନ୍ତୁ।',
    storyRoyaltyTitle: 'ଗଳ୍ପ ସମ୍ରାଟ',
    storyRoyaltyDesc: 'ରାଇମ୍ ନଦୀ ପାର କରି ଷ୍ଟୋରିବୁକ୍ କିଙ୍ଗଡମର ମୁକୁଟ ହାସଲ କରନ୍ତୁ।'
  }
};

// Parent extras (for en, bn, etc.)
const parentExtras = {
  en: {
    timeSpentToday: 'Time Spent Today',
    wordsLearnedTotal: 'Total Words Mastered',
    soundSettingsTitle: 'Audio & Accessibility Settings',
    soundEffectsToggle: 'Enable celebration sound effects & chimes',
    readAloudToggle: 'Auto read story passages aloud',
    dyslexicFontToggle: 'Use Dyslexia-Friendly OpenDyslexic font',
    saveSettingsBtn: 'Save Settings',
    settingsSavedSuccess: 'Settings saved successfully! 🌟'
  },
  bn: {
    timeSpentToday: 'আজকে অনুশীলনের সময়',
    wordsLearnedTotal: 'মোট আয়ত্ত করা শব্দ',
    soundSettingsTitle: 'অডিও ও সুগম্যতার সেটিংস',
    soundEffectsToggle: 'উৎসবের শব্দ ও প্রতিক্রিয়া সক্রিয় করুন',
    readAloudToggle: 'গল্পের অনুচ্ছেদ স্বয়ংক্রিয়ভাবে পড়ে শোনান',
    dyslexicFontToggle: 'ডিসলেক্সিয়া-বান্ধব OpenDyslexic ফন্ট ব্যবহার করুন',
    saveSettingsBtn: 'সেটিংস সংরক্ষণ করুন',
    settingsSavedSuccess: 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে! 🌟'
  }
};

// Update each locale file
const locales = ['en', 'hi', 'pa', 'bn', 'ta', 'or'];

for (const lang of locales) {
  const filePath = path.join(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.ts`);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix auth missing keys in or, pa, ta
  if (!content.includes('noAccount:')) {
    const noAccountText = lang === 'or' ? "କୌଣସି ଆକାଉଣ୍ଟ୍ ନାହିଁ କି? ନୂଆ ଖାତା ଖୋଲନ୍ତୁ"
      : lang === 'pa' ? "ਕੀ ਕੋਈ ਖਾਤਾ ਨਹੀਂ ਹੈ? ਨਵਾਂ ਖਾਤਾ ਬਣਾਓ"
      : lang === 'ta' ? "கணக்கு இல்லையா? புதிய கணக்கை உருவாக்கவும்"
      : "Don't have an account? Sign up";
    content = content.replace(/errAuthFailed:[^\n]+/, (m) => `${m}\n      noAccount: '${noAccountText}',`);
  }

  if (!content.includes('hasAccount:')) {
    const hasAccountText = lang === 'or' ? "ପୂର୍ବରୁ ଆକାଉଣ୍ଟ୍ ଅଛି କି? ଲଗଇନ୍ କରନ୍ତୁ"
      : lang === 'pa' ? "ਪਹਿਲਾਂ ਹੀ ਖਾਤਾ ਹੈ? ਲੌਗਇਨ ਕਰੋ"
      : lang === 'ta' ? "ஏற்கனவே கணக்கு உள்ளதா? உள்நுழையவும்"
      : "Already have an account? Sign in";
    content = content.replace(/errTermsRequired:[^\n]+/, (m) => `${m}\n      hasAccount: '${hasAccountText}',`);
  }

  // Add landing section if not present
  if (!content.includes('landing: {') && landingTranslations[lang]) {
    const landingObj = landingTranslations[lang];
    const landingLines = Object.entries(landingObj)
      .map(([k, v]) => `    ${k}: ${JSON.stringify(v)},`)
      .join('\n');
    const landingStr = `  landing: {\n${landingLines}\n  },\n`;
    
    // Insert before closing };
    const lastBrace = content.lastIndexOf('};');
    content = content.substring(0, lastBrace) + landingStr + '};\n';
  }

  // Add progress extras if available
  if (progressExtras[lang]) {
    for (const [k, v] of Object.entries(progressExtras[lang])) {
      if (!content.includes(`${k}:`)) {
        // Insert inside progress: {
        content = content.replace(/progress:\s*\{/, `progress: {\n    ${k}: ${JSON.stringify(v)},`);
      }
    }
  }

  // Add parent extras if available
  if (parentExtras[lang]) {
    for (const [k, v] of Object.entries(parentExtras[lang])) {
      if (!content.includes(`${k}:`)) {
        // Insert inside parent: {
        content = content.replace(/parent:\s*\{/, `parent: {\n    ${k}: ${JSON.stringify(v)},`);
      }
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Updated ${lang}.ts`);
}

console.log('✓ All locales updated successfully!');
