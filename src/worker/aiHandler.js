function validateActivityContent(content) {
  if (!content || typeof content !== "object") {
    return { valid: false, error: "Activity content must be an object." };
  }
  const c = content;
  const id = typeof c.id === "string" ? c.id : `act_gen_${Date.now()}`;
  const skillId = typeof c.skillId === "string" ? c.skillId : "skill_letter_sounds_basic";
  const title = typeof c.title === "string" && c.title.trim().length >= 3 ? c.title.trim() : "Learning Practice";
  const instruction = typeof c.instruction === "string" ? c.instruction.trim() : "Look closely and choose the best match:";
  const prompt = typeof c.prompt === "string" ? c.prompt.trim() : "Which sound or word matches?";
  const stepByStepHint = typeof c.stepByStepHint === "string" ? c.stepByStepHint.trim() : "Take your time. Listen to each sound slowly.";
  const validDiffs = ["beginner", "intermediate", "advanced"];
  const difficulty = typeof c.difficulty === "string" && validDiffs.includes(c.difficulty) ? c.difficulty : "beginner";
  const validTypes = ["word_match", "phonics_blend", "letter_distinction", "story_comprehension", "sentence_builder"];
  const type = typeof c.type === "string" && validTypes.includes(c.type) ? c.type : "word_match";
  if (!Array.isArray(c.items) || c.items.length < 2) {
    return { valid: false, error: "Activity must contain at least 2 selectable answer items." };
  }
  const sanitizedItems = c.items.map((item, idx) => {
    const it = item;
    return {
      id: typeof it.id === "string" ? it.id : `item_${idx + 1}`,
      text: typeof it.text === "string" ? it.text.trim() : `Option ${idx + 1}`,
      visual: typeof it.visual === "string" ? it.visual : void 0,
      isCorrect: Boolean(it.isCorrect),
      feedbackHint: typeof it.feedbackHint === "string" ? it.feedbackHint : void 0
    };
  });
  const correctCount = sanitizedItems.filter((i) => i.isCorrect).length;
  if (correctCount === 0) {
    sanitizedItems[0].isCorrect = true;
  }
  const workedExample = c.workedExample && typeof c.workedExample === "object" ? {
    demonstration: String(c.workedExample.demonstration || "Example: Look at the visual shape."),
    explanation: String(c.workedExample.explanation || "Notice how the line goes straight down first.")
  } : void 0;
  return {
    valid: true,
    sanitized: {
      id,
      skillId,
      title,
      instruction,
      difficulty,
      language: typeof c.language === "string" ? c.language : "English",
      type,
      prompt,
      audioPrompt: typeof c.audioPrompt === "string" ? c.audioPrompt : void 0,
      items: sanitizedItems,
      workedExample,
      stepByStepHint,
      targetPattern: typeof c.targetPattern === "string" ? c.targetPattern : void 0
    }
  };
}
function getDeterministicActivity(req) {
  const lang = req.language || "English";
  if (req.skillId === "skill_confused_letters_bd") {
    return {
      id: `act_mirror_bd_${Date.now()}`,
      skillId: "skill_confused_letters_bd",
      title: "Letter Mirror: b and d Detective \u{1F50D}",
      instruction: 'Find the letter "b" (like a baseball Bat with a ball at the bottom right):',
      difficulty: req.difficulty,
      language: "English",
      type: "letter_distinction",
      prompt: 'Which letter is "b"?',
      audioPrompt: "Touch the letter b",
      targetPattern: "b_vs_d",
      items: [
        {
          id: "opt_b",
          text: "b",
          visual: "\u{1F3CF}",
          isCorrect: true,
          feedbackHint: "Awesome! The tall bat comes down first, then the round belly bounces right! \u{1F31F}"
        },
        {
          id: "opt_d",
          text: "d",
          visual: "\u{1F369}",
          isCorrect: false,
          feedbackHint: "Notice this round belly points left like a donut first. Try the one facing right!"
        }
      ],
      workedExample: {
        demonstration: "b has a tall bat on the left, belly on the right: |o",
        explanation: "Remember: b looks forward like your hand making a thumbs-up on your left side!"
      },
      stepByStepHint: "Trace with your finger: start at the top, go down, then bounce into a round belly on the right."
    };
  }
  if (req.skillId === "skill_cvc_blending") {
    if (lang === "Hindi") {
      return {
        id: `act_blend_hindi_${Date.now()}`,
        skillId: "skill_cvc_blending",
        title: "\u0927\u094D\u0935\u0928\u093F \u091C\u094B\u0921\u093C: \u0926\u094B \u0905\u0915\u094D\u0937\u0930\u094B\u0902 \u0915\u093E \u0936\u092C\u094D\u0926 \u{1F9E9}",
        instruction: "\u0927\u094D\u0935\u0928\u093F\u092F\u094B\u0902 \u0915\u094B \u091C\u094B\u0921\u093C\u0915\u0930 \u0936\u092C\u094D\u0926 \u092A\u0939\u091A\u093E\u0928\u093F\u090F: \u0917 + \u0930",
        difficulty: req.difficulty,
        language: "Hindi",
        type: "phonics_blend",
        prompt: "\u0917 \u0914\u0930 \u0930 \u092E\u093F\u0932\u0915\u0930 \u0915\u094D\u092F\u093E \u092C\u0928\u0924\u093E \u0939\u0948?",
        items: [
          { id: "opt_ghar", text: "\u0918\u0930", visual: "\u{1F3E0}", isCorrect: true, feedbackHint: '\u092C\u0939\u0941\u0924 \u092C\u0922\u093C\u093F\u092F\u093E! \u0917 \u0914\u0930 \u0930 \u092E\u093F\u0932\u0915\u0930 "\u0918\u0930" \u092C\u0928\u0924\u093E \u0939\u0948! \u{1F308}' },
          { id: "opt_phal", text: "\u092B\u0932", visual: "\u{1F34E}", isCorrect: false, feedbackHint: "\u0927\u094D\u092F\u093E\u0928 \u0938\u0947 \u0938\u0941\u0928\u093F\u090F: \u0917-\u0930" },
          { id: "opt_jal", text: "\u091C\u0932", visual: "\u{1F4A7}", isCorrect: false, feedbackHint: "\u092F\u0939 \u091C-\u0932 \u0939\u0948\u0964 \u0917-\u0930 \u091A\u0941\u0928\u093F\u090F\u0964" }
        ],
        stepByStepHint: "\u092A\u0939\u0932\u0947 \u0917 \u092C\u094B\u0932\u093F\u090F, \u092B\u093F\u0930 \u0930 \u092C\u094B\u0932\u093F\u090F, \u0905\u092C \u0926\u094B\u0928\u094B\u0902 \u0915\u094B \u0924\u0947\u091C\u093C\u0940 \u0938\u0947 \u092E\u093F\u0932\u093E\u0915\u0930 \u092C\u094B\u0932\u093F\u090F: \u0917...\u0930 -> \u0918\u0930!"
      };
    }
    return {
      id: `act_cvc_sun_${Date.now()}`,
      skillId: "skill_cvc_blending",
      title: "Sound Zipper: Blend the Word \u{1F9E9}",
      instruction: "Listen to the 3 sounds and zip them together: /s/ ... /u/ ... /n/",
      difficulty: req.difficulty,
      language: "English",
      type: "phonics_blend",
      prompt: "What word do /s/ + /u/ + /n/ make?",
      audioPrompt: "Zip the sounds: s... u... n",
      targetPattern: "cvc_blend",
      items: [
        {
          id: "opt_sun",
          text: "sun",
          visual: "\u2600\uFE0F",
          isCorrect: true,
          feedbackHint: "Fantastic sound blending! /s/ /u/ /n/ -> SUN! \u{1F31E}"
        },
        {
          id: "opt_run",
          text: "run",
          visual: "\u{1F3C3}",
          isCorrect: false,
          feedbackHint: 'Close, but "run" starts with /r/. Listen for the /s/ sound at the start!'
        },
        {
          id: "opt_bus",
          text: "bus",
          visual: "\u{1F68C}",
          isCorrect: false,
          feedbackHint: '"bus" ends with /s/. We want the word that starts with /s/ and ends with /n/.'
        }
      ],
      workedExample: {
        demonstration: "/s/ + /u/ + /n/ -> sss-uuu-nnn -> sun",
        explanation: "Say each sound smooth like sliding down a rainbow!"
      },
      stepByStepHint: "Stretch the sounds on your arm: shoulder /s/, elbow /u/, wrist /n/. Now slide down: sun!"
    };
  }
  if (req.skillId === "skill_phonemic_isolation") {
    return {
      id: `act_sound_detective_${Date.now()}`,
      skillId: "skill_phonemic_isolation",
      title: "Sound Detective: First Sound \u{1F575}\uFE0F",
      instruction: 'Which picture starts with the same sound as "Fox" (/f/)?',
      difficulty: req.difficulty,
      language: "English",
      type: "word_match",
      prompt: "Starts with /f/ sound like Fox:",
      items: [
        { id: "opt_fish", text: "Fish", visual: "\u{1F41F}", isCorrect: true, feedbackHint: "Spot on! /f/ /f/ Fish matches /f/ /f/ Fox! \u{1F31F}" },
        { id: "opt_cat", text: "Cat", visual: "\u{1F431}", isCorrect: false, feedbackHint: "Cat starts with /k/. Say /f/ like blowing a feather!" },
        { id: "opt_bear", text: "Bear", visual: "\u{1F43B}", isCorrect: false, feedbackHint: "Bear starts with /b/. Look for the gentle /f/ sound." }
      ],
      stepByStepHint: "Put your teeth on your lower lip and blow gently: /f/ /f/ /f/... fish!"
    };
  }
  if (req.skillId === "skill_phonemic_rhyme") {
    return {
      id: `act_rhyme_${Date.now()}`,
      skillId: "skill_phonemic_rhyme",
      title: "Rhyme Castle: Match the Ending \u{1F3F0}",
      instruction: 'Which word rhymes with "cat"? (Sounds like -at at the end)',
      difficulty: req.difficulty,
      language: "English",
      type: "word_match",
      prompt: 'Rhymes with "cat" \u{1F431}:',
      audioPrompt: "Find the word that rhymes with cat",
      items: [
        { id: "opt_hat", text: "Hat", visual: "\u{1F3A9}", isCorrect: true, feedbackHint: "Hooray! C-at and H-at rhyme together! \u{1F3A9}" },
        { id: "opt_dog", text: "Dog", visual: "\u{1F436}", isCorrect: false, feedbackHint: "Dog ends in -og. Listen for -at!" },
        { id: "opt_sun", text: "Sun", visual: "\u2600\uFE0F", isCorrect: false, feedbackHint: "Sun ends in -un. Try the word that ends in -at!" }
      ],
      stepByStepHint: "Say the ending sound: -at! Now listen: h... at! Hat!"
    };
  }
  if (req.skillId === "skill_syllable_segmentation") {
    return {
      id: `act_syllables_${Date.now()}`,
      skillId: "skill_syllable_segmentation",
      title: "Syllable Drummer: Beat the Word \u{1F941}",
      instruction: 'Clap out the beats in "wa-ter". How many syllables do you hear?',
      difficulty: req.difficulty,
      language: "English",
      type: "word_match",
      prompt: 'How many claps in "wa - ter" \u{1F4A7}?',
      audioPrompt: "Clap the word wa-ter",
      items: [
        { id: "opt_2", text: "2 claps", visual: "\u270C\uFE0F", isCorrect: true, feedbackHint: "Clap! Clap! Yes, wa-ter has 2 beats! \u{1F4A7}" },
        { id: "opt_1", text: "1 clap", visual: "\u261D\uFE0F", isCorrect: false, feedbackHint: "Try clapping while you say it: wa (clap!) ter (clap!)" },
        { id: "opt_3", text: "3 claps", visual: "\u{1F91F}", isCorrect: false, feedbackHint: "Listen carefully: wa... ter. Just two claps!" }
      ],
      stepByStepHint: 'Put your hand under your chin. Say "wa-ter". Your chin drops twice: 2 syllables!'
    };
  }
  if (req.skillId === "skill_missing_letter") {
    return {
      id: `act_missing_letter_${Date.now()}`,
      skillId: "skill_missing_letter",
      title: "Missing Letter Mystery \u{1F50D}",
      instruction: 'Which letter completes the word "c _ t" (a purring pet \u{1F431})?',
      difficulty: req.difficulty,
      language: "English",
      type: "letter_distinction",
      prompt: "Complete: c [ ? ] t \u{1F431}",
      items: [
        { id: "opt_a", text: "a", visual: "\u{1F34E}", isCorrect: true, feedbackHint: "Super! c-a-t spells cat! \u{1F431}" },
        { id: "opt_o", text: "o", visual: "\u{1F34A}", isCorrect: false, feedbackHint: "c-o-t spells cot (a small bed). We want cat!" },
        { id: "opt_u", text: "u", visual: "\u2602\uFE0F", isCorrect: false, feedbackHint: "c-u-t spells cut. Try the /a/ sound for cat." }
      ],
      stepByStepHint: 'Listen to the middle sound: /k/ ... /\xE6/ ... /t/. The apple letter is "a"!'
    };
  }
  if (req.skillId === "skill_word_building") {
    return {
      id: `act_word_building_${Date.now()}`,
      skillId: "skill_word_building",
      title: "Word Builder: Brick by Brick \u{1F9F1}",
      instruction: "Build the word for what flies in the sky: /b/ + /i/ + /r/ + /d/",
      difficulty: req.difficulty,
      language: "English",
      type: "word_match",
      prompt: "Which word means a flying feathered friend \u{1F426}?",
      items: [
        { id: "opt_bird", text: "bird", visual: "\u{1F426}", isCorrect: true, feedbackHint: "You built the word BIRD! Notice the starting b! \u{1F426}" },
        { id: "opt_drib", text: "drib", visual: "\u2753", isCorrect: false, feedbackHint: "Start with the bat letter b: b-i-r-d!" },
        { id: "opt_grid", text: "grid", visual: "\u{1F3C1}", isCorrect: false, feedbackHint: "Start with /b/ sound for bird." }
      ],
      stepByStepHint: "First sound is /b/ (bat then ball), then -ird: bird!"
    };
  }
  if (req.skillId === "skill_sight_words_high_freq") {
    return {
      id: `act_sight_words_${Date.now()}`,
      skillId: "skill_sight_words_high_freq",
      title: "Sight Word Sparkle \u26A1",
      instruction: 'Spot the sight word "the" used in "the little kite":',
      difficulty: req.difficulty,
      language: "English",
      type: "word_match",
      prompt: 'Which word is "the"?',
      audioPrompt: "Touch the word the",
      items: [
        { id: "opt_the", text: "the", visual: "\u2728", isCorrect: true, feedbackHint: 'Brilliant! "the" is one of our most helpful sight words! \u{1F31F}' },
        { id: "opt_teh", text: "teh", visual: "\u274C", isCorrect: false, feedbackHint: "Check the letters: t, then h, then e -> the!" },
        { id: "opt_that", text: "that", visual: "\u{1F449}", isCorrect: false, feedbackHint: 'This is "that". Look for the 3-letter word "the".' }
      ],
      stepByStepHint: "Remember the 3 letters: T - H - E. Say: t-h-e spells the!"
    };
  }
  if (req.skillId === "skill_story_comprehension") {
    return {
      id: `act_story_comp_${Date.now()}`,
      skillId: "skill_story_comprehension",
      title: "Story Explorer: Sunny and the Kite \u{1FA81}",
      instruction: "Sunny made a red kite. The wind lifted it up above the trees! What color was the kite?",
      difficulty: req.difficulty,
      language: "English",
      type: "word_match",
      prompt: "What color was Sunny's kite \u{1FA81}?",
      audioPrompt: "What color was the kite?",
      items: [
        { id: "opt_red", text: "Red", visual: "\u{1F534}", isCorrect: true, feedbackHint: "Spot on! Sunny made a bright RED kite that flew high! \u{1FA81}" },
        { id: "opt_blue", text: "Blue", visual: "\u{1F535}", isCorrect: false, feedbackHint: "The story said Sunny made a RED kite. Look for Red!" },
        { id: "opt_green", text: "Green", visual: "\u{1F7E2}", isCorrect: false, feedbackHint: 'Check the first sentence: "Sunny made a red kite."' }
      ],
      stepByStepHint: 'Look back at the first sentence: "Sunny made a red kite."'
    };
  }
  if (req.skillId === "skill_sentence_fluency") {
    return {
      id: `act_vocab_${Date.now()}`,
      skillId: "skill_sentence_fluency",
      title: "Word Power: Vocabulary Builder \u{1F33F}",
      instruction: 'When something is "gentle", it is soft and kind. Which shows a gentle touch?',
      difficulty: req.difficulty,
      language: "English",
      type: "word_match",
      prompt: "Which picture shows something gentle?",
      items: [
        { id: "opt_butterfly", text: "A butterfly landing softly", visual: "\u{1F98B}", isCorrect: true, feedbackHint: "Wonderful! A butterfly lands so gently on a flower! \u{1F338}" },
        { id: "opt_storm", text: "A loud roaring storm", visual: "\u26C8\uFE0F", isCorrect: false, feedbackHint: "A storm is loud and fierce, not gentle. Think soft and calm!" },
        { id: "opt_crash", text: "A car crash", visual: "\u{1F4A5}", isCorrect: false, feedbackHint: "A crash is rough. Gentle means soft and loving." }
      ],
      stepByStepHint: "Think about petting a little sleeping bunny: that is gentle!"
    };
  }
  if (req.skillId === "skill_listening_pronunciation") {
    return {
      id: `act_listening_${Date.now()}`,
      skillId: "skill_listening_pronunciation",
      title: "Echo Ears: Listen and Match \u{1F3A7}",
      instruction: 'Listen carefully: "The friendly puppy played in the grass." Who played in the grass?',
      difficulty: req.difficulty,
      language: "English",
      type: "word_match",
      prompt: "Who was playing in the grass \u{1F33F}?",
      audioPrompt: "The friendly puppy played in the grass. Who played in the grass?",
      items: [
        { id: "opt_puppy", text: "Puppy", visual: "\u{1F436}", isCorrect: true, feedbackHint: "Great listening ears! The puppy was playing in the grass! \u{1F43E}" },
        { id: "opt_frog", text: "Frog", visual: "\u{1F438}", isCorrect: false, feedbackHint: 'Listen again: "The friendly puppy played in the grass."' },
        { id: "opt_kitten", text: "Kitten", visual: "\u{1F431}", isCorrect: false, feedbackHint: "The audio said puppy! Tap the puppy card." }
      ],
      stepByStepHint: 'Say the words out loud: "friendly puppy" -> puppy!'
    };
  }
  if (req.skillId === "skill_spelling_cvc") {
    return {
      id: `act_spelling_${Date.now()}`,
      skillId: "skill_spelling_cvc",
      title: "Spelling Bee: Sound it Out \u270F\uFE0F",
      instruction: "Spell the word for where we sleep: /b/ ... /e/ ... /d/",
      difficulty: req.difficulty,
      language: "English",
      type: "word_match",
      prompt: 'How do we spell "bed" \u{1F6CF}\uFE0F?',
      items: [
        { id: "opt_bed", text: "bed", visual: "\u{1F6CF}\uFE0F", isCorrect: true, feedbackHint: "Super speller! b-e-d spells BED! Notice the b at start and d at end! \u{1F31F}" },
        { id: "opt_deb", text: "deb", visual: "\u274C", isCorrect: false, feedbackHint: "Remember the bed trick: left hand is b, right hand is d: b-e-d!" },
        { id: "opt_bad", text: "bad", visual: "\u26A0\uFE0F", isCorrect: false, feedbackHint: "That has /\xE6/ like apple. We want /e/ like egg: b-e-d!" }
      ],
      stepByStepHint: 'Left hand makes "b", middle is "e", right hand makes "d": b-e-d!'
    };
  }
  return {
    id: `act_letter_sounds_${Date.now()}`,
    skillId: "skill_letter_sounds_basic",
    title: "Sound Safari: Letter Matching \u{1F981}",
    instruction: "Find the picture that matches the letter sound:",
    difficulty: req.difficulty,
    language: req.language || "English",
    type: "word_match",
    prompt: "Which word starts with the /m/ sound?",
    audioPrompt: "Find the /m/ sound like humming",
    items: [
      { id: "opt_moon", text: "Moon", visual: "\u{1F319}", isCorrect: true, feedbackHint: "Super job! Mmm-Moon starts with M! \u{1F680}" },
      { id: "opt_star", text: "Star", visual: "\u2B50", isCorrect: false, feedbackHint: "Star starts with S. Try humming mmm!" },
      { id: "opt_tree", text: "Tree", visual: "\u{1F333}", isCorrect: false, feedbackHint: "Tree starts with T. Think of /m/ like delicious food!" }
    ],
    stepByStepHint: "Press your lips together and hum: mmmmm... Moon!"
  };
}
async function handleGenerateActivity(req, apiKey, fetchFn = fetch) {
  const resolvedKey = apiKey && apiKey.trim() !== "" && !apiKey.includes("placeholder") ? apiKey.trim() : typeof process !== "undefined" && process.env?.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("placeholder") ? process.env.GEMINI_API_KEY.trim() : void 0;
  if (!resolvedKey) {
    return getDeterministicActivity(req);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9e3);
  const configuredModel = typeof process !== "undefined" && process.env?.GEMINI_MODEL ? process.env.GEMINI_MODEL.trim() : "gemini-2.5-flash";
  const modelsToTry = [configuredModel, "gemini-2.0-flash", "gemini-1.5-flash"].filter(
    (m, idx, arr) => arr.indexOf(m) === idx
  );
  const promptText = `You are an expert pediatric reading specialist for children with dyslexia.
Generate a single engaging, educational reading practice exercise.
Skill category: ${req.skillId}
Difficulty: ${req.difficulty}
Language: ${req.language || "English"}
${req.childName ? `Child name: ${req.childName}` : ""}
${req.interest ? `Child interest: ${req.interest}` : "Interest: animals, nature, and adventure"}
${req.targetPattern ? `Target pattern: ${req.targetPattern}` : ""}

Strict requirements:
- Use encouraging, positive, dyslexia-friendly language.
- Distinguish letters and sounds clearly.
- Provide between 2 and 4 answer choices in "items", with at least one item marked with isCorrect: true.
- Each item MUST have: id (string), text (string), visual (emoji or single symbol), isCorrect (boolean), feedbackHint (supportive explanation).
- Provide a stepByStepHint guiding the child gently.
- Return ONLY a valid JSON object matching this schema:
{
  "id": "act_gemini_${Date.now()}",
  "skillId": "${req.skillId}",
  "title": "string",
  "instruction": "string",
  "difficulty": "${req.difficulty}",
  "language": "${req.language || "English"}",
  "type": "word_match",
  "prompt": "string",
  "items": [
    {
      "id": "opt_1",
      "text": "string",
      "visual": "emoji",
      "isCorrect": true,
      "feedbackHint": "string"
    },
    {
      "id": "opt_2",
      "text": "string",
      "visual": "emoji",
      "isCorrect": false,
      "feedbackHint": "string"
    }
  ],
  "stepByStepHint": "string"
}`;
  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(resolvedKey)}`;
      const res = await fetchFn(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptText }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 1e3
          }
        }),
        signal: controller.signal
      });
      if (res.ok) {
        clearTimeout(timeoutId);
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText && typeof rawText === "string") {
          let cleanJson = rawText.trim();
          if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
          }
          const parsed = JSON.parse(cleanJson);
          const validation = validateActivityContent(parsed);
          if (validation.valid && validation.sanitized) {
            return validation.sanitized;
          }
        }
      } else if (res.status === 404) {
        continue;
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  clearTimeout(timeoutId);
  return getDeterministicActivity(req);
}
export {
  getDeterministicActivity,
  handleGenerateActivity,
  validateActivityContent
};
