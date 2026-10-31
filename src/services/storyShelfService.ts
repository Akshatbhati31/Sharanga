import type { SupportedLanguage } from '../types/auth';

export interface StoryQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StoryPassage {
  id: string;
  title: string;
  synopsis: string;
  emoji: string;
  readingLevel: 'early' | 'growing' | 'confident';
  estimatedMinutes: number;
  paragraphs: string[];
  comprehensionQuestions: StoryQuestion[];
}

export class StoryShelfService {
  private static instance: StoryShelfService;
  private rotationOffsets: Record<string, number> = {};

  private readonly stories: Record<SupportedLanguage, StoryPassage[]> = {
    English: [
      {
        id: 'story_kite_en',
        title: 'Sunny and the Brave Little Kite',
        synopsis: 'Sunny learns how patience and steady running help her kite catch the gentle afternoon breeze.',
        emoji: '🪁',
        readingLevel: 'early',
        estimatedMinutes: 3,
        paragraphs: [
          'One breezy afternoon, Sunny carried her bright crimson kite up the grassy hilltop. The grass rippled like green ocean waves under the cool autumn wind. Sunny held the wooden spool tightly, feeling the tug of the string in her hands.',
          'At first, the little kite dipped and wobbled near the wild daisies. It tumbled onto the soft clover twice. Sunny took a calm, deep breath. She remembered what her grandfather had told her: “Kites do not fly on worry; they fly when you run with steady feet and a trusting heart.”',
          'Sunny loosened the twine and began to jog toward the sunlit ridge. As she quickened her pace, a sudden swirl of wind caught the red diamonds. The kite lifted smoothly past the treetops, dancing high into the clear blue sky. Sunny laughed with delight as her friends cheered from the meadow below.',
        ],
        comprehensionQuestions: [
          {
            id: 'q_kite_1',
            question: 'Why did Sunny’s kite wobble and touch the clover at first?',
            options: ['The wind had not caught its sails yet', 'The string was completely broken', 'It was raining heavily on the hill'],
            correctIndex: 0,
            explanation: 'The kite needed Sunny to run with steady feet so the wind could catch its sails.',
          },
          {
            id: 'q_kite_2',
            question: 'What helped Sunny succeed when she tried again?',
            options: ['Taking a deep breath and running with steady feet', 'Throwing the kite onto the rocks', 'Giving up and leaving the spool behind'],
            correctIndex: 0,
            explanation: 'Sunny remembered her grandfather’s advice, took a deep breath, and ran with steady rhythm.',
          },
        ],
      },
      {
        id: 'story_mina_en',
        title: 'Mina and the River Rescue',
        synopsis: 'A kind young elephant uses her strength and clever thinking to help a baby bird by the rushing river.',
        emoji: '🐘',
        readingLevel: 'growing',
        estimatedMinutes: 4,
        paragraphs: [
          'The monsoon had filled the forest stream until the water rushed silver and loud over the river stones. Mina, a gentle young elephant with soft amber eyes, loved bathing her dusty knees in the shallows.',
          'While scooping cool water with her trunk, Mina heard a frantic, high-pitched chirp. Near a slippery boulder, a little sparrow flapped its wet wings. Its woven grass nest had tumbled down from the wild fig branch and now teetered on the edge of the swelling current.',
          'Mina moved deliberately so she would not splash the frightened nestling. She searched the bank and discovered a fallen bamboo pole. Balancing the hollow stalk across her curved tusks, she nudged the nest backward onto safe, dry moss. The mother bird fluttered down with happy chirps. Mina smiled, knowing that kindness is strongest when shared quietly.',
        ],
        comprehensionQuestions: [
          {
            id: 'q_mina_1',
            question: 'What problem did Mina discover near the rushing river?',
            options: ['A baby bird’s nest was teetering near the river current', 'A hungry crocodile was stuck on the rocks', 'Her wooden bridge was completely washed away'],
            correctIndex: 0,
            explanation: 'Mina noticed a little sparrow’s nest that had tumbled near the rushing water.',
          },
          {
            id: 'q_mina_2',
            question: 'How did Mina safely move the nest away from danger?',
            options: ['She used a fallen bamboo stalk to guide it onto dry moss', 'She splashed heavy water over the grass', 'She called a helicopter to lift it'],
            correctIndex: 0,
            explanation: 'Mina gently balanced and guided the nest using a fallen bamboo pole.',
          },
        ],
      },
      {
        id: 'story_sunflower_en',
        title: 'The Sunflower That Chased the Dawn',
        synopsis: 'A tiny seed buried in dark soil learns that quiet growth and patient waiting lead to bright blossoms.',
        emoji: '🌻',
        readingLevel: 'early',
        estimatedMinutes: 3,
        paragraphs: [
          'Deep beneath the cool, crumbly soil, a brown sunflower seed rested in darkness. Earthworms whispered stories of warm air above, but the seed could only feel the quiet earth and the steady patter of evening rain.',
          'Every night, the rain tapped the ground like gentle drumbeats. The seed drank the moisture and began to push tiny white roots down into the soil. Soon, a brave green shoot reached upward, parting the soil grains until it met the morning air.',
          'Week after week, the stalk climbed taller, wearing emerald leaves like tiny flags. One bright morning, golden yellow petals unfolded toward the rising sun. The little sunflower smiled, discovering that every dark, quiet day had helped it grow into something radiant.',
        ],
        comprehensionQuestions: [
          {
            id: 'q_sunflower_1',
            question: 'What helped the hidden seed begin its journey upward?',
            options: ['Raindrops tapping the soil and providing moisture', 'Strong winds blowing the garden away', 'Being kept completely dry in a jar'],
            correctIndex: 0,
            explanation: 'The rain provided gentle moisture that awakened the tiny roots.',
          },
          {
            id: 'q_sunflower_2',
            question: 'What did the sunflower discover when its yellow petals unfolded?',
            options: ['That quiet, patient days helped it grow strong and bright', 'That it wanted to return beneath the ground', 'That flowers only open in the dark'],
            correctIndex: 0,
            explanation: 'The sunflower learned that every quiet day of growth prepared it for the golden sunlight.',
          },
        ],
      },
      {
        id: 'story_banyan_en',
        title: 'The Secret of Banyan Island',
        synopsis: 'Two young friends row through misty mangrove waters to protect a hidden sanctuary of white herons.',
        emoji: '🛶',
        readingLevel: 'confident',
        estimatedMinutes: 5,
        paragraphs: [
          'Dawn draped the coastal lagoon in violet mist as Maya and Kabir unmoored their wooden canoe. The water was as calm as polished glass, reflecting the twisted aerial roots of ancient mangrove trees. They were on an important mission: counting migratory white herons for the village nature reserve.',
          'Kabir dipped his cedar paddle quietly, creating ripples that circled outward like silver rings. Suddenly, a pair of majestic birds with snow-white crests glided silently over the canopy, landing gracefully on the sprawling branches of Banyan Island. Maya adjusted her brass binoculars, logging their nest location in her waterproof journal.',
          'As the sun peeked through the leaves, they discovered three newly hatched chicks resting inside a secure canopy hollow. The children marked the boundary flags so passing fishing boats would steer clear. Protecting wild creatures made the early morning chill feel like the warmest adventure.',
        ],
        comprehensionQuestions: [
          {
            id: 'q_banyan_1',
            question: 'Why were Maya and Kabir rowing their canoe into the lagoon?',
            options: ['To observe and log migratory white herons for the reserve', 'To catch fish for a village market', 'To search for a pirate treasure chest'],
            correctIndex: 0,
            explanation: 'They were on a conservation mission to track and protect white herons.',
          },
          {
            id: 'q_banyan_2',
            question: 'How did the children help protect the newly hatched chicks?',
            options: ['They marked boundary flags so boats would give them space', 'They brought the nest into their living room', 'They built a loud wooden fence'],
            correctIndex: 0,
            explanation: 'They placed quiet boundary flags to guide boats safely away from the nesting tree.',
          },
        ],
      },
      {
        id: 'story_nilgiri_en',
        title: 'The Whispering Flute of the Blue Hills',
        synopsis: 'Dev crafts a bamboo flute in the mountain mist and discovers how music connects generations.',
        emoji: '🎶',
        readingLevel: 'confident',
        estimatedMinutes: 5,
        paragraphs: [
          'High up in the Nilgiri hills, tea bushes carpeted the slopes in vibrant shades of jade. Twelve-year-old Dev sat beneath a cedar awning, studying a slender stalk of dried golden bamboo. His grandmother had taught him that musical flutes are not merely carved; they are listened to before the first finger hole is made.',
          'With a heated copper stylus, Dev carefully burned six small circular holes along the bamboo shaft. When he blew his first breath across the embouchure, the flute gave only a dry, whistling hiss. Dev did not get discouraged. He adjusted his lip position, smoothed the inner grain with sand leaves, and blew gently like evening mist.',
          'A rich, melodious note echoed across the valley, sweet as mountain honey. That evening at the community bonfire, Dev played the traditional harvest melody. When the village elders closed their eyes and smiled with tears of joy, Dev felt the ancient heartbeat of his hills alive in his fingers.',
        ],
        comprehensionQuestions: [
          {
            id: 'q_nilgiri_1',
            question: 'What did Dev do when his first note sounded like a dry hiss?',
            options: ['He smoothed the grain and adjusted his gentle breath', 'He broke the bamboo stalk in anger', 'He decided he would never play music again'],
            correctIndex: 0,
            explanation: 'Dev remained patient, smoothed the inner bamboo with leaves, and tried blowing gently.',
          },
          {
            id: 'q_nilgiri_2',
            question: 'Why were the village elders moved by Dev’s flute playing?',
            options: ['He played their beloved traditional harvest melody', 'His flute was louder than thunder', 'He played a modern pop song'],
            correctIndex: 0,
            explanation: 'The elders were deeply touched by the traditional melody of their homeland.',
          },
        ],
      },
    ],

    Hindi: [
      {
        id: 'story_kite_hi',
        title: 'सन्नी और साहसी छोटी पतंग',
        synopsis: 'सन्नी सीखती है कि धैर्य और लगातार कदम बढ़ाने से पतंग हवा में ऊंची उड़ान भरती है।',
        emoji: '🪁',
        readingLevel: 'early',
        estimatedMinutes: 3,
        paragraphs: [
          'एक सुहावनी दोपहर में, सन्नी अपनी चमकदार लाल पतंग लेकर हरी-भरी पहाड़ी पर गई। हवा के झोंकों से घास हरी लहरों की तरह झूल रही थी। सन्नी ने लकड़ी की चरखी को अपने हाथों में मजबूती से पकड़ा हुआ था।',
          'शुरुआत में पतंग थोड़ी डगमगाई और दो बार नरम घास पर गिर गई। सन्नी ने एक गहरी सांस ली। उसे अपने दादाजी की बात याद आई: “पतंग घबराहट से नहीं उड़ती, वह तब उड़ती है जब तुम शांत मन और पक्के कदमों से दौड़ते हो।”',
          'सन्नी ने मांझा थोड़ा ढीला छोड़ा और पहाड़ी की ओर दौड़ना शुरू किया। जैसे ही उसकी चाल तेज़ हुई, हवा के झोंके ने पतंग को ऊपर उठा लिया। लाल पतंग बादलों के बीच नाचने लगी। सन्नी खुशी से झूम उठी और उसके सभी दोस्तों ने ताली बजाई।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_kite_hi_1',
            question: 'सन्नी की पतंग पहले घास पर क्यों गिर गई थी?',
            options: ['हवा ने अभी उसकी पतंग को सहारा नहीं दिया था', 'मांझा बीच में से टूट गया था', 'आसमान से तेज बारिश होने लगी थी'],
            correctIndex: 0,
            explanation: 'पतंग को ऊपर उठाने के लिए सही हवा और निरंतर दौड़ की जरूरत थी।',
          },
          {
            id: 'q_kite_hi_2',
            question: 'सन्नी को दोबारा कोशिश करने में किस बात से मदद मिली?',
            options: ['दादाजी की सीख याद करके शांत मन से दौड़ना', 'पतंग को पत्थरों पर फेंक देना', 'उदास होकर घर लौट जाना'],
            correctIndex: 0,
            explanation: 'सन्नी ने गहरी सांस ली और पक्के कदमों से दौड़कर पतंग को आसमान में उड़ाया।',
          },
        ],
      },
      {
        id: 'story_mina_hi',
        title: 'मीना और नदी का किनारा',
        synopsis: 'एक नन्ही हथनी अपनी समझदारी से नदी किनारे गिरे चिड़िया के घोंसले को सुरक्षित करती है।',
        emoji: '🐘',
        readingLevel: 'growing',
        estimatedMinutes: 4,
        paragraphs: [
          'बरसात के मौसम में जंगल की नदी पानी से लबालब भर गई थी। मीना नाम की नन्ही हथनी को ठंडे पानी में अपने घुटने डुबोकर नहाना बहुत पसंद था। उसकी आँखें बेहद दयालु और शांत थीं।',
          'पानी पीते समय मीना ने एक धीमी और घबराई हुई चीं-चीं सुनी। एक फिसलन भरे पत्थर के पास नन्ही चिड़िया के बच्चे का घोंसला पानी की तेज धार के बिल्कुल करीब हिल रहा था।',
          'मीना ने बहुत सावधानी से कदम रखे ताकि पानी की छीटें न उड़ें। उसने किनारे पड़ा एक मजबूत बांस का डंडा उठाया और अपनी सूंड से घोंसले को धीरे से सूखी काई की तरफ खिसका दिया। माँ चिड़िया ने खुशी से चहकते हुए मीना का धन्यवाद किया।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_mina_hi_1',
            question: 'मीना ने नदी किनारे क्या परेशानी देखी?',
            options: ['चिड़िया का नन्हा घोंसला पानी में बहने की कगार पर था', 'नदी में एक बड़ा मगरमच्छ फंसा हुआ था', 'जंगल का रास्ता बंद हो गया था'],
            correctIndex: 0,
            explanation: 'चिड़िया का घोंसला डाल से गिरकर नदी की तेज धार के पास आ गया था।',
          },
          {
            id: 'q_mina_hi_2',
            question: 'मीना ने घोंसले को कैसे सुरक्षित स्थान पर पहुंचाया?',
            options: ['बांस के डंडे से घोंसले को धीरे से सूखी काई पर खिसकाया', 'घोंसले पर तेज पानी फेंक कर', 'जोर-जोर से चिंघाड़ कर'],
            correctIndex: 0,
            explanation: 'मीना ने समझदारी से बांस के डंडे का सहारा लेकर घोंसला सूखी जगह पर रख दिया।',
          },
        ],
      },
      {
        id: 'story_sunflower_hi',
        title: 'सूरजमुखी और सुनहरी सुबह',
        synopsis: 'मिट्टी में दबा एक छोटा बीज धैर्य से सीखता है कि समय के साथ हर मेहनत रंग लाती है।',
        emoji: '🌻',
        readingLevel: 'early',
        estimatedMinutes: 3,
        paragraphs: [
          'नरम भूरी मिट्टी के नीचे सूरजमुखी का एक छोटा सा बीज शांत पड़ा हुआ था। उसे केवल ठंडी धरती और ऊपर से टपकती बारिश की बूंदों की मधुर थाप सुनाई देती थी।',
          'हर रात बारिश की बूंदें मिट्टी को पोषण देती थीं। बीज ने पानी पिया और अपनी नन्हीं जड़ें नीचे की ओर फैलानी शुरू कीं। जल्द ही एक नन्हा हरा अंकुर मिट्टी को चीरकर बाहर आ गया।',
          'हफ्तों बाद उसका तना मजबूत हो गया और उस पर हरी पत्तियां लहराने लगीं। एक सुनहरी सुबह उसकी पीली पंखुड़ियां खिल उठीं। सूरजमुखी मुस्कुराया क्योंकि धैर्य ने उसे सुंदर फूल बना दिया था।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_sunflower_hi_1',
            question: 'मिट्टी में दबे बीज को अंकुरित होने में किसने मदद की?',
            options: ['बारिश की बूंदों और मिट्टी की नमी ने', 'तेज आंधी और तूफान ने', 'कांच के बंद डिब्बे ने'],
            correctIndex: 0,
            explanation: 'बारिश के पानी और मिट्टी के पोषण से बीज से नन्हीं जड़ें और अंकुर फूटे।',
          },
          {
            id: 'q_sunflower_hi_2',
            question: 'पीली पंखुड़ियां खुलने पर सूरजमुखी ने क्या महसूस किया?',
            options: ['कि धैर्य और लगातार बढ़ने से सुंदर परिणाम मिलता है', 'कि उसे वापस मिट्टी में छिप जाना चाहिए', 'कि फूल केवल रात में खिलते हैं'],
            correctIndex: 0,
            explanation: 'सूरजमुखी ने जाना कि चुपचाप की गई मेहनत और धैर्य से सुंदर रूप मिलता है।',
          },
        ],
      },
      {
        id: 'story_banyan_hi',
        title: 'बरगद वाले द्वीप का रहस्य',
        synopsis: 'माया और कबीर नाव से जाकर दुर्लभ सफेद बगुलों के घोंसलों की सुरक्षा करते हैं।',
        emoji: '🛶',
        readingLevel: 'confident',
        estimatedMinutes: 5,
        paragraphs: [
          'सुबह की हल्की धुंध में माया और कबीर ने अपनी लकड़ी की छोटी नाव को नदी में उतारा। पानी कांच की तरह शांत था और किनारों पर विशाल बरगद के पेड़ फैले हुए थे। दोनों बच्चे पक्षियों की सुरक्षा अभियान पर निकले थे।',
          'कबीर ने पतवार को बहुत धीरे से चलाया ताकि पानी में ज्यादा हलचल न हो। तभी बर्फीले सफेद पंखों वाले बगुलों का एक जोड़ा शांति से उड़कर बरगद के द्वीप पर उतरा। माया ने अपनी दूरबीन से उनके घोंसले का स्थान अपनी डायरी में लिखा।',
          'पेड़ की खोह में तीन नन्हें चूजे सुरक्षित बैठे थे। बच्चों ने द्वीप के चारों ओर सुरक्षा के लाल झंडे लगाए ताकि मछुआरों की नावें वहां शांति बनाए रखें। प्रकृति की सेवा करके दोनों बच्चों का मन गर्व से भर गया।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_banyan_hi_1',
            question: 'माया और कबीर सुबह-सवेरे नाव लेकर क्यों निकले थे?',
            options: ['सफेद बगुलों के घोंसलों की सुरक्षा और जानकारी दर्ज करने', 'नदी में मछलियां पकड़ने के लिए', 'खोए हुए खजाने की तलाश में'],
            correctIndex: 0,
            explanation: 'वे पक्षी संरक्षण अभियान के तहत सफेद बगुलों की रक्षा करने निकले थे।',
          },
          {
            id: 'q_banyan_hi_2',
            question: 'बच्चों ने नन्हें चूजों को सुरक्षित रखने के लिए क्या किया?',
            options: ['नावों को दूर रखने के लिए सुरक्षा झंडे लगाए', 'घोंसले को अपने घर ले आए', 'पेड़ के पास जोर से ढोल बजाया'],
            correctIndex: 0,
            explanation: 'उन्होंने चेतावनी झंडे लगाए ताकि नावें घोंसलों से दूर रहकर शांति बनाए रखें।',
          },
        ],
      },
      {
        id: 'story_nilgiri_hi',
        title: 'नीलगिरी की सुरीली बांसुरी',
        synopsis: 'देव पहाड़ों में बांस की बांसुरी बनाना सीखता है और गांव के बुजुर्गों के चेहरों पर मुस्कान लाता है।',
        emoji: '🎶',
        readingLevel: 'confident',
        estimatedMinutes: 5,
        paragraphs: [
          'नीलगिरी की हरी पहाड़ियों पर चाय के बागान दूर-दूर तक फैले थे। बारह साल का देव अपने बरामदे में बैठकर सूखे सुनहरे बांस के टुकड़े को देख रहा था। उसकी दादी ने सिखाया था कि बांसुरी केवल काटी नहीं जाती, उसकी ध्वनि को पहले दिल से सुनना पड़ता है।',
          'देव ने गर्म तांबे की सलाई से बांस में छह छोटे-छोटे छेद बनाए। जब उसने पहली बार फूंक मारी, तो केवल सीटी जैसी तेज आवाज निकली। देव निराश नहीं हुआ। उसने किनारों को पत्तों से चिकना किया और फिर धीरे से फूंक मारी।',
          'पहाड़ी हवा में शहद जैसी मीठी धुन गूंज उठी। उस शाम गांव की अलाव सभा में देव ने फसल का पारंपरिक गीत बजाया। जब बुजुर्गों ने अपनी आंखें मूंदकर मुस्कराते हुए ताल दी, तो देव को अपनी कला पर बहुत खुशी हुई।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_nilgiri_hi_1',
            question: 'जब पहली बार बांसुरी से सही आवाज नहीं निकली, तो देव ने क्या किया?',
            options: ['धैर्य रखकर बांसुरी को चिकना किया और सही फूंक सीखी', 'गुस्से में बांस को फेंक दिया', 'संगीत सीखना हमेशा के लिए छोड़ दिया'],
            correctIndex: 0,
            explanation: 'देव ने धीरज बनाए रखा, बांसुरी को ठीक किया और दोबारा शांत मन से प्रयास किया।',
          },
          {
            id: 'q_nilgiri_hi_2',
            question: 'गांव के बुजुर्ग देव की बांसुरी सुनकर खुश क्यों हुए?',
            options: ['उसने अपनी पारंपरिक फसल का प्यारा लोकगीत सुनाया', 'उसकी बांसुरी बहुत जोर से बज रही थी', 'उसने कोई आधुनिक विदेशी धुन बजाई'],
            correctIndex: 0,
            explanation: 'बुजुर्ग अपनी पुरानी पहाड़ी संस्कृति और पारंपरिक धुन सुनकर भावविभोर हो गए।',
          },
        ],
      },
    ],

    Odia: [
      {
        id: 'story_kite_or',
        title: 'ସନ୍ନି ଏବଂ ସାହସୀ ଛୋଟ ଗୁଡ଼ି',
        synopsis: 'ସନ୍ନି ଶିଖିଲା ଯେ ଧୈର୍ଯ୍ୟ ଏବଂ ସ୍ଥିର ଭାବରେ ଦୌଡ଼ିଲେ ଗୁଡ଼ି ଆକାଶରେ ସୁନ୍ଦର ଭାବେ ଉଡ଼ିପାରେ।',
        emoji: '🪁',
        readingLevel: 'early',
        estimatedMinutes: 3,
        paragraphs: [
          'ଗୋଟିଏ ପବନିଆ ଅପରାହ୍ନରେ ସନ୍ନି ନିଜର ଲାଲ ଗୁଡ଼ି ଧରି ଘାସ ପାହାଡ଼ ଉପରକୁ ଗଲା। ଥଣ୍ଡା ପବନରେ ଘାସ ସବୁଜ ସମୁଦ୍ରର ଢେଉ ଭଳି ଦୋଳି ଖେଳୁଥିଲା। ସନ୍ନି ନିଜ ହାତରେ ସୂତା ଚରଖିକୁ ଶକ୍ତ କରି ଧରିଥିଲା।',
          'ପ୍ରଥମେ ଗୁଡ଼ିଟି ଟଳମଳ ହୋଇ ଦୁଇଥର ତଳେ ପଡ଼ିଗଲା। ସନ୍ନି ଗୋଟିଏ ଲମ୍ବା ନିଶ୍ୱାସ ନେଲା। ତା ଜେଜେବାପାଙ୍କ କଥା ମନେପଡ଼ିଲା: “ଚିନ୍ତା କଲେ ଗୁଡ଼ି ଉଡ଼େନାହିଁ, ମନରେ ବିଶ୍ୱାସ ଓ ସ୍ଥିର ଗୋଡ଼ରେ ଦୌଡ଼ିଲେ ହିଁ ଗୁଡ଼ି ଆକାଶ ଛୁଏଁ।”',
          'ସନ୍ନି ସୂତା ଟିକେ ଛାଡ଼ି ପାହାଡ଼ ଆଡ଼କୁ ଦୌଡ଼ିଲା। ତା ବେଗ ବଢ଼ିବା ସଙ୍ଗେ ସଙ୍ଗେ ପବନ ଗୁଡ଼ିକୁ ଉପରକୁ ଉଠାଇ ନେଲା। ଲାଲ ଗୁଡ଼ି ନୀଳ ଆକାଶରେ ନାଚିବାକୁ ଲାଗିଲା ଏବଂ ସାଙ୍ଗମାନେ ତାଳି ବଜାଇଲେ।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_kite_or_1',
            question: 'ପ୍ରଥମେ ଗୁଡ଼ିଟି ତଳେ କାହିଁକି ଖସିପଡ଼ିଲା?',
            options: ['ପବନ ତାକୁ ଠିକ ଭାବେ ଧରିନଥିଲା', 'ସୂତାଟି ମଝିରୁ ଛିଣ୍ଡି ଯାଇଥିଲା', 'ପାହାଡ଼ ଉପରେ ପ୍ରବଳ ବର୍ଷା ହେଉଥିଲା'],
            correctIndex: 0,
            explanation: 'ଗୁଡ଼ି ଉଡ଼ିବା ପାଇଁ ପବନ ଏବଂ ସ୍ଥିର ଗତିରେ ଦୌଡ଼ିବା ଆବଶ୍ୟକ ଥିଲା।',
          },
          {
            id: 'q_kite_or_2',
            question: 'ଦ୍ୱିତୀୟ ଥର ଚେଷ୍ଟା କଲାବେଳେ ସନ୍ନିକୁ କଣ ସାହାଯ୍ୟ କଲା?',
            options: ['ଜେଜେଙ୍କ ଉପଦେଶ ମନେପକାଇ ସ୍ଥିର ମନରେ ଦୌଡ଼ିବା', 'ଗୁଡ଼ିକୁ ପଥର ଉପରେ ଫିଙ୍ଗିଦେବା', 'କାନ୍ଦି କାନ୍ଦି ଘରକୁ ଫେରିଯିବା'],
            correctIndex: 0,
            explanation: 'ସନ୍ନି ଧୈର୍ଯ୍ୟ ଧରି ଶାନ୍ତ ମନରେ ଦୌଡ଼ି ଗୁଡ଼ିକୁ ଆକାଶରେ ଉଡ଼ାଇଲା।',
          },
        ],
      },
      {
        id: 'story_mina_or',
        title: 'ମିନା ଏବଂ ନଦୀ କୂଳ',
        synopsis: 'ଜଣେ ଦୟାଳୁ ଛୋଟ ହାତୀ ନିଜ ବୁଦ୍ଧିରେ ନଦୀ କୂଳରେ ଥିବା ଚଢ଼େଇ ବସାକୁ ସୁରକ୍ଷିତ କଲା।',
        emoji: '🐘',
        readingLevel: 'growing',
        estimatedMinutes: 4,
        paragraphs: [
          'ବର୍ଷା ଋତୁରେ ଜଙ୍ଗଲ ନଦୀଟି ପାଣିରେ ଭରିଯାଇ ପ୍ରଖର ବେଗରେ ବହୁଥିଲା। ମିନା ନାମକ ଗୋଟିଏ ଛୋଟ ହାତୀ ନଦୀ କୂଳରେ ଥଣ୍ଡା ପାଣି ପିଇବାକୁ ଭଲ ପାଉଥିଲା।',
          'ପାଣି ପିଉଥିବା ସମୟରେ ମିନା ଗୋଟିଏ ଛୋଟ ଚଢ଼େଇର କାନ୍ଦଣା ଶୁଣିଲା। ଗୋଟିଏ ଓଦା ପଥର ପାଖରେ ଚଢ଼େଇର ଛୋଟ ବସାଟି ନଦୀ ସୁଅ ମୁହଁରେ ଖସିପଡ଼ିବା ଅବସ୍ଥାରେ ଥିଲା।',
          'ମିନା ବହୁତ ସାବଧାନରେ ପାଦ ପକାଇଲା ଯେପରି ପାଣି ଛିଟିକିବ ନାହିଁ। ସେ ନଦୀ କୂଳରୁ ଗୋଟିଏ ବାଉଁଶ ବାଡ଼ି ଆଣି ନିଜ ଶୁଣ୍ଢ ସାହାଯ୍ୟରେ ବସାଟିକୁ ଶୁଖିଲା ଘାସ ଉପରକୁ ନେଇଆସିଲା। ମା ଚଢ଼େଇ ଖୁସିରେ ଗୀତ ଗାଇ ଧନ୍ୟବାଦ ଦେଲା।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_mina_or_1',
            question: 'ମିନା ନଦୀ କୂଳରେ କେଉଁ ବିପଦ ଦେଖିଲା?',
            options: ['ଚଢ଼େଇ ବସାଟି ନଦୀ ସୁଅରେ ଭାସିଯିବାକୁ ବସିଥିଲା', 'ଗୋଟିଏ କୁମ୍ଭୀର ପଥରରେ ଫସି ରହିଥିଲା', 'ଜଙ୍ଗଲରେ ନିଆଁ ଲାଗିଯାଇଥିଲା'],
            correctIndex: 0,
            explanation: 'ନଦୀର ପ୍ରଖର ସୁଅ ମୁହଁରେ ଚଢ଼େଇର ଛୋଟ ବସାଟି ବିପଦରେ ଥିଲା।',
          },
          {
            id: 'q_mina_or_2',
            question: 'ମିନା ବସାଟିକୁ କିପରି ବିପଦରୁ ରକ୍ଷା କଲା?',
            options: ['ବାଉଁଶ ବାଡ଼ି ସାହାଯ୍ୟରେ ଶୁଖିଲା ଜାଗାକୁ ଘୁଞ୍ଚାଇ ଦେଲା', 'ବସା ଉପରେ ପାଣି ଫିଙ୍ଗିଲା', 'ଜୋରରେ ଚିତ୍କାର କଲା'],
            correctIndex: 0,
            explanation: 'ମିନା ବୁଦ୍ଧି ଖଟାଇ ବାଉଁଶ ବାଡ଼ିରେ ବସାଟିକୁ ସୁରକ୍ଷିତ ଜାଗାକୁ ନେଇଆସିଲା।',
          },
        ],
      },
      {
        id: 'story_sunflower_or',
        title: 'ସୂର୍ଯ୍ୟମୁଖୀ ଏବଂ ସୁନେଲି ସକାଳ',
        synopsis: 'ମାଟି ତଳେ ଥିବା ଛୋଟ ମଞ୍ଜିଟି ଶିଖିଲା ଯେ ଧୈର୍ଯ୍ୟ ରଖିଲେ ସମୟ ସହ ସୁନ୍ଦର ଫୁଲ ଫୁଟେ।',
        emoji: '🌻',
        readingLevel: 'early',
        estimatedMinutes: 3,
        paragraphs: [
          'ନରମ କଳା ମାଟି ତଳେ ସୂର୍ଯ୍ୟମୁଖୀର ଗୋଟିଏ ଛୋଟ ମଞ୍ଜି ଶୋଇ ରହିଥିଲା। ତାକୁ କେବଳ ଉପରୁ ପଡୁଥିବା ବର୍ଷା ଟୋପାର ମଧୁର ଶବ୍ଦ ଶୁଣାଯାଉଥିଲା।',
          'ପ୍ରତି ରାତିରେ ବର୍ଷା ପାଣି ମାଟିକୁ ଭିଜାଉଥିଲା। ମଞ୍ଜିଟି ପାଣି ପିଇ ନିଜର ଛୋଟ ଚେର ତଳକୁ ମେଲାଇଲା। ଖୁବ ଶୀଘ୍ର ଗୋଟିଏ ସବୁଜ କଅଁଳ ଗଜା ମାଟି ଫୁଟାଇ ବାହାରକୁ ଆସିଲା।',
          'କିଛି ସପ୍ତାହ ପରେ ଗଛଟି ଡେଙ୍ଗା ହୋଇ ସୁନ୍ଦର ପତ୍ର ମେଲାଇଲା। ଗୋଟିଏ ସୁନେଲି ସକାଳେ ତାହାର ହଳଦିଆ ପାଖୁଡ଼ା ସୂର୍ଯ୍ୟ ଆଡ଼କୁ ହସି ଉଠିଲା। ସୂର୍ଯ୍ୟମୁଖୀ ଜାଣିଲା ଯେ ଧୈର୍ଯ୍ୟ ହିଁ ତାକୁ ଏହି ସୁନ୍ଦର ରୂପ ଦେଇଛି।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_sunflower_or_1',
            question: 'ମାଟି ତଳର ମଞ୍ଜିଟିକୁ ବଢ଼ିବାରେ କିଏ ସାହାଯ୍ୟ କଲା?',
            options: ['ବର୍ଷା ପାଣି ଏବଂ ମାଟିର ଆର୍ଦ୍ରତା', 'ପ୍ରଚଣ୍ଡ ଝଡ଼ ଏବଂ ବାତ୍ୟା', 'ଗୋଟିଏ ବନ୍ଦ କାଚ ବୋତଲ'],
            correctIndex: 0,
            explanation: 'ବର୍ଷା ପାଣି ମଞ୍ଜିକୁ ସଜୀବ କରି ଗଜା ମେଲିବାରେ ସାହାଯ୍ୟ କଲା।',
          },
          {
            id: 'q_sunflower_or_2',
            question: 'ହଳଦିଆ ପାଖୁଡ଼ା ଖୋଲିବା ପରେ ସୂର୍ଯ୍ୟମୁଖୀ କଣ ବୁଝିଲା?',
            options: ['ଧୈର୍ଯ୍ୟ ଏବଂ ଶାନ୍ତ ପରିଶ୍ରମ ସୁନ୍ଦର ଫଳ ଦିଏ', 'ସେ ପୁଣି ମାଟି ତଳକୁ ଲୁଚିଯିବା ଉଚିତ', 'ଫୁଲ କେବଳ ରାତିରେ ଫୁଟେ'],
            correctIndex: 0,
            explanation: 'ସୂର୍ଯ୍ୟମୁଖୀ ବୁଝିଲା ଯେ ଧୈର୍ଯ୍ୟ ଧରିଲେ ଜୀବନ ସୁନ୍ଦର ହୋଇ ଫୁଟିଉଠେ।',
          },
        ],
      },
      {
        id: 'story_banyan_or',
        title: 'ବରଗଛ ଦ୍ୱୀପର ରହସ୍ୟ',
        synopsis: 'ମାୟା ଏବଂ କବୀର ଧଳା ବଗମାନଙ୍କ ସୁରକ୍ଷା ପାଇଁ କାଠ ଡଙ୍ଗାରେ ଗୋଟିଏ ସୁନ୍ଦର ଅଭିଯାନ ଆରମ୍ଭ କଲେ।',
        emoji: '🛶',
        readingLevel: 'confident',
        estimatedMinutes: 5,
        paragraphs: [
          'ସକାଳର ଘନ କୁହୁଡ଼ିରେ ମାୟା ଏବଂ କବୀର ନିଜର କାଠ ଡଙ୍ଗା ଫିଟାଇ ନଦୀରେ ବାହାରିଲେ। ପାଣି ଏତେ ଶାନ୍ତ ଥିଲା ଯେ ସେଥିରେ ବରଗଛର ଲମ୍ବା ଓହଳଗୁଡ଼ିକ ଦର୍ପଣ ପରି ଦିଶୁଥିଲା। ସେମାନଙ୍କର ଲକ୍ଷ୍ୟ ଥିଲା ପ୍ରବାସୀ ଧଳା ବଗମାନଙ୍କ ବସା ଖୋଜିବା।',
          'କବୀର ଧୀରେ ଧୀରେ ଆହୁଲା ମାରିଲା ଯେପରି ପାଣିରେ କୌଣସି ଶବ୍ଦ ନହୁଏ। ହଠାତ ଗୋଟିଏ ଯୋଡ଼ା ସୁନ୍ଦର ଧଳା ବଗ ଉଡ଼ିଆସି ବରଗଛ ଡାଳରେ ବସିଲେ। ମାୟା ନିଜର ଦୂରବୀକ୍ଷଣରେ ସେମାନଙ୍କ ବସାର ସ୍ଥାନ ଲିପିବଦ୍ଧ କଲା।',
          'ଗଛର ସୁରକ୍ଷିତ ଡାଳ ଭିତରେ ତିନୋଟି ଛୋଟ ଛୁଆ ଶାନ୍ତରେ ବସିଥିଲେ। ପିଲାମାନେ ନଦୀ କୂଳରେ ଲାଲ ପତାକା ଲଗାଇଦେଲେ ଯାହା ଦ୍ୱାରା ମାଛଧରା ଡଙ୍ଗାଗୁଡ଼ିକ ସେଠାରୁ ଦୂରରେ ରହିବେ। ନିରୀହ ଜୀବମାନଙ୍କୁ ସୁରକ୍ଷା ଦେବା ସେମାନଙ୍କୁ ବହୁତ ଖୁସି ଦେଲା।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_banyan_or_1',
            question: 'ମାୟା ଏବଂ କବୀର କାହିଁକି ଡଙ୍ଗା ଚଳାଇ ନଦୀ ଭିତରକୁ ଯାଇଥିଲେ?',
            options: ['ପ୍ରବାସୀ ଧଳା ବଗମାନଙ୍କ ସୁରକ୍ଷା ଓ ବସା ଚିହ୍ନଟ କରିବା ପାଇଁ', 'ବଜାରରେ ବିକ୍ରି କରିବା ପାଇଁ ମାଛ ଧରିବାକୁ', 'କୂଳରେ ଲୁଚି ରହିଥିବା ଚୋର ଧରିବାକୁ'],
            correctIndex: 0,
            explanation: 'ସେମାନେ ପ୍ରକୃତି ସଂରକ୍ଷଣ ପାଇଁ ବଗମାନଙ୍କ ବସା ଖୋଜିବାକୁ ଯାଇଥିଲେ।',
          },
          {
            id: 'q_banyan_or_2',
            question: 'ପିଲାମାନେ ଛୋଟ ଛୁଆମାନଙ୍କୁ କିପରି ସୁରକ୍ଷା ଦେଲେ?',
            options: ['କୂଳରେ ପତାକା ଲଗାଇ ଡଙ୍ଗାଗୁଡ଼ିକୁ ସତର୍କ କରାଇଲେ', 'ବସାଟିକୁ ଧରି ନିଜ ଘରକୁ ନେଇଗଲେ', 'ଜୋରରେ ପାଟି କରି ଚଢ଼େଇମାନଙ୍କୁ ଉଡ଼ାଇଦେଲେ'],
            correctIndex: 0,
            explanation: 'ସେମାନେ ଚାରିପାଖେ ସୂଚନା ପତାକା ଲଗାଇ ଡଙ୍ଗାଗୁଡ଼ିକୁ ଦୂରରେ ରହିବାକୁ ନିର୍ଦ୍ଦେଶ ଦେଲେ।',
          },
        ],
      },
      {
        id: 'story_nilgiri_or',
        title: 'ନୀଳଗିରିର ବଂଶୀ ଧ୍ୱନି',
        synopsis: 'ଦେବ ପାହାଡ଼ ଉପରେ ଶୁଖିଲା ବାଉଁଶରେ ବଂଶୀ ତିଆରି କରି ନିଜ ପାରମ୍ପରିକ ସଙ୍ଗୀତର ଯାଦୁ ଆବିଷ୍କାର କଲା।',
        emoji: '🎶',
        readingLevel: 'confident',
        estimatedMinutes: 5,
        paragraphs: [
          'ନୀଳଗିରି ପାହାଡ଼ ଉପରେ ଚାହା ବଗିଚା ସବୁଜ ଗାଲିଚା ପରି ବିଛା ହୋଇଥିଲା। ବାର ବର୍ଷର ଦେବ ଗୋଟିଏ ସୁନେଲି ଶୁଖିଲା ବାଉଁଶ ଖଣ୍ଡ ଧରି ବସିଥିଲା। ତା ଜେଜେମା କହିଥିଲେ ଯେ ବଂଶୀ କେବଳ କାଠ ନୁହେଁ, ସେଥିରୁ ମନର ଗୀତ ଶୁଣିବାକୁ ପଡ଼େ।',
          'ଦେବ ତତଲା ତାରରେ ବାଉଁଶରେ ଛଅଟି ଛୋଟ କଣା କଲା। ପ୍ରଥମେ ଫୁଙ୍କିଲା ବେଳେ କେବଳ ପବନର ଶବ୍ଦ ବାହାରିଲା। କିନ୍ତୁ ଦେବ ନିରାଶ ହେଲାନାହିଁ। ସେ ବାଉଁଶକୁ ମସୃଣ କଲା ଏବଂ ଶାନ୍ତ ହୋଇ ଫୁଙ୍କିଲା।',
          'ପାହାଡ଼ିଆ ପବନରେ ମହୁ ପରି ମିଠା ସୁର ଗୁଞ୍ଜରିତ ହେଲା। ସେହି ସନ୍ଧ୍ୟାରେ ଗାଁ ଉତ୍ସବରେ ଦେବ ଫସଲ ଅମଳର ପାରମ୍ପରିକ ଗୀତ ବଜାଇଲା। ଗାଁର ମୁରବୀମାନେ ଆନନ୍ଦରେ ଆଖି ବୁଜି ତାଳି ବଜାଇଲେ।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_nilgiri_or_1',
            question: 'ପ୍ରଥମେ ବଂଶୀରୁ ଠିକ ସୁର ନବାହାରିବାରୁ ଦେବ କଣ କଲା?',
            options: ['ଧୈର୍ଯ୍ୟ ରଖି ବାଉଁଶକୁ ମସୃଣ କଲା ଏବଂ ସଠିକ ଭାବେ ଫୁଙ୍କିଲା', 'ରାଗିଯାଇ ବାଉଁଶକୁ ଭାଙ୍ଗିଦେଲା', 'ସବୁଦିନ ପାଇଁ ସଙ୍ଗୀତ ଛାଡ଼ିଦେଲା'],
            correctIndex: 0,
            explanation: 'ଦେବ ନିରାଶ ନହୋଇ ଧୈର୍ଯ୍ୟ ସହିତ ପୁନର୍ବାର ଅଭ୍ୟାସ କଲା।',
          },
          {
            id: 'q_nilgiri_or_2',
            question: 'ଗାଁର ବୟସ୍କ ଲୋକମାନେ କାହିଁକି ଆନନ୍ଦିତ ହେଲେ?',
            options: ['ଦେବ ସେମାନଙ୍କର ପ୍ରିୟ ପାରମ୍ପରିକ ଫସଲ ଗୀତ ବଜାଇଲା', 'ବଂଶୀର ଶବ୍ଦ ବହୁତ ଜୋର ଥିଲା', 'ସେ ଏକ ନୂଆ ବିଦେଶୀ ଗୀତ ଶୁଣାଇଲା'],
            correctIndex: 0,
            explanation: 'ଗାଁର ଲୋକମାନେ ନିଜ ପାରମ୍ପରିକ ସଂସ୍କୃତିର ସୁର ଶୁଣି ଖୁସି ହେଲେ।',
          },
        ],
      },
    ],

    Punjabi: [
      {
        id: 'story_kite_pa',
        title: 'ਸੰਨੀ ਅਤੇ ਬਹਾਦਰ ਨਿੱਕੀ ਪਤੰਗ',
        synopsis: 'ਸੰਨੀ ਸਿੱਖਦੀ ਹੈ ਕਿ ਸਬਰ ਅਤੇ ਲਗਾਤਾਰ ਕਦਮ ਵਧਾਉਣ ਨਾਲ ਪਤੰਗ ਅਸਮਾਨ ਵਿੱਚ ਉੱਚੀ ਉੱਡਦੀ ਹੈ।',
        emoji: '🪁',
        readingLevel: 'early',
        estimatedMinutes: 3,
        paragraphs: [
          'ਇੱਕ ਠੰਢੀ ਹਵਾ ਵਾਲੀ ਦੁਪਹਿਰ ਨੂੰ, ਸੰਨੀ ਆਪਣੀ ਚਮਕਦੀ ਲਾਲ ਪਤੰਗ ਲੈ ਕੇ ਘਾਹ ਵਾਲੀ ਪਹਾੜੀ ਤੇ ਗਈ। ਠੰਢੀ ਹਵਾ ਵਿੱਚ ਘਾਹ ਹਰੇ ਸਮੁੰਦਰ ਦੀਆਂ ਲਹਿਰਾਂ ਵਾਂਗ ਝੂਲ ਰਿਹਾ ਸੀ। ਸੰਨੀ ਨੇ ਡੋਰ ਦੀ ਚਰਖੜੀ ਨੂੰ ਹੱਥਾਂ ਵਿੱਚ ਮਜ਼ਬੂਤੀ ਨਾਲ ਫੜਿਆ ਹੋਇਆ ਸੀ।',
          'ਪਹਿਲਾਂ-ਪਹਿਲ ਪਤੰਗ ਡਗਮਗਾਈ ਅਤੇ ਦੋ ਵਾਰ ਨਰਮ ਘਾਹ ਉੱਤੇ ਡਿੱਗ ਪਈ। ਸੰਨੀ ਨੇ ਲੰਮਾ ਸਾਹ ਲਿਆ। ਉਸਨੂੰ ਆਪਣੇ ਦਾਦਾ ਜੀ ਦੀ ਗੱਲ ਯਾਦ ਆਈ: “ਪਤੰਗ ਚਿੰਤਾ ਨਾਲ ਨਹੀਂ ਉੱਡਦੀ, ਇਹ ਉਦੋਂ ਉੱਡਦੀ ਹੈ ਜਦੋਂ ਤੁਸੀਂ ਸ਼ਾਂਤ ਮਨ ਅਤੇ ਪੱਕੇ ਕਦਮਾਂ ਨਾਲ ਦੌੜਦੇ ਹੋ।”',
          'ਸੰਨੀ ਨੇ ਡੋਰ ਥੋੜ੍ਹੀ ਢਿੱਲੀ ਛੱਡੀ ਅਤੇ ਪਹਾੜੀ ਵੱਲ ਦੌੜਨਾ ਸ਼ੁਰੂ ਕੀਤਾ। ਜਿਵੇਂ ਹੀ ਉਸਦੀ ਰਫ਼ਤਾਰ ਵਧੀ, ਹਵਾ ਨੇ ਪਤੰਗ ਨੂੰ ਉੱਪਰ ਚੁੱਕ ਲਿਆ। ਲਾਲ ਪਤੰਗ ਨੀਲੇ ਅਸਮਾਨ ਵਿੱਚ ਨੱਚਣ ਲੱਗੀ। ਸੰਨੀ ਖ਼ੁਸ਼ੀ ਨਾਲ ਹੱਸੀ ਅਤੇ ਉਸਦੇ ਦੋਸਤਾਂ ਨੇ ਤਾੜੀਆਂ ਮਾਰੀਆਂ।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_kite_pa_1',
            question: 'ਸੰਨੀ ਦੀ ਪਤੰਗ ਪਹਿਲਾਂ ਘਾਹ ਉੱਤੇ ਕਿਉਂ ਡਿੱਗ ਪਈ ਸੀ?',
            options: ['ਹਵਾ ਨੇ ਅਜੇ ਉਸਦੀ ਪਤੰਗ ਨੂੰ ਸਹਾਰਾ ਨਹੀਂ ਦਿੱਤਾ ਸੀ', 'ਡੋਰ ਵਿਚਕਾਰੋਂ ਟੁੱਟ ਗਈ ਸੀ', 'ਅਸਮਾਨ ਤੋਂ ਭਾਰੀ ਮੀਂਹ ਪੈ ਰਿਹਾ ਸੀ'],
            correctIndex: 0,
            explanation: 'ਪਤੰਗ ਨੂੰ ਉਡਾਉਣ ਲਈ ਸਹੀ ਹਵਾ ਅਤੇ ਸਥਿਰ ਕਦਮਾਂ ਦੀ ਲੋੜ ਸੀ।',
          },
          {
            id: 'q_kite_pa_2',
            question: 'ਸੰਨੀ ਨੂੰ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰਨ ਵਿੱਚ ਕਿਸ ਗੱਲ ਨੇ ਮਦਦ ਕੀਤੀ?',
            options: ['ਦਾਦਾ ਜੀ ਦੀ ਨਸੀਹਤ ਯਾਦ ਕਰਕੇ ਸ਼ਾਂਤ ਮਨ ਨਾਲ ਦੌੜਨਾ', 'ਪਤੰਗ ਨੂੰ ਪੱਥਰਾਂ ਉੱਤੇ ਸੁੱਟਣਾ', 'ਉਦਾਸ ਹੋ ਕੇ ਘਰ ਮੁੜ ਜਾਣਾ'],
            correctIndex: 0,
            explanation: 'ਸੰਨੀ ਨੇ ਲੰਮਾ ਸਾਹ ਲਿਆ ਅਤੇ ਪੱਕੇ ਕਦਮਾਂ ਨਾਲ ਦੌੜ ਕੇ ਪਤੰਗ ਉਡਾਈ।',
          },
        ],
      },
      {
        id: 'story_mina_pa',
        title: 'ਮੀਨਾ ਅਤੇ ਦਰਿਆ ਦਾ ਕੰਢਾ',
        synopsis: 'ਇੱਕ ਦਿਆਲੂ ਨਿੱਕੀ ਹੱਥਣੀ ਆਪਣੀ ਸੂਝ-ਬੂਝ ਨਾਲ ਦਰਿਆ ਕੰਢੇ ਡਿੱਗੇ ਆਲ੍ਹਣੇ ਨੂੰ ਬਚਾਉਂਦੀ ਹੈ।',
        emoji: '🐘',
        readingLevel: 'growing',
        estimatedMinutes: 4,
        paragraphs: [
          'ਬਰਸਾਤ ਦੇ ਮੌਸਮ ਵਿੱਚ ਜੰਗਲ ਦਾ ਦਰਿਆ ਪਾਣੀ ਨਾਲ ਨੱਕੋ-ਨੱਕ ਭਰਿਆ ਹੋਇਆ ਸੀ। ਮੀਨਾ ਨਾਂ ਦੀ ਨਿੱਕੀ ਹੱਥਣੀ ਨੂੰ ਠੰਢੇ ਪਾਣੀ ਵਿੱਚ ਨਹਾਉਣਾ ਬਹੁਤ ਪਸੰਦ ਸੀ। ਉਸਦੀਆਂ ਅੱਖਾਂ ਬਹੁਤ ਦਿਆਲੂ ਅਤੇ ਸ਼ਾਂਤ ਸਨ।',
          'ਪਾਣੀ ਪੀਂਦਿਆਂ ਮੀਨਾ ਨੇ ਇੱਕ ਨਿੱਕੀ ਜਿਹੀ ਚਿੜੀ ਦੀ ਡਰੀ ਹੋਈ ਆਵਾਜ਼ ਸੁਣੀ। ਇੱਕ ਤਿਲਕਵੇਂ ਪੱਥਰ ਕੋਲ ਚਿੜੀ ਦੇ ਬੋਟ ਦਾ ਆਲ੍ਹਣਾ ਪਾਣੀ ਦੀ ਤੇਜ਼ ਧਾਰ ਦੇ ਬਿਲਕੁਲ ਕੰਢੇ ਤੇ ਡੋਲ ਰਿਹਾ ਸੀ।',
          'ਮੀਨਾ ਨੇ ਬਹੁਤ ਧਿਆਨ ਨਾਲ ਪੈਰ ਰੱਖੇ ਤਾਂ ਜੋ ਪਾਣੀ ਦੇ ਛਿੱਟੇ ਨਾ ਪੈਣ। ਉਸਨੇ ਕੰਢੇ ਤੋਂ ਇੱਕ ਬਾਂਸ ਦੀ ਡੰਡੀ ਚੁੱਕੀ ਅਤੇ ਸੁੰਡ ਨਾਲ ਆਲ੍ਹਣੇ ਨੂੰ ਹੌਲੀ ਜਿਹੇ ਸੁੱਕੀ ਘਾਹ ਵੱਲ ਖਿਸਕਾ ਦਿੱਤਾ। ਮਾਂ ਚਿੜੀ ਨੇ ਖ਼ੁਸ਼ ਹੋ ਕੇ ਮੀਨਾ ਦਾ ਧੰਨਵਾਦ ਕੀਤਾ।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_mina_pa_1',
            question: 'ਮੀਨਾ ਨੇ ਦਰਿਆ ਕੋਲ ਕਿਹੜੀ ਮੁਸ਼ਕਲ ਵੇਖੀ?',
            options: ['ਚਿੜੀ ਦਾ ਆਲ੍ਹਣਾ ਪਾਣੀ ਵਿੱਚ ਰੁੜ੍ਹਨ ਵਾਲਾ ਸੀ', 'ਦਰਿਆ ਵਿੱਚ ਇੱਕ ਵੱਡਾ ਮਗਰਮੱਛ ਫਸਿਆ ਸੀ', 'ਜੰਗਲ ਦਾ ਰਸਤਾ ਬੰਦ ਹੋ ਗਿਆ ਸੀ'],
            correctIndex: 0,
            explanation: 'ਚਿੜੀ ਦਾ ਨਿੱਕਾ ਆਲ੍ਹਣਾ ਪਾਣੀ ਦੀ ਤੇਜ਼ ਧਾਰ ਦੇ ਬਿਲਕੁਲ ਕੋਲ ਫਸਿਆ ਹੋਇਆ ਸੀ।',
          },
          {
            id: 'q_mina_pa_2',
            question: 'ਮੀਨਾ ਨੇ ਆਲ੍ਹਣੇ ਨੂੰ ਕਿਵੇਂ ਸੁਰੱਖਿਅਤ ਕੀਤਾ?',
            options: ['ਬਾਂਸ ਦੀ ਡੰਡੀ ਨਾਲ ਆਲ੍ਹਣੇ ਨੂੰ ਸੁੱਕੀ ਥਾਂ ਵੱਲ ਖਿਸਕਾਇਆ', 'ਆਲ੍ਹਣੇ ਉੱਤੇ ਤੇਜ਼ ਪਾਣੀ ਸੁੱਟਿਆ', 'ਜ਼ੋਰ-ਜ਼ੋਰ ਨਾਲ ਚਿੰਘਾੜਿਆ'],
            correctIndex: 0,
            explanation: 'ਮੀਨਾ ਨੇ ਸਿਆਣਪ ਨਾਲ ਬਾਂਸ ਦੀ ਡੰਡੀ ਰਾਹੀਂ ਆਲ੍ਹਣਾ ਸੁੱਕੀ ਥਾਂ ਤੇ ਪਹੁੰਚਾ ਦਿੱਤਾ।',
          },
        ],
      },
      {
        id: 'story_sunflower_pa',
        title: 'ਸੂਰਜਮੁਖੀ ਅਤੇ ਸੁਨਹਿਰੀ ਸਵੇਰ',
        synopsis: 'ਮਿੱਟੀ ਵਿੱਚ ਦਬਿਆ ਨਿੱਕਾ ਬੀਜ ਸਿੱਖਦਾ ਹੈ ਕਿ ਸਬਰ ਅਤੇ ਮਿਹਨਤ ਨਾਲ ਸੁੰਦਰ ਫੁੱਲ ਖਿੜਦਾ ਹੈ।',
        emoji: '🌻',
        readingLevel: 'early',
        estimatedMinutes: 3,
        paragraphs: [
          'ਨਰਮ ਕਾਲੀ ਮਿੱਟੀ ਦੇ ਹੇਠਾਂ ਸੂਰਜਮੁਖੀ ਦਾ ਇੱਕ ਨਿੱਕਾ ਬੀਜ ਸ਼ਾਂਤ ਪਿਆ ਸੀ। ਉਸਨੂੰ ਸਿਰਫ਼ ਠੰਢੀ ਧਰਤੀ ਅਤੇ ਉੱਪਰੋਂ ਪੈਂਦੀਆਂ ਮੀਂਹ ਦੀਆਂ ਬੂੰਦਾਂ ਦੀ ਮਿੱਠੀ ਆਵਾਜ਼ ਸੁਣਾਈ ਦਿੰਦੀ ਸੀ।',
          'ਹਰ ਰਾਤ ਮੀਂਹ ਦਾ ਪਾਣੀ ਮਿੱਟੀ ਨੂੰ ਤਰ ਕਰਦਾ ਸੀ। ਬੀਜ ਨੇ ਪਾਣੀ ਪੀਤਾ ਅਤੇ ਆਪਣੀਆਂ ਨਿੱਕੀਆਂ ਜੜ੍ਹਾਂ ਹੇਠਾਂ ਵੱਲ ਫੈਲਾਉਣੀਆਂ ਸ਼ੁਰੂ ਕੀਤੀਆਂ। ਛੇਤੀ ਹੀ ਇੱਕ ਹਰਾ ਅੰਗੂਰ ਮਿੱਟੀ ਵਿੱਚੋਂ ਬਾਹਰ ਨਿਕਲ ਆਇਆ।',
          'ਹਫ਼ਤਿਆਂ ਬਾਅਦ ਉਸਦਾ ਤਣਾ ਮਜ਼ਬੂਤ ਹੋ ਗਿਆ ਅਤੇ ਪੱਤੇ ਝੂਲਣ ਲੱਗੇ। ਇੱਕ ਸੁਨਹਿਰੀ ਸਵੇਰ ਉਸਦੀਆਂ ਪੀਲੀਆਂ ਪੱਤੀਆਂ ਸੂਰਜ ਵੱਲ ਖਿੜ ਪਈਆਂ। ਸੂਰਜਮੁਖੀ ਮੁਸਕਰਾਇਆ ਕਿਉਂਕਿ ਸਬਰ ਨੇ ਉਸਨੂੰ ਖ਼ੂਬਸੂਰਤ ਫੁੱਲ ਬਣਾ ਦਿੱਤਾ ਸੀ।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_sunflower_pa_1',
            question: 'ਮਿੱਟੀ ਵਿਚਲੇ ਬੀਜ ਨੂੰ ਉੱਗਣ ਵਿੱਚ ਕਿਸਨੇ ਮਦਦ ਕੀਤੀ?',
            options: ['ਮੀਂਹ ਦੇ ਪਾਣੀ ਅਤੇ ਮਿੱਟੀ ਦੀ ਨਮੀ ਨੇ', 'ਤੇਜ਼ ਤੂਫ਼ਾਨ ਅਤੇ ਹਨੇਰੀ ਨੇ', 'ਇੱਕ ਬੰਦ ਕੱਚ ਦੇ ਬਰਤਨ ਨੇ'],
            correctIndex: 0,
            explanation: 'ਮੀਂਹ ਦੇ ਪਾਣੀ ਨੇ ਬੀਜ ਨੂੰ ਜਗਾ ਕੇ ਨਵਾਂ ਜੀਵਨ ਦਿੱਤਾ।',
          },
          {
            id: 'q_sunflower_pa_2',
            question: 'ਪੀਲੀਆਂ ਪੱਤੀਆਂ ਖਿੜਨ ਤੇ ਸੂਰਜਮੁਖੀ ਨੇ ਕੀ ਮਹਿਸੂਸ ਕੀਤਾ?',
            options: ['ਸਬਰ ਅਤੇ ਹੌਲੀ-ਹੌਲੀ ਵਧਣ ਨਾਲ ਸੁੰਦਰ ਨਤੀਜਾ ਮਿਲਦਾ ਹੈ', 'ਉਸਨੂੰ ਵਾਪਸ ਮਿੱਟੀ ਵਿੱਚ ਲੁਕ ਜਾਣਾ ਚਾਹੀਦਾ ਹੈ', 'ਫੁੱਲ ਸਿਰਫ਼ ਰਾਤ ਨੂੰ ਖਿੜਦੇ ਹਨ'],
            correctIndex: 0,
            explanation: 'ਸੂਰਜਮੁਖੀ ਨੇ ਸਮਝ ਲਿਆ ਕਿ ਸਬਰ ਨਾਲ ਕੀਤੀ ਮਿਹਨਤ ਹਮੇਸ਼ਾ ਰੰਗ ਲਿਆਉਂਦੀ ਹੈ।',
          },
        ],
      },
      {
        id: 'story_banyan_pa',
        title: 'ਬੋਹੜ ਟਾਪੂ ਦਾ ਭੇਤ',
        synopsis: 'ਮਾਇਆ ਅਤੇ ਕਬੀਰ ਬਗਲਿਆਂ ਦੀ ਰਾਖੀ ਲਈ ਆਪਣੀ ਬੇੜੀ ਲੈ ਕੇ ਕੁਦਰਤ ਦੀ ਖੋਜ ਤੇ ਨਿਕਲੇ।',
        emoji: '🛶',
        readingLevel: 'confident',
        estimatedMinutes: 5,
        paragraphs: [
          'ਸਵੇਰ ਦੀ ਸੰਘਣੀ ਧੁੰਦ ਵਿੱਚ ਮਾਇਆ ਅਤੇ ਕਬੀਰ ਨੇ ਆਪਣੀ ਲੱਕੜ ਦੀ ਬੇੜੀ ਪਾਣੀ ਵਿੱਚ ਉਤਾਰੀ। ਝੀਲ ਦਾ ਪਾਣੀ ਸ਼ੀਸ਼ੇ ਵਾਂਗ ਸ਼ਾਂਤ ਸੀ ਜਿਸ ਵਿੱਚ ਬੋਹੜ ਦੇ ਦਰੱਖਤਾਂ ਦਾ ਪਰਛਾਵਾਂ ਪੈ ਰਿਹਾ ਸੀ। ਉਹ ਪਰਵਾਸੀ ਚਿੱਟੇ ਬਗਲਿਆਂ ਦੇ ਆਲ੍ਹਣਿਆਂ ਦੀ ਰਾਖੀ ਕਰਨ ਆਏ ਸਨ।',
          'ਕਬੀਰ ਨੇ ਬੜੇ ਸ਼ਾਂਤ ਢੰਗ ਨਾਲ ਚੱਪੂ ਚਲਾਇਆ ਤਾਂ ਕਿ ਕੋਈ ਆਵਾਜ਼ ਨਾ ਹੋਵੇ। ਅਚਾਨਕ ਬਰਫ਼ ਵਰਗੇ ਚਿੱਟੇ ਬਗਲਿਆਂ ਦੀ ਜੋੜੀ ਉੱਡ ਕੇ ਬੋਹੜ ਦੇ ਟਾਪੂ ਤੇ ਉੱਤਰੀ। ਮਾਇਆ ਨੇ ਆਪਣੀ ਦੂਰਬੀਨ ਨਾਲ ਉਹਨਾਂ ਦੇ ਆਲ੍ਹਣੇ ਦੀ ਥਾਂ ਨੋਟ ਕੀਤੀ।',
          'ਦਰੱਖਤ ਦੀਆਂ ਸੁਰੱਖਿਅਤ ਟਾਹਣੀਆਂ ਵਿੱਚ ਤਿੰਨ ਨੰਨ੍ਹੇ ਬੱਚੇ ਬੈਠੇ ਸਨ। ਬੱਚਿਆਂ ਨੇ ਕੰਢੇ ਤੇ ਲਾਲ ਝੰਡੀਆਂ ਲਾ ਦਿੱਤੀਆਂ ਤਾਂ ਜੋ ਮੱਛੀਆਂ ਫੜਨ ਵਾਲੀਆਂ ਕਿਸ਼ਤੀਆਂ ਪਰ੍ਹਾਂ ਹੀ ਰਹਿਣ। ਬੇਜ਼ੁਬਾਨ ਜੀਵਾਂ ਦੀ ਰਾਖੀ ਕਰਕੇ ਦੋਵਾਂ ਨੂੰ ਬਹੁਤ ਸਕੂਨ ਮਿਲਿਆ।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_banyan_pa_1',
            question: 'ਮਾਇਆ ਅਤੇ ਕਬੀਰ ਝੀਲ ਵਿੱਚ ਕਿਉਂ ਗਏ ਸਨ?',
            options: ['ਪਰਵਾਸੀ ਚਿੱਟੇ ਬਗਲਿਆਂ ਦੀ ਰਾਖੀ ਅਤੇ ਨਿਗਰਾਨੀ ਲਈ', 'ਬਾਜ਼ਾਰ ਲਈ ਮੱਛੀਆਂ ਫੜਨ ਵਾਸਤੇ', 'ਖ਼ਜ਼ਾਨਾ ਲੱਭਣ ਲਈ'],
            correctIndex: 0,
            explanation: 'ਉਹ ਕੁਦਰਤੀ ਰਾਖਵੇਂ ਖੇਤਰ ਵਿੱਚ ਬਗਲਿਆਂ ਦੀ ਸੁਰੱਖਿਆ ਲਈ ਗਏ ਸਨ।',
          },
          {
            id: 'q_banyan_pa_2',
            question: 'ਬੱਚਿਆਂ ਨੇ ਨੰਨ੍ਹੇ ਚੂਚਿਆਂ ਦੀ ਰਾਖੀ ਕਿਵੇਂ ਕੀਤੀ?',
            options: ['ਕੰਢੇ ਤੇ ਲਾਲ ਝੰਡੀਆਂ ਲਾ ਕੇ ਕਿਸ਼ਤੀਆਂ ਨੂੰ ਦੂਰ ਰੱਖਿਆ', 'ਆਲ੍ਹਣਾ ਘਰ ਲੈ ਆਏ', 'ਉੱਚੀ-ਉੱਚੀ ਰੌਲਾ ਪਾਇਆ'],
            correctIndex: 0,
            explanation: 'ਉਨ੍ਹਾਂ ਨੇ ਝੰਡੀਆਂ ਲਗਾ ਕੇ ਹੋਰ ਕਿਸ਼ਤੀਆਂ ਨੂੰ ਦੂਰ ਰਹਿਣ ਦਾ ਸੰਕੇਤ ਦਿੱਤਾ।',
          },
        ],
      },
      {
        id: 'story_nilgiri_pa',
        title: 'ਨੀਲਗਿਰੀ ਦੀ ਮਿੱਠੀ ਬੰਸਰੀ',
        synopsis: 'ਦੇਵ ਨੇ ਪਹਾੜ ਤੇ ਸੁੱਕੇ ਬਾਂਸ ਤੋਂ ਬੰਸਰੀ ਬਣਾ ਕੇ ਆਪਣੇ ਰਵਾਇਤੀ ਸੰਗੀਤ ਦੀ ਸ਼ਕਤੀ ਨੂੰ ਪਛਾਣਿਆ।',
        emoji: '🎶',
        readingLevel: 'confident',
        estimatedMinutes: 5,
        paragraphs: [
          'ਨੀਲਗਿਰੀ ਦੀਆਂ ਪਹਾੜੀਆਂ ਤੇ ਚਾਹ ਦੇ ਬਾਗ਼ ਹਰੇ ਗ਼ਲੀਚੇ ਵਾਂਗ ਵਿਛੇ ਹੋਏ ਸਨ। ਬਾਰਾਂ ਸਾਲਾਂ ਦਾ ਦੇਵ ਇੱਕ ਸੁੱਕੇ ਬਾਂਸ ਦੇ ਟੁਕੜੇ ਨੂੰ ਵੇਖ ਰਿਹਾ ਸੀ। ਉਸਦੀ ਦਾਦੀ ਨੇ ਕਿਹਾ ਸੀ ਕਿ ਬੰਸਰੀ ਸਿਰਫ਼ ਤਰਾਸ਼ੀ ਨਹੀਂ ਜਾਂਦੀ, ਉਸਦੀ ਧੁਨ ਨੂੰ ਪਹਿਲਾਂ ਮਨ ਵਿੱਚ ਸੁਣਨਾ ਪੈਂਦਾ ਹੈ।',
          'ਦੇਵ ਨੇ ਗਰਮ ਤਾਰ ਨਾਲ ਬਾਂਸ ਵਿੱਚ ਛੇ ਛੇਕ ਕੀਤੇ। ਜਦੋਂ ਪਹਿਲੀ ਵਾਰ ਫੂਕ ਮਾਰੀ ਤਾਂ ਸਿਰਫ਼ ਹਵਾ ਦੀ ਸੀਟੀ ਵੱਜੀ। ਪਰ ਦੇਵ ਹਿੰਮਤ ਨਹੀਂ ਹਾਰਿਆ। ਉਸਨੇ ਬਾਂਸ ਨੂੰ ਚੰਗੀ ਤਰ੍ਹਾਂ ਸਾਫ਼ ਕੀਤਾ ਅਤੇ ਸ਼ਾਂਤ ਮਨ ਨਾਲ ਫੂਕ ਮਾਰੀ।',
          'ਹਵਾ ਵਿੱਚ ਸ਼ਹਿਦ ਵਰਗੀ ਮਿੱਠੀ ਧੁਨ ਗੂੰਜ ਉੱਠੀ। ਸ਼ਾਮ ਨੂੰ ਪਿੰਡ ਦੀ ਸੱਥ ਵਿੱਚ ਦੇਵ ਨੇ ਵਾਢੀ ਦਾ ਲੋਕ ਗੀਤ ਵਜਾਇਆ। ਬਜ਼ੁਰਗਾਂ ਨੇ ਅੱਖਾਂ ਮੀਚ ਕੇ ਖ਼ੁਸ਼ੀ ਦੇ ਹੰਝੂਆਂ ਨਾਲ ਉਸਨੂੰ ਅਸੀਸਾਂ ਦਿੱਤੀਆਂ।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_nilgiri_pa_1',
            question: 'ਜਦੋਂ ਬੰਸਰੀ ਵਿੱਚੋਂ ਸਹੀ ਆਵਾਜ਼ ਨਾ ਆਈ ਤਾਂ ਦੇਵ ਨੇ ਕੀ ਕੀਤਾ?',
            options: ['ਧੀਰਜ ਨਾਲ ਬਾਂਸ ਨੂੰ ਠੀਕ ਕੀਤਾ ਅਤੇ ਸ਼ਾਂਤ ਹੋ ਕੇ ਵਜਾਇਆ', 'ਗੁੱਸੇ ਵਿੱਚ ਬਾਂਸ ਤੋੜ ਦਿੱਤਾ', 'ਸੰਗੀਤ ਸਿੱਖਣਾ ਛੱਡ ਦਿੱਤਾ'],
            correctIndex: 0,
            explanation: 'ਦੇਵ ਨੇ ਸਬਰ ਰੱਖਿਆ ਅਤੇ ਲਗਾਤਾਰ ਮਿਹਨਤ ਨਾਲ ਧੁਨ ਕੱਢੀ।',
          },
          {
            id: 'q_nilgiri_pa_2',
            question: 'ਪਿੰਡ ਦੇ ਬਜ਼ੁਰਗ ਦੇਵ ਦੀ ਬੰਸਰੀ ਸੁਣ ਕੇ ਕਿਉਂ ਖ਼ੁਸ਼ ਹੋਏ?',
            options: ['ਉਸਨੇ ਪੁਰਾਣਾ ਰਵਾਇਤੀ ਵਾਢੀ ਦਾ ਗੀਤ ਵਜਾਇਆ', 'ਬੰਸਰੀ ਬਹੁਤ ਉੱਚੀ ਵੱਜ ਰਹੀ ਸੀ', 'ਉਸਨੇ ਅੰਗਰੇਜ਼ੀ ਧੁਨ ਵਜਾਈ'],
            correctIndex: 0,
            explanation: 'ਬਜ਼ੁਰਗ ਆਪਣੇ ਵਿਰਸੇ ਦੀ ਪਿਆਰੀ ਧੁਨ ਸੁਣ ਕੇ ਬਹੁਤ ਪ੍ਰਭਾਵਿਤ ਹੋਏ।',
          },
        ],
      },
    ],

    Tamil: [
      {
        id: 'story_kite_ta',
        title: 'சன்னியும் துணிச்சலான சிறு பட்டமும்',
        synopsis: 'பொறுமையாகவும் சீராகவும் ஓடினால் பட்டம் வானில் உயரே பறக்கும் என்பதை சன்னி உணர்கிறாள்.',
        emoji: '🪁',
        readingLevel: 'early',
        estimatedMinutes: 3,
        paragraphs: [
          'ஒரு மெல்லிய காற்று வீசும் மாலை வேளையில், சன்னி தனது பளபளப்பான சிவப்புப் பட்டத்துடன் புல்வெளி குன்றுக்குச் சென்றாள். குளிர்ந்த காற்றில் பசுமையான புல்வெளி அலைகளைப் போல அசைந்தது. சன்னி தனது கைகளில் நூலை உறுதியாகப் பிடித்திருந்தாள்.',
          'முதலில் பட்டம் தள்ளாடி இரண்டு முறை மென்மையான புல்லின் மீது விழுந்தது. சன்னி ஒரு நீண்ட மூச்சை எடுத்தாள். அவளது தாத்தா கூறியது நினைவுக்கு வந்தது: “பட்டம் கவலையினால் பறப்பதில்லை; அமைதியான மனதுடனும் உறுதியான அடிகளுடனும் ஓடும்போதுதான் அது வானைத் தொடும்.”',
          'சன்னி நூலை சற்று தளர்த்தி மலையை நோக்கி ஓடத் தொடங்கினாள். அவளது வேகம் கூடியதும், காற்று பட்டத்தை மேலே தூக்கியது. சிவப்புப் பட்டம் நீல வானில் அழகாக நடனமாடியது. சன்னி மகிழ்ச்சியில் சிரித்தாள், அவளது நண்பர்கள் கைதட்டி ஆரவாரம் செய்தனர்.',
        ],
        comprehensionQuestions: [
          {
            id: 'q_kite_ta_1',
            question: 'முதலில் சன்னியின் பட்டம் கீழே விழுந்தது ஏன்?',
            options: ['காற்று இன்னும் பட்டத்தை சரியாகத் தூக்கவில்லை', 'நூல் பாதியிலேயே அறுந்துவிட்டது', 'மலையில் பலத்த மழை பெய்தது'],
            correctIndex: 0,
            explanation: 'பட்டம் உயரப் பறப்பதற்கு சரியான காற்றும் சீரான ஓட்டமும் தேவைப்பட்டது.',
          },
          {
            id: 'q_kite_ta_2',
            question: 'மீண்டும் முயன்றபோது சன்னிக்கு உதவியது எது?',
            options: ['தாத்தாவின் அறிவுரையை நினைத்து அமைதியான மனதுடன் ஓடியது', 'பட்டத்தை பாறைகள் மீது எறிந்தது', 'வருத்தப்பட்டு வீட்டுக்குத் திரும்பியது'],
            correctIndex: 0,
            explanation: 'சன்னி ஆழ்ந்த மூச்சு எடுத்து, உறுதியான அடிகளுடன் ஓடி பட்டத்தை உயர்த்தினாள்.',
          },
        ],
      },
      {
        id: 'story_mina_ta',
        title: 'மீனாவும் ஆற்றுப் படுகையும்',
        synopsis: 'அன்பான இளம் பெண் யானை தன் விவேகத்தால் ஆற்றில் விழவிருந்த பறவைக் கூட்டைக் காப்பாற்றுகிறது.',
        emoji: '🐘',
        readingLevel: 'growing',
        estimatedMinutes: 4,
        paragraphs: [
          'மழைக்காலத்தில் காட்டு ஆற்றில் தண்ணீர் வெள்ளமெனப் பாய்ந்தோடியது. மீனா என்ற இளம் பெண் யானைக்கு குளிர்ந்த நீரில் குளிப்பது மிகவும் பிடிக்கும். அவளது கண்கள் மிகுந்த கருணையுடன் இருந்தன.',
          'தண்ணீர் அருந்தும்போது மீனா ஒரு சிறிய பறவையின் பரிதாபமான அழுகையைக் கேட்டது. வழுக்கும் பாறை அருகே, சிறிய சிட்டுக் குருவியின் கூடு ஆற்றின் வேகமான நீரோட்டத்தின் விளிம்பில் தள்ளாடிக்கொண்டிருந்தது.',
          'தண்ணீர் தெறிக்காமல் இருக்க மீனா மிகவும் கவனமாக அடி எடுத்து வைத்தது. கரையில் கிடந்த ஒரு மூங்கில் தடியைத் தன் தும்பிக்கையால் எடுத்து, கூட்டினை மெதுவாக உலர்வான பாசிப் பகுதிக்கு நகர்த்தியது. தாய் குருவி மகிழ்ச்சியுடன் கீச்சிட்டு நன்றி கூறியது.',
        ],
        comprehensionQuestions: [
          {
            id: 'q_mina_ta_1',
            question: 'ஆற்றின் அருகே மீனா பார்த்த ஆபத்து என்ன?',
            options: ['குருவியின் கூடு ஆற்று நீரில் மூழ்கும் நிலையில் இருந்தது', 'ஒரு பெரிய முதலை பாறையில் சிக்கியிருந்தது', 'காட்டுப் பாதை அடைபட்டிருந்தது'],
            correctIndex: 0,
            explanation: 'சிட்டுக் குருவியின் கூடு ஆற்றின் வேகமான நீரோட்டத்தில் விழும் அபாயத்தில் இருந்தது.',
          },
          {
            id: 'q_mina_ta_2',
            question: 'மீனா பறவைக் கூட்டினை எவ்வாறு பாதுகாத்தது?',
            options: ['மூங்கில் தடியைப் பயன்படுத்தி கூட்டினை உலர்வான நிலத்திற்கு நகர்த்தியது', 'கூட்டின் மீது வேகமாய் தண்ணீர் தெளித்தது', 'சத்தமாகப் பிளிறியது'],
            correctIndex: 0,
            explanation: 'மீனா விவேகமாக மூங்கில் தடியைக் கொண்டு கூட்டினைப் பாதுகாப்பான இடத்திற்கு நகர்த்தியது.',
          },
        ],
      },
      {
        id: 'story_sunflower_ta',
        title: 'சூரியகாந்தியும் விடியலும்',
        synopsis: 'மண்ணில் புதைந்த சிறு விதை, பொறுமையுடன் காத்திருந்தால் அழகான பூவாக மலரலாம் என்பதைக் கற்கிறது.',
        emoji: '🌻',
        readingLevel: 'early',
        estimatedMinutes: 3,
        paragraphs: [
          'மென்மையான கருப்பு மண்ணின் அடியில் சூரியகாந்தியின் சிறிய விதை அமைதியாக உறங்கிக் கொண்டிருந்தது. அதற்கு மேலே விழும் மழைத்துளிகளின் இனிய ஓசை மட்டுமே கேட்டது.',
          'ஒவ்வொரு இரவும் மழைநீர் மண்ணை நனைத்தது. அந்த விதை தண்ணீரை உறிஞ்சி, தன் சிறிய வேர்களைக் கீழ்நோக்கி அனுப்பியது. விரைவில் ஒரு சிறிய பச்சைக் குருத்து மண்ணைப் பிளந்து மேலே வந்தது.',
          'வாரங்கள் கடந்ததும் தண்டு உயர்ந்து அழகான இலைகள் காற்றில் அசைந்தன. ஒரு பொன் விடியலில் அதன் மஞ்சள் இதழ்கள் சூரியனை நோக்கி மலர்ந்தன. பொறுமையே தன்னை இவ்வளவு அழகாக்கியது என்பதை சூரியகாந்தி உணர்ந்து புன்னகைத்தது.',
        ],
        comprehensionQuestions: [
          {
            id: 'q_sunflower_ta_1',
            question: 'மண்ணில் இருந்த விதை வளர உதவியது எது?',
            options: ['மழைத்துளிகளும் மண்ணின் ஈரப்பதமும்', 'கடும் புயலும் சூறாவளியும்', 'ஒரு மூடிய கண்ணாடி பாட்டில்'],
            correctIndex: 0,
            explanation: 'மழைநீரும் மண்ணின் ஊட்டச்சத்தும் விதை துளிர்க்க உதவியது.',
          },
          {
            id: 'q_sunflower_ta_2',
            question: 'இதழ்கள் விரிந்தபோது சூரியகாந்தி என்ன உணர்ந்தது?',
            options: ['பொறுமையும் சீரான வளர்ச்சியும் சிறந்த பலனைத் தரும்', 'மீண்டும் மண்ணுக்குள் சென்று ஒளிந்து கொள்ள வேண்டும்', 'பூக்கள் இரவில் மட்டுமே மலரும்'],
            correctIndex: 0,
            explanation: 'சூரியகாந்தி பொறுமையுடன் வளர்ந்ததன் நற்பலனை உணர்ந்தது.',
          },
        ],
      },
      {
        id: 'story_banyan_ta',
        title: 'ஆலமரத் தீவின் ரகசியம்',
        synopsis: 'மாயாவும் கபீரும் வெண் நாரைகளைப் பாதுகாக்க படகில் சென்று புதிய கூடமைப்பைக் கண்டறிகின்றனர்.',
        emoji: '🛶',
        readingLevel: 'confident',
        estimatedMinutes: 5,
        paragraphs: [
          'அதிகாலைப் பனி மூட்டத்தில் மாயாவும் கபீரும் தங்கள் மரப் படகை ஆற்றில் செலுத்தினர். பளபளக்கும் கண்ணாடி போன்ற தண்ணீரில் ஆலமரத்தின் விழுதுகள் அழகாய் தெரிந்தன. சரணாலயத்தின் வெண் நாரைகளைக் கணக்கெடுப்பதே அவர்களின் முக்கிய பணியாக இருந்தது.',
          'கபீர் அமைதியாக துடுப்புப் போட்டான். பனி மூட்டத்தின் இடையே வெண் நாரை ஜோடி ஒன்று ஆலமரத் தீவில் வந்து அமர்ந்தது. மாயா தன் தொலைநோக்கியால் அவற்றின் இருப்பிடத்தைக் குறித்துக்கொண்டாள்.',
          'மரத்தின் பாதுகாப்பான பொந்தில் மூன்று சிறு குஞ்சுகள் இளைப்பாறிக்கொண்டிருந்தன. அந்தப் பகுதிக்கு மீன்பிடி படகுகள் வராமல் இருக்கச் சிறுவர்கள் எல்லைக் கொடிகளை நட்டனர். பறவைகளைப் பாதுகாத்த மகிழ்ச்சி அவர்களை நிறைவு செய்தது.',
        ],
        comprehensionQuestions: [
          {
            id: 'q_banyan_ta_1',
            question: 'மாயாவும் கபீரும் படகில் எதற்காகச் சென்றனர்?',
            options: ['வெண் நாரைகளைக் கணக்கெடுக்கவும் பாதுகாக்கவும்', 'மீன் பிடிப்பதற்காக', 'புதையல் தேடுவதற்காக'],
            correctIndex: 0,
            explanation: 'அவர்கள் பறவைகள் சரணாலயப் பணிக்காகச் சென்றனர்.',
          },
          {
            id: 'q_banyan_ta_2',
            question: 'பறவைக் குஞ்சுகளை சிறுவர்கள் எவ்வாறு பாதுகாத்தனர்?',
            options: ['எல்லைக் கொடிகள் நட்டு படகுகளை விலகிச் செல்ல வைத்தனர்', 'கூட்டைத் தங்கள் வீட்டிற்கு எடுத்துச் சென்றனர்', 'சத்தமாக கத்தினர்'],
            correctIndex: 0,
            explanation: 'அவர்கள் எல்லைக் கொடிகள் மூலம் படகுகளுக்கு எச்சரிக்கை விடுத்தனர்.',
          },
        ],
      },
      {
        id: 'story_nilgiri_ta',
        title: 'நீலகிரியின் இனிய புல்லாங்குழல்',
        synopsis: 'தேவ் மலையில் மூங்கில் கொண்டு புல்லாங்குழல் செய்து பாரம்பரிய இசையின் இனிமையைக் கண்டறிகிறான்.',
        emoji: '🎶',
        readingLevel: 'confident',
        estimatedMinutes: 5,
        paragraphs: [
          'நீலகிரி மலையில் தேயிலைத் தோட்டங்கள் பச்சை கம்பளம்போல் விரிந்திருந்தன. பன்னிரண்டு வயது தேவ் ஒரு தங்க நிற மூங்கில் தடியைப் பார்த்துக்கொண்டிருந்தான். புல்லாங்குழல் வெறும் மரமல்ல, அதன் இசையை மனதில் உணர வேண்டும் என்று பாட்டி கூறியிருந்தார்.',
          'தேவ் சூடான தாமிரக் கம்பியால் மூங்கிலில் ஆறு சிறிய துளைகளை இட்டான். முதலில் ஊதியபோது வெறும் காற்றின் சத்தம் மட்டுமே வந்தது. ஆனால் தேவ் சோர்ந்து போகவில்லை. மூங்கிலை மெருகேற்றி, மெல்லிய தென்றல் போல ஊதினான்.',
          'தேன் போன்ற இனிய இசை பள்ளத்தாக்கில் ஒலித்தது. மாலையில் ஊர்த் திருவிழாவில் தேவ் பாரம்பரிய அறுவடைப் பாடலை வாசித்தான். பெரியவர்கள் கண்களில் ஆனந்தக் கண்ணீருடன் அவனுக்கு வாழ்த்துக் கூறினர்.',
        ],
        comprehensionQuestions: [
          {
            id: 'q_nilgiri_ta_1',
            question: 'முதலில் புல்லாங்குழல் ஒலிக்காதபோது தேவ் என்ன செய்தான்?',
            options: ['பொறுமையுடன் மூங்கிலை மெருகேற்றி மீண்டும் ஊதிப் பழகினான்', 'கோபத்தில் மூங்கிலை உடைத்தான்', 'இசையைக் கைவிட்டான்'],
            correctIndex: 0,
            explanation: 'தேவ் விடாமுயற்சியுடன் மீண்டும் பயிற்சி செய்தான்.',
          },
          {
            id: 'q_nilgiri_ta_2',
            question: 'ஊர்ப் பெரியவர்கள் ஏன் மகிழ்ச்சியடைந்தனர்?',
            options: ['அவன் பாரம்பரிய அறுவடைப் பாடலை வாசித்தான்', 'புல்லாங்குழல் மிகக் கடுமையான சத்தமிட்டது', 'அவன் மேலைநாட்டுப் பாடலை வாசித்தான்'],
            correctIndex: 0,
            explanation: 'தேவ் அவர்களின் சொந்தப் பாரம்பரியப் பாடலை வாசித்து மகிழ்வித்தான்.',
          },
        ],
      },
    ],

    Bengali: [
      {
        id: 'story_kite_bn',
        title: 'সানি এবং সাহসী ছোট ঘুড়ি',
        synopsis: 'সানি শিখল যে ধৈর্য এবং অবিচল পদক্ষেপে দৌড়ালে ঘুড়ি নীল আকাশে ডানা মেলে।',
        emoji: '🪁',
        readingLevel: 'early',
        estimatedMinutes: 3,
        paragraphs: [
          'এক মিষ্টি বাতাসের বিকেলে সানি তার উজ্জ্বল লাল ঘুড়ি নিয়ে সবুজ পাহাড়ের চূড়ায় গেল। শান্ত বাতাসে ঘাসগুলো সাগরের ঢেউয়ের মতো দুলছিল। সানি কাঠের লাটাইটি শক্ত করে হাতে ধরেছিল।',
          'প্রথমে ঘুড়িটি টলমল করে নরম ঘাসের ওপর দুবার পড়ে গেল। সানি একটি গভীর শ্বাস নিল। তার দাদুর কথা মনে পড়ল: “ঘুড়ি ভয়ে ওড়ে না; ঘুড়ি ওড়ে যখন তুমি শান্ত মন আর অবিচল পদক্ষেপে দৌড়াও।”',
          'সানি সুতো একটু ছেড়ে দিয়ে পাহাড়ের ঢাল ধরে দৌড়াতে লাগল। তার গতি বাড়ার সাথে সাথে এক ঝলক বাতাস ঘুড়িটিকে তুলে নিল। লাল ঘুড়ি নীল আকাশে নাচতে লাগল এবং নিচে থাকা বন্ধুরা হাততালি দিয়ে আনন্দ করল।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_kite_bn_1',
            question: 'প্রথমে সানির ঘুড়ি ঘাসে পড়ে গিয়েছিল কেন?',
            options: ['বাতাস তখনও ঘুড়িটিকে পুরোপুরি ওপরে ভাসায়নি', 'সুতো ছিঁড়ে গিয়েছিল', 'পাহাড়ে হঠাৎ ভারী বৃষ্টি শুরু হয়েছিল'],
            correctIndex: 0,
            explanation: 'ঘুড়ি ওড়ার জন্য সঠিক বাতাস ও অবিচল গতির প্রয়োজন ছিল।',
          },
          {
            id: 'q_kite_bn_2',
            question: 'দ্বিতীয়বার চেষ্টা করার সময় সানিকে কী সাহায্য করেছিল?',
            options: ['দাদুর উপদেশ মনে করে শান্ত মনে স্থির পদক্ষেপে দৌড়ানো', 'ঘুড়ি পাথরে আছড়ে ফেলা', 'কান্না করে বাড়ি ফিরে যাওয়া'],
            correctIndex: 0,
            explanation: 'সানি গভীর শ্বাস নিয়ে শান্ত মনে চেষ্টা চালিয়েছিল।',
          },
        ],
      },
      {
        id: 'story_mina_bn',
        title: 'মিনা এবং নদীর তীর',
        synopsis: 'একটি দয়ালু ছোট হাতি নিজের বুদ্ধিমত্তা দিয়ে নদীর ধারে পড়ে যাওয়া পাখির ছানাকে বাঁচায়।',
        emoji: '🐘',
        readingLevel: 'growing',
        estimatedMinutes: 4,
        paragraphs: [
          'বর্ষাকালে বনের নদীর জল কানায় কানায় ভরে উঠেছিল। মিনা নামের ছোট্ট হাতির ঠান্ডা জলে পা ডুবিয়ে স্নান করতে ভীষণ ভালো লাগত। তার চোখ দুটো ছিল শান্ত ও মায়াবী।',
          'জল পান করার সময় মিনা একটি করুণ কিচিরমিচির শব্দ শুনতে পেল। পিচ্ছিল পাথরের কাছে ছোট্ট বাবুই পাখির বাসাটি তীব্র স্রোতের ধারে কাঁপছিল।',
          'মিনা খুব সাবধানে পা ফেলল যাতে জল না ছিটকে যায়। সে নদীর পাড়ে পড়ে থাকা একটি শক্ত বাঁশের কঞ্চি শুঁড় দিয়ে তুলে নিল এবং বাসাটিকে নিরাপদে শুকনো শ্যাওলার ওপর সরিয়ে দিল। মা পাখি খুশিতে গান গেয়ে মিনাকে ধন্যবাদ জানাল।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_mina_bn_1',
            question: 'নদীর ধারে মিনা কী বিপদ দেখতে পেয়েছিল?',
            options: ['পাখির বাসাটি নদীর তীব্র জলে ভেসে যাওয়ার ঝুঁকিতে ছিল', 'পাথরে একটি কুমির আটকে ছিল', 'কাঠের সেতু ভেঙে পড়েছিল'],
            correctIndex: 0,
            explanation: 'পাখির বাসাটি নদীর তীব্র স্রোতের খুব কাছে টলমল করছিল।',
          },
          {
            id: 'q_mina_bn_1_2',
            question: 'মিনা কীভাবে পাখির বাসাটিকে বিপদমুক্ত করল?',
            options: ['বাঁশের কঞ্চি দিয়ে বাসাটিকে শুকনো শ্যাওলার ওপর সরিয়ে দিয়ে', 'জোরে জল ছিটিয়ে', 'জোরে ডেকে'],
            correctIndex: 0,
            explanation: 'মিনা শান্তভাবে বাঁশের সাহায্যে বাসাটিকে নিরাপদ শুকনো জায়গায় নিয়ে গেল।',
          },
        ],
      },
      {
        id: 'story_sunflower_bn',
        title: 'সূর্যমুখী এবং সোনালী সকাল',
        synopsis: 'মাটির নিচের ছোট্ট বীজ জানল যে ধৈর্য ধরে অপেক্ষা করলে একসময় সুন্দর ফুল ফোটে।',
        emoji: '🌻',
        readingLevel: 'early',
        estimatedMinutes: 3,
        paragraphs: [
          'নরম কালো মাটির নিচে সূর্যমুখীর ছোট্ট বীজটি ঘুমাচ্ছিল। সে কেবল বৃষ্টির ফোঁটার মধুর শব্দ শুনতে পাচ্ছিল।',
          'প্রতি রাতে বৃষ্টি মাটি ভিজিয়ে দিত। বীজটি জল পান করে তার সাদা ছোট শিকড় মাটির নিচে ছড়িয়ে দিল। শীঘ্রই একটি সবুজ চারা মাটি ভেদ করে বাইরে উঁকি দিল।',
          'ধীরে ধীরে গাছটি লম্বা হলো এবং এক সোনালী সকালে তার হলুদ পাপড়ি সূর্যের দিকে হাসিমুখে মেলে ধরল। সূর্যমুখী বুঝল ধৈর্যই তাকে এই রূপ দিয়েছে।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_sunflower_bn_1',
            question: 'বীজটিকে চারা হতে কী সাহায্য করেছিল?',
            options: ['বৃষ্টির জল ও মাটির আর্দ্রতা', 'প্রচণ্ড ঝড়', 'বন্ধ কাচের বোতল'],
            correctIndex: 0,
            explanation: 'বৃষ্টির জল বীজকে আর্দ্রতা দিয়ে নতুন জীবন দিল।',
          },
          {
            id: 'q_sunflower_bn_2',
            question: 'ফুল ফোটার পর সূর্যমুখী কী উপলব্ধি করল?',
            options: ['ধৈর্য ও সময় নিয়ে বাড়লে সুন্দর ফল পাওয়া যায়', 'আবার মাটির নিচে চলে যাওয়া উচিত', 'ফুল শুধু রাতে ফোটে'],
            correctIndex: 0,
            explanation: 'সূর্যমুখী বুঝল শান্ত ধৈর্য তাকে সুন্দর করে তুলেছে।',
          },
        ],
      },
      {
        id: 'story_banyan_bn',
        title: 'বটগাছ দ্বীপের রহস্য',
        synopsis: 'মায়া এবং কবির বুনো সাদা বকদের সুরক্ষার জন্য কাঠের নৌকায় এক রোমাঞ্চকর অভিযানে বের হলো।',
        emoji: '🛶',
        readingLevel: 'confident',
        estimatedMinutes: 5,
        paragraphs: [
          'ভোরের কুয়াশায় মায়া এবং কবির তাদের কাঠের নৌকা নদীতে ভাসাল। নদীর জল ছিল আয়নার মতো শান্ত, যাতে প্রাচীন বটগাছের শিকড়গুলো প্রতিবিম্বিত হচ্ছিল। তারা পরিযায়ী সাদা বকদের হিসাব রাখার অভিযানে বের হয়েছিল।',
          'কবির খুব শান্তভাবে বৈঠা বাইল যাতে কোনো শব্দ না হয়। হঠাৎ একজোড়া তুষারশুভ্র বক ডানা মেলে বটগাছ দ্বীপে নামল। মায়া দূরবীন দিয়ে তাদের বাসার অবস্থান লিখে নিল।',
          'গাছের সুরক্ষিত কোটরে তিনটি ছোট্ট ছানা নিরাপদে বিশ্রাম নিচ্ছিল। ছেলেমেয়েরা নদীর পাড়ে লাল পতাকা টাঙিয়ে দিল যাতে মাছ ধরার নৌকাগুলো দূরে থাকে। বুনো প্রাণীদের রক্ষা করতে পেরে তাদের মন আনন্দে ভরে উঠল।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_banyan_bn_1',
            question: 'মায়া ও কবির কেন নৌকায় করে নদীর মাঝে গিয়েছিল?',
            options: ['পরিযায়ী সাদা বকদের বাসা খুঁজে রক্ষা করতে', 'বাজারে বিক্রির জন্য মাছ ধরতে', 'গুপ্তধন খুঁজতে'],
            correctIndex: 0,
            explanation: 'তারা পাখি সংরক্ষণ ও পর্যবেক্ষণের কাজে নেমেছিল।',
          },
          {
            id: 'q_banyan_bn_2',
            question: 'তারা কীভাবে পাখির ছানাদের নিরাপদ রাখল?',
            options: ['সতর্কবার্তা হিসেবে লাল পতাকা টাঙিয়ে নৌকাগুলোকে দূরে রেখে', 'বাসাটি বাড়ি নিয়ে এসে', 'জোরে চিৎকার করে'],
            correctIndex: 0,
            explanation: 'তারা লাল পতাকা দিয়ে নৌকার চলাচলে সতর্কতা জারি করেছিল।',
          },
        ],
      },
      {
        id: 'story_nilgiri_bn',
        title: 'নীলগিরির মিষ্টি বাঁশি',
        synopsis: 'দেব পাহাড়ের চূড়ায় বাঁশের বাঁশি বানিয়ে তার ঐতিহ্যবাহী সুরের জাদু আবিষ্কার করল।',
        emoji: '🎶',
        readingLevel: 'confident',
        estimatedMinutes: 5,
        paragraphs: [
          'নীলগিরি পাহাড়ে চায়ের বাগানগুলো সবুজ গালিচার মতো বিছানো ছিল। বারো বছরের দেব একটি শুকনো বাঁশের কঞ্চি হাতে নিয়ে বসেছিল। তার ঠাকুমা শিখিয়েছিলেন যে বাঁশি কেবল কাটা হয় না, তার সুরটি আগে মনে অনুভব করতে হয়।',
          'দেব গরম তার দিয়ে বাঁশে ছয়টি ছিদ্র করল। প্রথমবার ফুঁ দিলে শুধু বাতাসের শিষ শোনা গেল। কিন্তু দেব হাল ছাড়ল না। সে বাঁশটিকে সুন্দর করে মসৃণ করল এবং শান্তভাবে ফুঁ দিল।',
          'বাতাসে মধুর সুর ভেসে উঠল। সেদিন সন্ধ্যায় গ্রামের আসরে দেব তাদের চিরাচরিত ফসলের গান বাজাল। মুরুব্বিরা চোখ বুজে আনন্দের অশ্রু নিয়ে তাকে প্রাণভরে আশীর্বাদ করলেন।',
        ],
        comprehensionQuestions: [
          {
            id: 'q_nilgiri_bn_1',
            question: 'বাঁশি থেকে সঠিক সুর না বের হলে দেব কী করেছিল?',
            options: ['ধৈর্য ধরে বাঁশটিকে মসৃণ করে পুনরায় চেষ্টা করেছিল', 'রেগে গিয়ে বাঁশ ভেঙে ফেলেছিল', 'গান বাজনা ছেড়ে দিয়েছিল'],
            correctIndex: 0,
            explanation: 'দেব ধৈর্য না হারিয়ে মনোযোগ দিয়ে অনুশীলন চালিয়েছিল।',
          },
          {
            id: 'q_nilgiri_bn_2',
            question: 'গ্রামের প্রবীণরা দেবের বাঁশি শুনে কেন খুশি হয়েছিলেন?',
            options: ['সে তাদের প্রিয় ঐতিহ্যবাহী লোকসুর বাজিয়েছিল', 'বাঁশি খুব কর্কশ বাজছিল', 'সে আধুনিক বিদেশি সুর বাজিয়েছিল'],
            correctIndex: 0,
            explanation: 'গ্রামের মানুষেরা তাদের প্রিয় ঐতিহ্যের সুর শুনে আপ্লুত হয়েছিলেন।',
          },
        ],
      },
    ],
  };

  private constructor() {}

  public static getInstance(): StoryShelfService {
    if (!StoryShelfService.instance) {
      StoryShelfService.instance = new StoryShelfService();
    }
    return StoryShelfService.instance;
  }

    public getStories(lang: SupportedLanguage, grade?: string): StoryPassage[] {
    const list = this.stories[lang] || this.stories.English;
    if (!grade) return list;

    const lowerGrade = grade.toLowerCase();
    let filtered: StoryPassage[] = [];
    if (lowerGrade.includes('1') || lowerGrade.includes('early') || lowerGrade.includes('kindergarten')) {
      filtered = list.filter(s => s.readingLevel === 'early' || s.readingLevel === 'growing');
    } else if (lowerGrade.includes('5') || lowerGrade.includes('6') || lowerGrade.includes('confident')) {
      filtered = list.filter(s => s.readingLevel === 'confident' || s.readingLevel === 'growing');
    }
    return filtered.length > 0 ? filtered : list;
  }

  /**
   * Returns a rotated selection of stories (one featured story and multiple shelf cards).
   * Advancing the rotation offset rotates both the featured story and the shelf cards.
   */
  public getFeaturedAndShelfStories(
    lang: SupportedLanguage,
    grade?: string,
    advance: boolean = false
  ): { featured: StoryPassage; shelf: StoryPassage[] } {
    const list = this.getStories(lang, grade);
    const key = `${lang}_${grade || 'default'}`;
    let offset = this.rotationOffsets[key] || 0;

    if (advance) {
      offset = (offset + 1) % list.length;
      this.rotationOffsets[key] = offset;
    }

    const rotatedList = [...list.slice(offset), ...list.slice(0, offset)];
    const featured = rotatedList[0];
    const shelf = rotatedList.slice(1);

    return {
      featured,
      shelf: shelf.length > 0 ? shelf : list,
    };
  }

  public getStoryById(idOrTitle: string, lang: SupportedLanguage): StoryPassage | null {
    const list = this.stories[lang] || this.stories.English;
    const lower = (idOrTitle || '').trim().toLowerCase();
    return (
      list.find(s => s.id === idOrTitle || s.id.toLowerCase() === lower || s.title.toLowerCase() === lower || s.title.toLowerCase().includes(lower)) ||
      this.stories.English.find(s => s.id === idOrTitle || s.id.toLowerCase() === lower || s.title.toLowerCase() === lower || s.title.toLowerCase().includes(lower)) ||
      list[0] ||
      null
    );
  }
}
