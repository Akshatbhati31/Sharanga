function validateActivityContent(content) {
function validateActivityContent(content, targetLanguage) {
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
  const effectiveLang = (targetLanguage || (typeof c.language === "string" ? c.language : "English")).trim().toLowerCase();
  const allText = [
    title,
    instruction,
    prompt,
    stepByStepHint,
    ...sanitizedItems.map((i) => `${i.text} ${i.feedbackHint || ""}`)
  ].join(" ");
  const isHi = effectiveLang.startsWith("hi") || effectiveLang.includes("hindi");
  const isOr = effectiveLang.startsWith("or") || effectiveLang.includes("odia") || effectiveLang.includes("oriya");
  const isPa = effectiveLang.startsWith("pa") || effectiveLang.includes("punjabi") || effectiveLang.includes("gurmukhi");
  const isTa = effectiveLang.startsWith("ta") || effectiveLang.includes("tamil");
  if (isHi) {
    if (!/[\u0900-\u097F]/.test(allText)) {
      return { valid: false, error: "Activity for Hindi must contain authentic Devanagari script." };
    }
    const englishOptions = sanitizedItems.filter((i) => /^[A-Za-z0-9\s.,!?'"-]+$/.test(i.text.trim()));
    if (englishOptions.length > 0) {
      return { valid: false, error: "Hindi activity contains English option choices." };
    }
  } else if (isOr) {
    if (!/[\u0B00-\u0B7F]/.test(allText)) {
      return { valid: false, error: "Activity for Odia must contain authentic Odia script." };
    }
    const englishOptions = sanitizedItems.filter((i) => /^[A-Za-z0-9\s.,!?'"-]+$/.test(i.text.trim()));
    if (englishOptions.length > 0) {
      return { valid: false, error: "Odia activity contains English option choices." };
    }
  } else if (isPa) {
    if (!/[\u0A00-\u0A7F]/.test(allText)) {
      return { valid: false, error: "Activity for Punjabi must contain authentic Gurmukhi script." };
    }
    const englishOptions = sanitizedItems.filter((i) => /^[A-Za-z0-9\s.,!?'"-]+$/.test(i.text.trim()));
    if (englishOptions.length > 0) {
      return { valid: false, error: "Punjabi activity contains English option choices." };
    }
  } else if (isTa) {
    if (!/[\u0B80-\u0BFF]/.test(allText)) {
      return { valid: false, error: "Activity for Tamil must contain authentic Tamil script." };
    }
    const englishOptions = sanitizedItems.filter((i) => /^[A-Za-z0-9\s.,!?'"-]+$/.test(i.text.trim()));
    if (englishOptions.length > 0) {
      return { valid: false, error: "Tamil activity contains English option choices." };
    }
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
      language: typeof c.language === "string" ? c.language : targetLanguage || "English",
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
  const rawLang = (req.language || "English").trim().toLowerCase();
  const isHindi = rawLang.startsWith("hi") || rawLang.includes("hindi");
  const isOdia = rawLang.startsWith("or") || rawLang.includes("odia") || rawLang.includes("oriya");
  const isPunjabi = rawLang.startsWith("pa") || rawLang.includes("punjabi") || rawLang.includes("gurmukhi");
  const isTamil = rawLang.startsWith("ta") || rawLang.includes("tamil");
  const isAlt = typeof req.variant === "number" && req.variant > 0 && req.variant % 2 === 1;
  if (req.skillId === "skill_confused_letters_bd") {
    if (isHindi) {
      if (isAlt) {
        return {
          id: `act_mirror_bd_hi_alt_${Date.now()}`,
          skillId: "skill_confused_letters_bd",
          title: "\u0905\u0915\u094D\u0937\u0930 \u092A\u0939\u091A\u093E\u0928: \u092D \u0914\u0930 \u092C \u{1F50D}",
          instruction: '\u0905\u0915\u094D\u0937\u0930 "\u092D" \u0915\u0940 \u092A\u0939\u091A\u093E\u0928 \u0915\u0940\u091C\u093F\u090F (\u091C\u093F\u0938\u0915\u0947 \u0938\u093F\u0930 \u092A\u0930 \u0917\u094B\u0932 \u0918\u0941\u0902\u0921\u0940 \u0939\u094B\u0924\u0940 \u0939\u0948):',
          difficulty: req.difficulty,
          language: "Hindi",
          type: "letter_distinction",
          prompt: '\u0907\u0928\u092E\u0947\u0902 \u0938\u0947 \u0915\u094C\u0928-\u0938\u093E \u0905\u0915\u094D\u0937\u0930 "\u092D" \u0939\u0948?',
          audioPrompt: "\u0905\u0915\u094D\u0937\u0930 \u092D \u0915\u094B \u092A\u0939\u091A\u093E\u0928\u093F\u090F",
          targetPattern: "bha_vs_ba",
          items: [
            { id: "opt_bha", text: "\u092D", visual: "\u{1F43B}", isCorrect: true, feedbackHint: '\u092C\u0939\u0941\u0924 \u0905\u091A\u094D\u091B\u093E! \u092F\u0939 \u0905\u0915\u094D\u0937\u0930 "\u092D" (\u092D\u093E\u0932\u0942) \u0939\u0948! \u{1F31F}' },
            { id: "opt_ba", text: "\u092C", visual: "\u{1F410}", isCorrect: false, feedbackHint: '\u092F\u0939 "\u092C" (\u092C\u0915\u0930\u0940) \u0939\u0948\u0964 \u0917\u094B\u0932 \u0918\u0941\u0902\u0921\u0940 \u0935\u093E\u0932\u093E "\u092D" \u091A\u0941\u0928\u0947\u0902\u0964' }
          ],
          stepByStepHint: "\u090A\u092A\u0930 \u091B\u094B\u091F\u093E \u0917\u094B\u0932\u093E \u092C\u0928\u093E\u0915\u0930 \u0928\u0940\u091A\u0947 \u0921\u0902\u0921\u093E \u0916\u0940\u0902\u091A\u093F\u090F: \u092D!"
        };
      }
      return {
        id: `act_mirror_bd_hi_${Date.now()}`,
        skillId: "skill_confused_letters_bd",
        title: "\u0905\u0915\u094D\u0937\u0930 \u092A\u0939\u091A\u093E\u0928: \u092C \u0914\u0930 \u092D \u{1F50D}",
        instruction: '\u0905\u0915\u094D\u0937\u0930 "\u092C" \u0915\u0940 \u092A\u0939\u091A\u093E\u0928 \u0915\u0940\u091C\u093F\u090F (\u091C\u093F\u0938\u0915\u0947 \u092C\u0940\u091A \u092E\u0947\u0902 \u0924\u093F\u0930\u091B\u0940 \u0930\u0947\u0916\u093E \u0939\u094B\u0924\u0940 \u0939\u0948):',
        difficulty: req.difficulty,
        language: "Hindi",
        type: "letter_distinction",
        prompt: '\u0907\u0928\u092E\u0947\u0902 \u0938\u0947 \u0915\u094C\u0928-\u0938\u093E \u0905\u0915\u094D\u0937\u0930 "\u092C" \u0939\u0948?',
        audioPrompt: "\u0905\u0915\u094D\u0937\u0930 \u092C \u0915\u094B \u092A\u0939\u091A\u093E\u0928\u093F\u090F",
        targetPattern: "ba_vs_bha",
        items: [
          { id: "opt_ba", text: "\u092C", visual: "\u{1F410}", isCorrect: true, feedbackHint: '\u092C\u0939\u0941\u0924 \u0905\u091A\u094D\u091B\u093E! \u092F\u0939 \u0905\u0915\u094D\u0937\u0930 "\u092C" \u0939\u0948 (\u092C\u0915\u0930\u0940)! \u{1F31F}' },
          { id: "opt_bha", text: "\u092D", visual: "\u{1F43B}", isCorrect: false, feedbackHint: '\u092F\u0939 "\u092D" (\u092D\u093E\u0932\u0942) \u0939\u0948\u0964 \u0917\u094B\u0932 \u092A\u0947\u091F \u092E\u0947\u0902 \u0924\u093F\u0930\u091B\u0940 \u0930\u0947\u0916\u093E \u0935\u093E\u0932\u093E "\u092C" \u091A\u0941\u0928\u0947\u0902\u0964' }
        ],
        stepByStepHint: "\u092A\u0939\u0932\u0947 \u0921\u0902\u0921\u093E \u0916\u0940\u0902\u091A\u093F\u090F, \u092B\u093F\u0930 \u0917\u094B\u0932 \u092A\u0947\u091F \u092C\u0928\u093E\u0915\u0930 \u092C\u0940\u091A \u092E\u0947\u0902 \u0924\u093F\u0930\u091B\u0940 \u0930\u0947\u0916\u093E \u0915\u093E\u091F\u093F\u090F: \u092C!"
      };
    }
    if (isOdia) {
      if (isAlt) {
        return {
          id: `act_mirror_bd_or_alt_${Date.now()}`,
          skillId: "skill_confused_letters_bd",
          title: "\u0B05\u0B15\u0B4D\u0B37\u0B30 \u0B1A\u0B3F\u0B39\u0B4D\u0B28\u0B1F: \u0B27 \u0B0F\u0B2C\u0B02 \u0B2C \u{1F50D}",
          instruction: '\u0B05\u0B15\u0B4D\u0B37\u0B30 "\u0B27" \u0B15\u0B41 \u0B1A\u0B3F\u0B39\u0B4D\u0B28\u0B1F \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41:',
          difficulty: req.difficulty,
          language: "Odia",
          type: "letter_distinction",
          prompt: '\u0B0F\u0B17\u0B41\u0B21\u0B3C\u0B3F\u0B15 \u0B2E\u0B27\u0B4D\u0B5F\u0B30\u0B41 \u0B15\u0B47\u0B09\u0B01\u0B1F\u0B3F "\u0B27" \u0B05\u0B1F\u0B47?',
          audioPrompt: "\u0B05\u0B15\u0B4D\u0B37\u0B30 \u0B27 \u0B15\u0B41 \u0B38\u0B4D\u0B2A\u0B30\u0B4D\u0B36 \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41",
          targetPattern: "dha_vs_ba",
          items: [
            { id: "opt_dha", text: "\u0B27", visual: "\u{1F3F9}", isCorrect: true, feedbackHint: '\u0B1A\u0B2E\u0B24\u0B4D\u0B15\u0B3E\u0B30! \u0B0F\u0B39\u0B3E \u0B05\u0B15\u0B4D\u0B37\u0B30 "\u0B27" (\u0B27\u0B28\u0B41) \u0B05\u0B1F\u0B47! \u{1F31F}' },
            { id: "opt_ba", text: "\u0B2C", visual: "\u{1F438}", isCorrect: false, feedbackHint: '\u0B0F\u0B39\u0B3E "\u0B2C" (\u0B2C\u0B47\u0B19\u0B4D\u0B17) \u0B05\u0B1F\u0B47\u0964 "\u0B27" \u0B15\u0B41 \u0B2C\u0B3E\u0B1B\u0B28\u0B4D\u0B24\u0B41\u0964' }
          ],
          stepByStepHint: "\u0B27\u0B28\u0B41 \u0B2D\u0B33\u0B3F \u0B2C\u0B19\u0B4D\u0B15\u0B3E \u0B05\u0B15\u0B4D\u0B37\u0B30: \u0B27!"
        };
      }
      return {
        id: `act_mirror_bd_or_${Date.now()}`,
        skillId: "skill_confused_letters_bd",
        title: "\u0B05\u0B15\u0B4D\u0B37\u0B30 \u0B1A\u0B3F\u0B39\u0B4D\u0B28\u0B1F: \u0B2C \u0B0F\u0B2C\u0B02 \u0B27 \u{1F50D}",
        instruction: '\u0B05\u0B15\u0B4D\u0B37\u0B30 "\u0B2C" \u0B15\u0B41 \u0B1A\u0B3F\u0B39\u0B4D\u0B28\u0B1F \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41:',
        difficulty: req.difficulty,
        language: "Odia",
        type: "letter_distinction",
        prompt: '\u0B0F\u0B17\u0B41\u0B21\u0B3C\u0B3F\u0B15 \u0B2E\u0B27\u0B4D\u0B5F\u0B30\u0B41 \u0B15\u0B47\u0B09\u0B01\u0B1F\u0B3F "\u0B2C" \u0B05\u0B1F\u0B47?',
        audioPrompt: "\u0B05\u0B15\u0B4D\u0B37\u0B30 \u0B2C \u0B15\u0B41 \u0B38\u0B4D\u0B2A\u0B30\u0B4D\u0B36 \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41",
        targetPattern: "ba_vs_dha",
        items: [
          { id: "opt_ba", text: "\u0B2C", visual: "\u{1F438}", isCorrect: true, feedbackHint: '\u0B1A\u0B2E\u0B24\u0B4D\u0B15\u0B3E\u0B30! \u0B0F\u0B39\u0B3E \u0B05\u0B15\u0B4D\u0B37\u0B30 "\u0B2C" (\u0B2C\u0B47\u0B19\u0B4D\u0B17) \u0B05\u0B1F\u0B47! \u{1F31F}' },
          { id: "opt_dha", text: "\u0B27", visual: "\u{1F3F9}", isCorrect: false, feedbackHint: '\u0B0F\u0B39\u0B3E "\u0B27" (\u0B27\u0B28\u0B41) \u0B05\u0B1F\u0B47\u0964 "\u0B2C" \u0B15\u0B41 \u0B2C\u0B3E\u0B1B\u0B28\u0B4D\u0B24\u0B41\u0964' }
        ],
        stepByStepHint: "\u0B17\u0B4B\u0B32 \u0B15\u0B30\u0B3F \u0B09\u0B2A\u0B30\u0B15\u0B41 \u0B09\u0B20\u0B3E\u0B07 \u0B2C\u0B41\u0B32\u0B3E\u0B28\u0B4D\u0B24\u0B41: \u0B2C!"
      };
    }
    if (isPunjabi) {
      if (isAlt) {
        return {
          id: `act_mirror_bd_pa_alt_${Date.now()}`,
          skillId: "skill_confused_letters_bd",
          title: "\u0A05\u0A71\u0A16\u0A30 \u0A2A\u0A1B\u0A3E\u0A23: \u0A2D \u0A05\u0A24\u0A47 \u0A2C \u{1F50D}",
          instruction: '\u0A05\u0A71\u0A16\u0A30 "\u0A2D" \u0A26\u0A40 \u0A2A\u0A1B\u0A3E\u0A23 \u0A15\u0A30\u0A4B:',
          difficulty: req.difficulty,
          language: "Punjabi",
          type: "letter_distinction",
          prompt: '\u0A07\u0A39\u0A28\u0A3E\u0A02 \u0A35\u0A3F\u0A71\u0A1A\u0A4B\u0A02 \u0A15\u0A3F\u0A39\u0A5C\u0A3E \u0A05\u0A71\u0A16\u0A30 "\u0A2D" \u0A39\u0A48?',
          audioPrompt: "\u0A05\u0A71\u0A16\u0A30 \u0A2D \u0A28\u0A42\u0A70 \u0A1B\u0A42\u0A39\u0A4B",
          targetPattern: "bha_vs_ba",
          items: [
            { id: "opt_bha", text: "\u0A2D", visual: "\u{1F43B}", isCorrect: true, feedbackHint: '\u0A2C\u0A39\u0A41\u0A24 \u0A35\u0A27\u0A40\u0A06! \u0A07\u0A39 \u0A05\u0A71\u0A16\u0A30 "\u0A2D" (\u0A2D\u0A3E\u0A32\u0A42) \u0A39\u0A48! \u{1F31F}' },
            { id: "opt_ba", text: "\u0A2C", visual: "\u{1F986}", isCorrect: false, feedbackHint: '\u0A07\u0A39 "\u0A2C" (\u0A2C\u0A71\u0A24\u0A16) \u0A39\u0A48\u0964 \u0A38\u0A39\u0A40 "\u0A2D" \u0A1A\u0A41\u0A23\u0A4B\u0964' }
          ],
          stepByStepHint: "\u0A27\u0A3F\u0A06\u0A28 \u0A28\u0A3E\u0A32 \u0A26\u0A47\u0A16\u0A4B: \u0A2D \u0A09\u0A71\u0A2A\u0A30\u0A4B\u0A02 \u0A35\u0A3F\u0A32\u0A71\u0A16\u0A23 \u0A39\u0A48!"
        };
      }
      return {
        id: `act_mirror_bd_pa_${Date.now()}`,
        skillId: "skill_confused_letters_bd",
        title: "\u0A05\u0A71\u0A16\u0A30 \u0A2A\u0A1B\u0A3E\u0A23: \u0A2C \u0A05\u0A24\u0A47 \u0A2D \u{1F50D}",
        instruction: '\u0A05\u0A71\u0A16\u0A30 "\u0A2C" \u0A26\u0A40 \u0A2A\u0A1B\u0A3E\u0A23 \u0A15\u0A30\u0A4B:',
        difficulty: req.difficulty,
        language: "Punjabi",
        type: "letter_distinction",
        prompt: '\u0A07\u0A39\u0A28\u0A3E\u0A02 \u0A35\u0A3F\u0A71\u0A1A\u0A4B\u0A02 \u0A15\u0A3F\u0A39\u0A5C\u0A3E \u0A05\u0A71\u0A16\u0A30 "\u0A2C" \u0A39\u0A48?',
        audioPrompt: "\u0A05\u0A71\u0A16\u0A30 \u0A2C \u0A28\u0A42\u0A70 \u0A1B\u0A42\u0A39\u0A4B",
        targetPattern: "ba_vs_bha",
        items: [
          { id: "opt_ba", text: "\u0A2C", visual: "\u{1F986}", isCorrect: true, feedbackHint: '\u0A2C\u0A39\u0A41\u0A24 \u0A35\u0A27\u0A40\u0A06! \u0A07\u0A39 \u0A05\u0A71\u0A16\u0A30 "\u0A2C" (\u0A2C\u0A71\u0A24\u0A16) \u0A39\u0A48! \u{1F31F}' },
          { id: "opt_bha", text: "\u0A2D", visual: "\u{1F43B}", isCorrect: false, feedbackHint: '\u0A07\u0A39 "\u0A2D" (\u0A2D\u0A3E\u0A32\u0A42) \u0A39\u0A48\u0964 \u0A38\u0A39\u0A40 "\u0A2C" \u0A1A\u0A41\u0A23\u0A4B\u0964' }
        ],
        stepByStepHint: "\u0A27\u0A3F\u0A06\u0A28 \u0A28\u0A3E\u0A32 \u0A26\u0A47\u0A16\u0A4B: \u0A2C \u0A26\u0A40 \u0A2C\u0A23\u0A24\u0A30 \u0A38\u0A3E\u0A2B\u0A3C \u0A05\u0A24\u0A47 \u0A38\u0A3F\u0A71\u0A27\u0A40 \u0A39\u0A48!"
      };
    }
    if (isTamil) {
      if (isAlt) {
        return {
          id: `act_mirror_bd_ta_alt_${Date.now()}`,
          skillId: "skill_confused_letters_bd",
          title: "\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1 \u0BB5\u0BC7\u0BB1\u0BC1\u0BAA\u0BBE\u0B9F\u0BC1: \u0BB1 \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BB0 \u{1F50D}",
          instruction: '\u0BB5\u0BB2\u0BCD\u0BB2\u0BBF\u0BA9 "\u0BB1" \u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC8\u0B95\u0BCD \u0B95\u0BA3\u0BCD\u0B9F\u0BB1\u0BBF\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD:',
          difficulty: req.difficulty,
          language: "Tamil",
          type: "letter_distinction",
          prompt: '\u0B87\u0BB5\u0BB1\u0BCD\u0BB1\u0BBF\u0BB2\u0BCD \u0B8E\u0BA4\u0BC1 "\u0BB1" \u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1?',
          audioPrompt: "\u0BB1 \u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC8\u0BA4\u0BCD \u0BA4\u0BCA\u0B9F\u0BB5\u0BC1\u0BAE\u0BCD",
          targetPattern: "rra_vs_ra",
          items: [
            { id: "opt_rra", text: "\u0BB1", visual: "\u{1F426}", isCorrect: true, feedbackHint: '\u0B85\u0BB0\u0BC1\u0BAE\u0BC8! \u0B87\u0BA4\u0BC1 "\u0BB1" (\u0BAA\u0BB1\u0BB5\u0BC8) \u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1! \u{1F31F}' },
            { id: "opt_ra", text: "\u0BB0", visual: "\u{1F686}", isCorrect: false, feedbackHint: '\u0B87\u0BA4\u0BC1 \u0BAE\u0BC6\u0BA9\u0BCD\u0BAE\u0BC8\u0BAF\u0BBE\u0BA9 "\u0BB0" (\u0BB0\u0BAF\u0BBF\u0BB2\u0BCD). "\u0BB1" \u0B90\u0BA4\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.' }
          ],
          stepByStepHint: "\u0BB5\u0BB3\u0BC8\u0BA8\u0BCD\u0BA4\u0BC1 \u0BAE\u0BC7\u0BB2\u0BCD \u0B8F\u0BB1\u0BC1\u0BAE\u0BCD \u0B95\u0BC2\u0BB0\u0BCD\u0BAE\u0BC8\u0BAF\u0BBE\u0BA9 \u0BB5\u0B9F\u0BBF\u0BB5\u0BAE\u0BCD: \u0BB1!"
        };
      }
      return {
        id: `act_mirror_bd_ta_${Date.now()}`,
        skillId: "skill_confused_letters_bd",
        title: "\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1 \u0BB5\u0BC7\u0BB1\u0BC1\u0BAA\u0BBE\u0B9F\u0BC1: \u0BB0 \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BB1 \u{1F50D}",
        instruction: '\u0B87\u0B9F\u0BC8\u0BAF\u0BBF\u0BA9 "\u0BB0" \u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC8\u0B95\u0BCD \u0B95\u0BA3\u0BCD\u0B9F\u0BB1\u0BBF\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD:',
        difficulty: req.difficulty,
        language: "Tamil",
        type: "letter_distinction",
        prompt: '\u0B87\u0BB5\u0BB1\u0BCD\u0BB1\u0BBF\u0BB2\u0BCD \u0B8E\u0BA4\u0BC1 "\u0BB0" \u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1?',
        audioPrompt: "\u0BB0 \u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC8\u0BA4\u0BCD \u0BA4\u0BCA\u0B9F\u0BB5\u0BC1\u0BAE\u0BCD",
        targetPattern: "ra_vs_rra",
        items: [
          { id: "opt_ra", text: "\u0BB0", visual: "\u{1F686}", isCorrect: true, feedbackHint: '\u0B85\u0BB0\u0BC1\u0BAE\u0BC8! \u0B87\u0BA4\u0BC1 "\u0BB0" (\u0BB0\u0BAF\u0BBF\u0BB2\u0BCD) \u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1! \u{1F31F}' },
          { id: "opt_rra", text: "\u0BB1", visual: "\u{1F426}", isCorrect: false, feedbackHint: '\u0B87\u0BA4\u0BC1 \u0BB5\u0BB2\u0BCD\u0BB2\u0BBF\u0BA9 "\u0BB1" (\u0BAA\u0BB1\u0BB5\u0BC8). \u0BAE\u0BC6\u0BA9\u0BCD\u0BAE\u0BC8\u0BAF\u0BBE\u0BA9 "\u0BB0" \u0B90\u0BA4\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.' }
        ],
        stepByStepHint: "\u0BAE\u0BC7\u0BB2\u0BBF\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1 \u0B95\u0BC0\u0BB4\u0BCD \u0BB5\u0BA8\u0BCD\u0BA4\u0BC1 \u0BB5\u0BB3\u0BC8\u0BAF\u0BC1\u0BAE\u0BCD \u0B8E\u0BB3\u0BBF\u0BAF \u0BB5\u0B9F\u0BBF\u0BB5\u0BAE\u0BCD: \u0BB0!"
      };
    }
    if (isAlt) {
      return {
        id: `act_mirror_bd_alt_${Date.now()}`,
        skillId: "skill_confused_letters_bd",
        title: "Letter Mirror: b and d Detective \u{1F50D}",
        instruction: 'Find the letter "d" (round belly points left like a Donut, tall bat on the right):',
        difficulty: req.difficulty,
        language: "English",
        type: "letter_distinction",
        prompt: 'Which letter is "d"?',
        audioPrompt: "Touch the letter d",
        targetPattern: "d_vs_b",
        items: [
          { id: "opt_d", text: "d", visual: "\u{1F369}", isCorrect: true, feedbackHint: "Awesome! The round donut comes first on the left, then the tall bat! \u{1F31F}" },
          { id: "opt_b", text: "b", visual: "\u{1F3CF}", isCorrect: false, feedbackHint: 'That is "b" with the bat on the left. Find "d" with the round belly on the left!' }
        ],
        stepByStepHint: "Make a donut shape first on the left, then draw a straight line down on the right: d!"
      };
    }
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
        { id: "opt_b", text: "b", visual: "\u{1F3CF}", isCorrect: true, feedbackHint: "Awesome! The tall bat comes down first, then the round belly bounces right! \u{1F31F}" },
        { id: "opt_d", text: "d", visual: "\u{1F369}", isCorrect: false, feedbackHint: "Notice this round belly points left like a donut first. Try the one facing right!" }
      ],
      workedExample: {
        demonstration: "b has a tall bat on the left, belly on the right: |o",
        explanation: "Remember: b looks forward like your hand making a thumbs-up on your left side!"
      },
      stepByStepHint: "Trace with your finger: start at the top, go down, then bounce into a round belly on the right."
    };
  }
  if (req.skillId === "skill_confused_letters_pq") {
    if (isHindi) {
      return {
        id: `act_pq_hi_${Date.now()}`,
        skillId: "skill_confused_letters_pq",
        title: "\u0905\u0915\u094D\u0937\u0930 \u092A\u0939\u091A\u093E\u0928: \u092A \u0914\u0930 \u092B \u{1F50D}",
        instruction: '\u0905\u0915\u094D\u0937\u0930 "\u092A" \u0915\u0940 \u092A\u0939\u091A\u093E\u0928 \u0915\u0940\u091C\u093F\u090F (\u091C\u093F\u0938\u092E\u0947\u0902 \u0928\u0940\u091A\u0947 \u0932\u091F\u0915\u0924\u0940 \u0930\u0947\u0916\u093E \u0928\u0939\u0940\u0902 \u0939\u094B\u0924\u0940):',
        difficulty: req.difficulty,
        language: req.language || "Hindi",
        type: "letter_distinction",
        prompt: '\u0907\u0928\u092E\u0947\u0902 \u0938\u0947 \u0915\u094C\u0928-\u0938\u093E \u0905\u0915\u094D\u0937\u0930 "\u092A" \u0939\u0948?',
        audioPrompt: "\u0905\u0915\u094D\u0937\u0930 \u092A \u0915\u094B \u092A\u0939\u091A\u093E\u0928\u093F\u090F",
        targetPattern: "pa_vs_pha",
        items: [
          { id: "opt_pa", text: "\u092A", visual: "\u{1FA81}", isCorrect: true, feedbackHint: '\u092C\u0939\u0941\u0924 \u092C\u0922\u093C\u093F\u092F\u093E! \u092F\u0939 \u0905\u0915\u094D\u0937\u0930 "\u092A" (\u092A\u0924\u0902\u0917) \u0939\u0948! \u{1F31F}' },
          { id: "opt_pha", text: "\u092B", visual: "\u{1F34E}", isCorrect: false, feedbackHint: '\u092F\u0939 "\u092B" (\u092B\u0932) \u0939\u0948\u0964 \u0938\u0940\u0927\u093E \u0921\u0902\u0921\u093E \u0914\u0930 \u092E\u0941\u0921\u093C\u093E\u0935 \u0935\u093E\u0932\u093E "\u092A" \u091A\u0941\u0928\u0947\u0902\u0964' }
        ],
        stepByStepHint: "\u092A\u0939\u0932\u0947 \u0938\u0940\u0927\u093E \u0921\u0902\u0921\u093E \u0914\u0930 \u0915\u091F\u094B\u0930\u0940 \u091C\u0948\u0938\u093E \u0918\u0941\u092E\u093E\u0935: \u092A!"
      };
    }
    if (isOdia) {
      return {
        id: `act_pq_or_${Date.now()}`,
        skillId: "skill_confused_letters_pq",
        title: "\u0B05\u0B15\u0B4D\u0B37\u0B30 \u0B1A\u0B3F\u0B39\u0B4D\u0B28\u0B1F: \u0B2A \u0B0F\u0B2C\u0B02 \u0B2B \u{1F50D}",
        instruction: '\u0B05\u0B15\u0B4D\u0B37\u0B30 "\u0B2A" \u0B15\u0B41 \u0B1A\u0B3F\u0B39\u0B4D\u0B28\u0B1F \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41:',
        difficulty: req.difficulty,
        language: req.language || "Odia",
        type: "letter_distinction",
        prompt: '\u0B0F\u0B17\u0B41\u0B21\u0B3C\u0B3F\u0B15 \u0B2E\u0B27\u0B4D\u0B5F\u0B30\u0B41 \u0B15\u0B47\u0B09\u0B01\u0B1F\u0B3F "\u0B2A" \u0B05\u0B1F\u0B47?',
        audioPrompt: "\u0B05\u0B15\u0B4D\u0B37\u0B30 \u0B2A \u0B15\u0B41 \u0B38\u0B4D\u0B2A\u0B30\u0B4D\u0B36 \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41",
        targetPattern: "pa_vs_pha",
        items: [
          { id: "opt_pa", text: "\u0B2A", visual: "\u{1FA81}", isCorrect: true, feedbackHint: '\u0B1A\u0B2E\u0B24\u0B4D\u0B15\u0B3E\u0B30! \u0B0F\u0B39\u0B3E \u0B05\u0B15\u0B4D\u0B37\u0B30 "\u0B2A" (\u0B2A\u0B24\u0B19\u0B4D\u0B17) \u0B05\u0B1F\u0B47! \u{1F31F}' },
          { id: "opt_pha", text: "\u0B2B", visual: "\u{1F34E}", isCorrect: false, feedbackHint: '\u0B0F\u0B39\u0B3E "\u0B2B" (\u0B2B\u0B33) \u0B05\u0B1F\u0B47\u0964 "\u0B2A" \u0B15\u0B41 \u0B2C\u0B3E\u0B1B\u0B28\u0B4D\u0B24\u0B41\u0964' }
        ],
        stepByStepHint: "\u0B2C\u0B3E\u0B2E\u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B15\u0B30\u0B3F \u0B24\u0B33\u0B15\u0B41 \u0B06\u0B23\u0B3F \u0B21\u0B3E\u0B39\u0B3E\u0B23\u0B15\u0B41 \u0B09\u0B20\u0B3E\u0B28\u0B4D\u0B24\u0B41: \u0B2A!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_pq_pa_${Date.now()}`,
        skillId: "skill_confused_letters_pq",
        title: "\u0A05\u0A71\u0A16\u0A30 \u0A2A\u0A1B\u0A3E\u0A23: \u0A2A \u0A05\u0A24\u0A47 \u0A27 \u{1F50D}",
        instruction: '\u0A05\u0A71\u0A16\u0A30 "\u0A2A" \u0A26\u0A40 \u0A2A\u0A1B\u0A3E\u0A23 \u0A15\u0A30\u0A4B (\u0A09\u0A71\u0A2A\u0A30\u0A4B\u0A02 \u0A16\u0A41\u0A71\u0A32\u0A4D\u0A39\u0A3E \u0A28\u0A39\u0A40\u0A02):',
        difficulty: req.difficulty,
        language: req.language || "Punjabi",
        type: "letter_distinction",
        prompt: '\u0A07\u0A39\u0A28\u0A3E\u0A02 \u0A35\u0A3F\u0A71\u0A1A\u0A4B\u0A02 \u0A15\u0A3F\u0A39\u0A5C\u0A3E \u0A05\u0A71\u0A16\u0A30 "\u0A2A" \u0A39\u0A48?',
        audioPrompt: "\u0A05\u0A71\u0A16\u0A30 \u0A2A \u0A28\u0A42\u0A70 \u0A1B\u0A42\u0A39\u0A4B",
        targetPattern: "pa_vs_dha",
        items: [
          { id: "opt_pa", text: "\u0A2A", visual: "\u{1FA81}", isCorrect: true, feedbackHint: '\u0A2C\u0A39\u0A41\u0A24 \u0A35\u0A27\u0A40\u0A06! \u0A07\u0A39 \u0A05\u0A71\u0A16\u0A30 "\u0A2A" (\u0A2A\u0A24\u0A70\u0A17) \u0A39\u0A48! \u{1F31F}' },
          { id: "opt_dha", text: "\u0A27", visual: "\u{1F3F9}", isCorrect: false, feedbackHint: '\u0A07\u0A39 "\u0A27" (\u0A27\u0A28\u0A41\u0A71\u0A16) \u0A39\u0A48\u0964 \u0A38\u0A39\u0A40 "\u0A2A" \u0A1A\u0A41\u0A23\u0A4B\u0964' }
        ],
        stepByStepHint: "\u0A16\u0A71\u0A2C\u0A47 \u0A24\u0A4B\u0A02 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A15\u0A30\u0A4B \u0A05\u0A24\u0A47 \u0A39\u0A47\u0A20\u0A3E\u0A02 \u0A17\u0A4B\u0A32 \u0A15\u0A30\u0A15\u0A47 \u0A38\u0A71\u0A1C\u0A47 \u0A32\u0A3F\u0A1C\u0A3E\u0A13: \u0A2A!"
      };
    }
    if (isTamil) {
      return {
        id: `act_pq_ta_${Date.now()}`,
        skillId: "skill_confused_letters_pq",
        title: "\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1 \u0B85\u0B9F\u0BC8\u0BAF\u0BBE\u0BB3\u0BAE\u0BCD: \u0BAA \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BAE \u{1F50D}",
        instruction: '\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1 "\u0BAA" \u0BB5\u0BC8 \u0B85\u0B9F\u0BC8\u0BAF\u0BBE\u0BB3\u0BAE\u0BCD \u0B95\u0BBE\u0BA3\u0BB5\u0BC1\u0BAE\u0BCD:',
        difficulty: req.difficulty,
        language: req.language || "Tamil",
        type: "letter_distinction",
        prompt: '\u0B87\u0BB5\u0BB1\u0BCD\u0BB1\u0BBF\u0BB2\u0BCD "\u0BAA" \u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1 \u0B8E\u0BA4\u0BC1?',
        audioPrompt: "\u0BAA \u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC8\u0BA4\u0BCD \u0BA4\u0BCA\u0B9F\u0BB5\u0BC1\u0BAE\u0BCD",
        targetPattern: "pa_vs_ma",
        items: [
          { id: "opt_pa", text: "\u0BAA", visual: "\u{1FA81}", isCorrect: true, feedbackHint: '\u0B85\u0BB0\u0BC1\u0BAE\u0BC8! \u0B87\u0BA4\u0BC1 "\u0BAA" (\u0BAA\u0B9F\u0BCD\u0B9F\u0BAE\u0BCD) \u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1! \u{1F31F}' },
          { id: "opt_ma", text: "\u0BAE", visual: "\u{1F333}", isCorrect: false, feedbackHint: '\u0B87\u0BA4\u0BC1 "\u0BAE" (\u0BAE\u0BB0\u0BAE\u0BCD). \u0BB5\u0BB3\u0BC8\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BBE\u0BA4 "\u0BAA" \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.' }
        ],
        stepByStepHint: "\u0BAE\u0BC7\u0BB2\u0BBF\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1 \u0B95\u0BC0\u0BB4\u0BC7 \u0BB5\u0BA8\u0BCD\u0BA4\u0BC1 \u0BAA\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BC8\u0B95\u0BCD\u0B95\u0BCB\u0B9F\u0BC1 \u0BAA\u0BCB\u0B9F\u0BCD\u0B9F\u0BC1 \u0BAE\u0BC7\u0BB2\u0BC7 \u0B9A\u0BC6\u0BB2\u0BCD\u0BB2\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: \u0BAA!"
      };
    }
    return {
      id: `act_pq_en_${Date.now()}`,
      skillId: "skill_confused_letters_pq",
      title: "Letter Mirror: p vs q \u{1F50D}",
      instruction: 'Find the letter "p" (tail hangs down on the left):',
      difficulty: req.difficulty,
      language: req.language || "English",
      type: "letter_distinction",
      prompt: 'Which letter is "p"?',
      audioPrompt: "Touch the letter p",
      targetPattern: "p_vs_q",
      items: [
        { id: "opt_p", text: "p", visual: "\u{1F355}", isCorrect: true, feedbackHint: 'Super job! "p" has a downward tail on the left! \u{1F355}' },
        { id: "opt_q", text: "q", visual: "\u{1F451}", isCorrect: false, feedbackHint: '"q" has its tail on the right side.' }
      ],
      stepByStepHint: "Trace down first on the left, then bounce up and around: p!"
    };
  }
  if (req.skillId === "skill_confused_words_reversals") {
    if (isHindi) {
      return {
        id: `act_rev_hi_${Date.now()}`,
        skillId: "skill_confused_words_reversals",
        title: "\u0936\u092C\u094D\u0926 \u0926\u093F\u0936\u093E: \u0938\u092C \u092C\u0928\u093E\u092E \u092C\u0938 \u{1F504}",
        instruction: '\u092C\u093E\u090F\u0901 \u0938\u0947 \u0926\u093E\u090F\u0901 \u092A\u0922\u093C\u0915\u0930 \u092C\u0924\u093E\u0907\u090F \u0915\u093F "\u092C\u0938" \u0915\u094C\u0928-\u0938\u093E \u0939\u0948:',
        difficulty: req.difficulty,
        language: req.language || "Hindi",
        type: "word_match",
        prompt: '\u0907\u0928\u092E\u0947\u0902 \u0938\u0947 \u0915\u094C\u0928-\u0938\u093E \u0936\u092C\u094D\u0926 "\u092C\u0938" (\u0917\u093E\u0921\u093C\u0940) \u0939\u0948 \u{1F68C}?',
        audioPrompt: "\u092C\u0938 \u0936\u092C\u094D\u0926 \u0915\u094B \u091A\u0941\u0928\u093F\u090F",
        items: [
          { id: "opt_bas", text: "\u092C\u0938", visual: "\u{1F68C}", isCorrect: true, feedbackHint: "\u092C\u0939\u0941\u0924 \u092C\u0922\u093C\u093F\u092F\u093E! \u092A\u0939\u0932\u0947 \u092C, \u092B\u093F\u0930 \u0938: \u092C\u0938! \u{1F68C}" },
          { id: "opt_sab", text: "\u0938\u092C", visual: "\u{1F465}", isCorrect: false, feedbackHint: '\u092F\u0939 "\u0938\u092C" \u0939\u0948\u0964 \u092C\u093E\u090F\u0901 \u0938\u0947 \u0926\u093E\u090F\u0901 \u092A\u0922\u093C\u093F\u090F: \u092C-\u0938!' }
        ],
        stepByStepHint: "\u092C\u093E\u090F\u0901 \u0938\u0947 \u0926\u093E\u090F\u0901 \u0926\u0947\u0916\u093F\u090F: \u092A\u0939\u0932\u0947 \u092C, \u092B\u093F\u0930 \u0938 = \u092C\u0938!"
      };
    }
    if (isOdia) {
      return {
        id: `act_rev_or_${Date.now()}`,
        skillId: "skill_confused_words_reversals",
        title: "\u0B36\u0B2C\u0B4D\u0B26 \u0B26\u0B3F\u0B17: \u0B2C\u0B38 \u0B2C\u0B28\u0B3E\u0B2E \u0B38\u0B2C \u{1F504}",
        instruction: '\u0B2C\u0B3E\u0B2E\u0B30\u0B41 \u0B21\u0B3E\u0B39\u0B3E\u0B23 \u0B2A\u0B22\u0B3C\u0B3F "\u0B2C\u0B38" \u0B1A\u0B3F\u0B39\u0B4D\u0B28\u0B1F \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41:',
        difficulty: req.difficulty,
        language: req.language || "Odia",
        type: "word_match",
        prompt: '\u0B0F\u0B25\u0B3F\u0B2E\u0B27\u0B4D\u0B5F\u0B30\u0B41 "\u0B2C\u0B38" (\u0B17\u0B3E\u0B21\u0B3C\u0B3F) \u0B36\u0B2C\u0B4D\u0B26 \u0B15\u0B47\u0B09\u0B01\u0B1F\u0B3F \u{1F68C}?',
        audioPrompt: "\u0B2C\u0B38 \u0B36\u0B2C\u0B4D\u0B26\u0B1F\u0B3F \u0B2C\u0B3E\u0B1B\u0B28\u0B4D\u0B24\u0B41",
        items: [
          { id: "opt_bas", text: "\u0B2C\u0B38", visual: "\u{1F68C}", isCorrect: true, feedbackHint: "\u0B05\u0B24\u0B3F \u0B09\u0B24\u0B4D\u0B24\u0B2E! \u0B2C\u0B3E\u0B2E\u0B30\u0B41 \u0B21\u0B3E\u0B39\u0B3E\u0B23: \u0B2C-\u0B38 = \u0B2C\u0B38! \u{1F68C}" },
          { id: "opt_sab", text: "\u0B38\u0B2C", visual: "\u{1F465}", isCorrect: false, feedbackHint: '\u0B0F\u0B39\u0B3E "\u0B38\u0B2C" \u0B05\u0B1F\u0B47\u0964 "\u0B2C\u0B38" \u0B15\u0B41 \u0B2C\u0B3E\u0B1B\u0B28\u0B4D\u0B24\u0B41\u0964' }
        ],
        stepByStepHint: "\u0B2C\u0B3E\u0B2E\u0B30\u0B41 \u0B21\u0B3E\u0B39\u0B3E\u0B23 \u0B32\u0B15\u0B4D\u0B37\u0B4D\u0B5F \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41: \u0B2C \u0B0F\u0B2C\u0B02 \u0B38 = \u0B2C\u0B38!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_rev_pa_${Date.now()}`,
        skillId: "skill_confused_words_reversals",
        title: "\u0A38\u0A3C\u0A2C\u0A26 \u0A26\u0A3F\u0A38\u0A3C\u0A3E: \u0A2C\u0A71\u0A38 \u0A2C\u0A28\u0A3E\u0A2E \u0A38\u0A71\u0A2C \u{1F504}",
        instruction: '\u0A16\u0A71\u0A2C\u0A47 \u0A24\u0A4B\u0A02 \u0A38\u0A71\u0A1C\u0A47 \u0A2A\u0A5C\u0A4D\u0A39 \u0A15\u0A47 "\u0A2C\u0A71\u0A38" \u0A26\u0A40 \u0A2A\u0A1B\u0A3E\u0A23 \u0A15\u0A30\u0A4B:',
        difficulty: req.difficulty,
        language: req.language || "Punjabi",
        type: "word_match",
        prompt: '\u0A07\u0A39\u0A28\u0A3E\u0A02 \u0A35\u0A3F\u0A71\u0A1A\u0A4B\u0A02 "\u0A2C\u0A71\u0A38" (\u0A17\u0A71\u0A21\u0A40) \u0A38\u0A3C\u0A2C\u0A26 \u0A15\u0A3F\u0A39\u0A5C\u0A3E \u0A39\u0A48 \u{1F68C}?',
        audioPrompt: "\u0A2C\u0A71\u0A38 \u0A38\u0A3C\u0A2C\u0A26 \u0A1A\u0A41\u0A23\u0A4B",
        items: [
          { id: "opt_bas", text: "\u0A2C\u0A71\u0A38", visual: "\u{1F68C}", isCorrect: true, feedbackHint: "\u0A2C\u0A39\u0A41\u0A24 \u0A35\u0A27\u0A40\u0A06! \u0A16\u0A71\u0A2C\u0A47 \u0A24\u0A4B\u0A02 \u0A38\u0A71\u0A1C\u0A47: \u0A2C-\u0A71\u0A38 = \u0A2C\u0A71\u0A38! \u{1F68C}" },
          { id: "opt_sab", text: "\u0A38\u0A71\u0A2C", visual: "\u{1F465}", isCorrect: false, feedbackHint: '\u0A07\u0A39 "\u0A38\u0A71\u0A2C" \u0A39\u0A48\u0964 \u0A38\u0A39\u0A40 "\u0A2C\u0A71\u0A38" \u0A1A\u0A41\u0A23\u0A4B\u0964' }
        ],
        stepByStepHint: "\u0A16\u0A71\u0A2C\u0A47 \u0A24\u0A4B\u0A02 \u0A38\u0A71\u0A1C\u0A47 \u0A1F\u0A30\u0A48\u0A15 \u0A15\u0A30\u0A4B: \u0A2C \u0A2B\u0A3F\u0A30 \u0A71\u0A38 = \u0A2C\u0A71\u0A38!"
      };
    }
    if (isTamil) {
      return {
        id: `act_rev_ta_${Date.now()}`,
        skillId: "skill_confused_words_reversals",
        title: "\u0B9A\u0BCA\u0BB2\u0BCD \u0BB5\u0BB0\u0BBF\u0B9A\u0BC8: \u0B95\u0BB2\u0BCD \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BB2\u0B95\u0BCD \u{1F504}",
        instruction: '\u0B87\u0B9F\u0BAE\u0BBF\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1 \u0BB5\u0BB2\u0BAE\u0BBE\u0B95\u0BAA\u0BCD \u0BAA\u0B9F\u0BBF\u0BA4\u0BCD\u0BA4\u0BC1 "\u0B95\u0BB2\u0BCD" \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC8\u0B95\u0BCD \u0B95\u0BA3\u0BCD\u0B9F\u0BB1\u0BBF\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD:',
        difficulty: req.difficulty,
        language: req.language || "Tamil",
        type: "word_match",
        prompt: '\u0B87\u0BB5\u0BB1\u0BCD\u0BB1\u0BBF\u0BB2\u0BCD "\u0B95\u0BB2\u0BCD" \u0B8E\u0BA9\u0BCD\u0BB1 \u0B9A\u0BCA\u0BB2\u0BCD \u0B8E\u0BA4\u0BC1 \u{1FAA8}?',
        audioPrompt: "\u0B95\u0BB2\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC8\u0BA4\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD",
        items: [
          { id: "opt_kal", text: "\u0B95\u0BB2\u0BCD", visual: "\u{1FAA8}", isCorrect: true, feedbackHint: "\u0B85\u0BB0\u0BC1\u0BAE\u0BC8! \u0B87\u0B9F\u0BAE\u0BBF\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1 \u0BB5\u0BB2\u0BAE\u0BCD: \u0B95-\u0BB2\u0BCD = \u0B95\u0BB2\u0BCD! \u{1FAA8}" },
          { id: "opt_lak", text: "\u0BB2\u0B95\u0BCD", visual: "\u274C", isCorrect: false, feedbackHint: '\u0B87\u0BA4\u0BC1 "\u0BB2\u0B95\u0BCD". "\u0B95\u0BB2\u0BCD" \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.' }
        ],
        stepByStepHint: "\u0B87\u0B9F\u0BAE\u0BBF\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1 \u0BB5\u0BB2\u0BAE\u0BBE\u0B95\u0BAA\u0BCD \u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD: \u0B95 \u0BAA\u0BBF\u0BB1\u0B95\u0BC1 \u0BB2\u0BCD = \u0B95\u0BB2\u0BCD!"
      };
    }
    return {
      id: `act_rev_en_${Date.now()}`,
      skillId: "skill_confused_words_reversals",
      title: "Word Tracking: was vs saw \u{1F504}",
      instruction: 'Track left-to-right to find the word "was":',
      difficulty: req.difficulty,
      language: req.language || "English",
      type: "word_match",
      prompt: 'Which word says "was"?',
      audioPrompt: "Find the word was",
      items: [
        { id: "opt_was", text: "was", visual: "\u{1F4D6}", isCorrect: true, feedbackHint: 'Terrific! Left to right: w-a-s spells "was"! \u{1F31F}' },
        { id: "opt_saw", text: "saw", visual: "\u{1FA9A}", isCorrect: false, feedbackHint: 'That says "saw". Read left to right: w-a-s.' }
      ],
      stepByStepHint: "Slide your finger from left to right: w... a... s: was!"
    };
  }
  if (req.skillId === "skill_cvc_blending") {
    if (isHindi) {
      return {
        id: `act_blend_hindi_${Date.now()}`,
        skillId: "skill_cvc_blending",
        title: "\u0927\u094D\u0935\u0928\u093F \u091C\u094B\u0921\u093C: \u0926\u094B \u0905\u0915\u094D\u0937\u0930\u094B\u0902 \u0915\u093E \u0936\u092C\u094D\u0926 \u{1F9E9}",
        instruction: "\u0927\u094D\u0935\u0928\u093F\u092F\u094B\u0902 \u0915\u094B \u091C\u094B\u0921\u093C\u0915\u0930 \u0936\u092C\u094D\u0926 \u092A\u0939\u091A\u093E\u0928\u093F\u090F: \u0918 + \u0930",
        difficulty: req.difficulty,
        language: "Hindi",
        type: "phonics_blend",
        prompt: "\u0918 \u0914\u0930 \u0930 \u092E\u093F\u0932\u0915\u0930 \u0915\u094D\u092F\u093E \u092C\u0928\u0924\u093E \u0939\u0948?",
        items: [
          { id: "opt_ghar", text: "\u0918\u0930", visual: "\u{1F3E0}", isCorrect: true, feedbackHint: '\u092C\u0939\u0941\u0924 \u092C\u0922\u093C\u093F\u092F\u093E! \u0918 \u0914\u0930 \u0930 \u092E\u093F\u0932\u0915\u0930 "\u0918\u0930" \u092C\u0928\u0924\u093E \u0939\u0948! \u{1F308}' },
          { id: "opt_phal", text: "\u092B\u0932", visual: "\u{1F34E}", isCorrect: false, feedbackHint: "\u0927\u094D\u092F\u093E\u0928 \u0938\u0947 \u0938\u0941\u0928\u093F\u090F: \u0918-\u0930" },
          { id: "opt_jal", text: "\u091C\u0932", visual: "\u{1F4A7}", isCorrect: false, feedbackHint: "\u092F\u0939 \u091C-\u0932 \u0939\u0948\u0964 \u0918-\u0930 \u091A\u0941\u0928\u093F\u090F\u0964" }
        ],
        stepByStepHint: "\u092A\u0939\u0932\u0947 \u0918 \u092C\u094B\u0932\u093F\u090F, \u092B\u093F\u0930 \u0930 \u092C\u094B\u0932\u093F\u090F, \u0905\u092C \u0926\u094B\u0928\u094B\u0902 \u0915\u094B \u092E\u093F\u0932\u093E\u0915\u0930 \u092C\u094B\u0932\u093F\u090F: \u0918\u0930!"
      };
    }
    if (isOdia) {
      return {
        id: `act_blend_or_${Date.now()}`,
        skillId: "skill_cvc_blending",
        title: "\u0B27\u0B4D\u0B71\u0B28\u0B3F \u0B2F\u0B4B\u0B21\u0B3C: \u0B26\u0B41\u0B07 \u0B05\u0B15\u0B4D\u0B37\u0B30 \u0B36\u0B2C\u0B4D\u0B26 \u{1F9E9}",
        instruction: "\u0B27\u0B4D\u0B71\u0B28\u0B3F \u0B2F\u0B4B\u0B21\u0B3C\u0B3F \u0B36\u0B2C\u0B4D\u0B26 \u0B1A\u0B3F\u0B39\u0B4D\u0B28\u0B1F \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41: \u0B18 + \u0B30",
        difficulty: req.difficulty,
        language: "Odia",
        type: "phonics_blend",
        prompt: "\u0B18 \u0B0F\u0B2C\u0B02 \u0B30 \u0B2E\u0B3F\u0B36\u0B3F\u0B32\u0B47 \u0B15\u0B23 \u0B39\u0B41\u0B0F?",
        items: [
          { id: "opt_ghar", text: "\u0B18\u0B30", visual: "\u{1F3E0}", isCorrect: true, feedbackHint: '\u0B05\u0B24\u0B3F \u0B09\u0B24\u0B4D\u0B24\u0B2E! \u0B18 \u0B0F\u0B2C\u0B02 \u0B30 \u0B2E\u0B3F\u0B36\u0B3F "\u0B18\u0B30" \u0B39\u0B41\u0B0F! \u{1F308}' },
          { id: "opt_phal", text: "\u0B2B\u0B33", visual: "\u{1F34E}", isCorrect: false, feedbackHint: "\u0B0F\u0B39\u0B3E \u0B2B-\u0B33\u0964 \u0B18-\u0B30 \u0B2C\u0B3E\u0B1B\u0B28\u0B4D\u0B24\u0B41\u0964" },
          { id: "opt_jal", text: "\u0B1C\u0B33", visual: "\u{1F4A7}", isCorrect: false, feedbackHint: "\u0B0F\u0B39\u0B3E \u0B1C-\u0B33\u0964 \u0B18-\u0B30 \u0B2C\u0B3E\u0B1B\u0B28\u0B4D\u0B24\u0B41\u0964" }
        ],
        stepByStepHint: "\u0B2A\u0B4D\u0B30\u0B25\u0B2E\u0B47 \u0B18 \u0B15\u0B41\u0B39\u0B28\u0B4D\u0B24\u0B41, \u0B2A\u0B30\u0B47 \u0B30 \u0B15\u0B41\u0B39\u0B28\u0B4D\u0B24\u0B41, \u0B0F\u0B15\u0B3E\u0B20\u0B3F \u0B2E\u0B3F\u0B36\u0B3E\u0B07 \u0B15\u0B41\u0B39\u0B28\u0B4D\u0B24\u0B41: \u0B18\u0B30!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_blend_pa_${Date.now()}`,
        skillId: "skill_cvc_blending",
        title: "\u0A27\u0A41\u0A28\u0A40 \u0A1C\u0A4B\u0A5C: \u0A26\u0A4B \u0A05\u0A71\u0A16\u0A30\u0A40 \u0A38\u0A3C\u0A2C\u0A26 \u{1F9E9}",
        instruction: "\u0A27\u0A41\u0A28\u0A40\u0A06\u0A02 \u0A1C\u0A4B\u0A5C \u0A15\u0A47 \u0A38\u0A3C\u0A2C\u0A26 \u0A2C\u0A23\u0A3E\u0A13: \u0A18 + \u0A30",
        difficulty: req.difficulty,
        language: "Punjabi",
        type: "phonics_blend",
        prompt: "\u0A18 \u0A05\u0A24\u0A47 \u0A30 \u0A2E\u0A3F\u0A32 \u0A15\u0A47 \u0A15\u0A40 \u0A2C\u0A23\u0A26\u0A3E \u0A39\u0A48?",
        items: [
          { id: "opt_ghar", text: "\u0A18\u0A30", visual: "\u{1F3E0}", isCorrect: true, feedbackHint: '\u0A38\u0A3C\u0A3E\u0A2C\u0A3E\u0A38\u0A3C! \u0A18 \u0A05\u0A24\u0A47 \u0A30 \u0A2E\u0A3F\u0A32 \u0A15\u0A47 "\u0A18\u0A30" \u0A2C\u0A23\u0A26\u0A3E \u0A39\u0A48! \u{1F308}' },
          { id: "opt_phal", text: "\u0A2B\u0A32", visual: "\u{1F34E}", isCorrect: false, feedbackHint: "\u0A27\u0A3F\u0A06\u0A28 \u0A28\u0A3E\u0A32 \u0A38\u0A41\u0A23\u0A4B: \u0A18-\u0A30" },
          { id: "opt_jal", text: "\u0A1C\u0A32", visual: "\u{1F4A7}", isCorrect: false, feedbackHint: "\u0A07\u0A39 \u0A1C-\u0A32 \u0A39\u0A48\u0964 \u0A18-\u0A30 \u0A1A\u0A41\u0A23\u0A4B\u0964" }
        ],
        stepByStepHint: "\u0A2A\u0A39\u0A3F\u0A32\u0A3E\u0A02 \u0A18 \u0A2C\u0A4B\u0A32\u0A4B, \u0A2B\u0A3F\u0A30 \u0A30 \u0A2C\u0A4B\u0A32\u0A4B, \u0A2E\u0A3F\u0A32\u0A3E \u0A15\u0A47 \u0A2C\u0A4B\u0A32\u0A4B: \u0A18\u0A30!"
      };
    }
    if (isTamil) {
      return {
        id: `act_blend_ta_${Date.now()}`,
        skillId: "skill_cvc_blending",
        title: "\u0B92\u0BB2\u0BBF \u0B87\u0BA3\u0BC8\u0BA4\u0BCD\u0BA4\u0BB2\u0BCD: \u0B9A\u0BCA\u0BB2\u0BCD \u0B89\u0BB0\u0BC1\u0BB5\u0BBE\u0B95\u0BCD\u0B95\u0BAE\u0BCD \u{1F9E9}",
        instruction: "\u0B92\u0BB2\u0BBF\u0B95\u0BB3\u0BC8 \u0B87\u0BA3\u0BC8\u0BA4\u0BCD\u0BA4\u0BC1\u0B9A\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC8\u0B95\u0BCD \u0B95\u0BA3\u0BCD\u0B9F\u0BB1\u0BBF\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD: \u0BAA + \u0BB2\u0BCD",
        difficulty: req.difficulty,
        language: "Tamil",
        type: "phonics_blend",
        prompt: "\u0BAA \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BB2\u0BCD \u0B9A\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BBE\u0BB2\u0BCD \u0B8E\u0BA9\u0BCD\u0BA9 \u0B9A\u0BCA\u0BB2\u0BCD?",
        items: [
          { id: "opt_pal", text: "\u0BAA\u0BB2\u0BCD", visual: "\u{1F9B7}", isCorrect: true, feedbackHint: '\u0B85\u0BB0\u0BC1\u0BAE\u0BC8! \u0BAA \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BB2\u0BCD \u0B9A\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BBE\u0BB2\u0BCD "\u0BAA\u0BB2\u0BCD"! \u{1F308}' },
          { id: "opt_kal", text: "\u0B95\u0BB2\u0BCD", visual: "\u{1FAA8}", isCorrect: false, feedbackHint: "\u0B87\u0BA4\u0BC1 \u0B95-\u0BB2\u0BCD. \u0BAA-\u0BB2\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD." },
          { id: "opt_pazham", text: "\u0BAA\u0BB4\u0BAE\u0BCD", visual: "\u{1F34E}", isCorrect: false, feedbackHint: "\u0B87\u0BA4\u0BC1 \u0BAA\u0BB4\u0BAE\u0BCD. \u0BAA-\u0BB2\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD." }
        ],
        stepByStepHint: "\u0BAE\u0BC1\u0BA4\u0BB2\u0BBF\u0BB2\u0BCD \u0BAA \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD, \u0BAA\u0BBF\u0BA9\u0BCD \u0BB2\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: \u0BAA\u0BB2\u0BCD!"
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
      items: [
        { id: "opt_sun", text: "sun", visual: "\u2600\uFE0F", isCorrect: true, feedbackHint: "Fantastic sound blending! /s/ /u/ /n/ -> SUN! \u{1F31E}" },
        { id: "opt_run", text: "run", visual: "\u{1F3C3}", isCorrect: false, feedbackHint: 'Close, but "run" starts with /r/.' },
        { id: "opt_bus", text: "bus", visual: "\u{1F68C}", isCorrect: false, feedbackHint: '"bus" ends with /s/.' }
      ],
      stepByStepHint: "Stretch the sounds on your arm: shoulder /s/, elbow /u/, wrist /n/. Now slide down: sun!"
    };
  }
  if (req.skillId === "skill_consonant_blends") {
    if (isHindi) {
      return {
        id: `act_blend_sh_hi_${Date.now()}`,
        skillId: "skill_consonant_blends",
        title: "\u0938\u0902\u092F\u0941\u0915\u094D\u0924\u093E\u0915\u094D\u0937\u0930: /\u0924\u094D\u0930/ \u{1F531}",
        instruction: '\u0915\u093F\u0938 \u0936\u092C\u094D\u0926 \u092E\u0947\u0902 "\u0924\u094D\u0930" \u0938\u0902\u092F\u0941\u0915\u094D\u0924\u093E\u0915\u094D\u0937\u0930 \u0939\u0948:',
        difficulty: req.difficulty,
        language: req.language || "Hindi",
        type: "word_match",
        prompt: '\u0915\u093F\u0938 \u0936\u092C\u094D\u0926 \u092E\u0947\u0902 "\u0924\u094D\u0930" \u0938\u0902\u092F\u0941\u0915\u094D\u0924\u093E\u0915\u094D\u0937\u0930 \u0939\u0948?',
        audioPrompt: "\u0924\u094D\u0930\u093F\u0936\u0942\u0932 \u0936\u092C\u094D\u0926 \u0915\u094B \u092A\u0939\u091A\u093E\u0928\u093F\u090F",
        items: [
          { id: "opt_trishul", text: "\u0924\u094D\u0930\u093F\u0936\u0942\u0932", visual: "\u{1F531}", isCorrect: true, feedbackHint: '\u092C\u0939\u0941\u0924 \u0916\u0942\u092C! \u0924\u094D\u0930\u093F\u0936\u0942\u0932 \u092E\u0947\u0902 "\u0924\u094D\u0930" \u0938\u0902\u092F\u0941\u0915\u094D\u0924\u093E\u0915\u094D\u0937\u0930 \u0939\u0948! \u{1F531}' },
          { id: "opt_kamal", text: "\u0915\u092E\u0932", visual: "\u{1FAB7}", isCorrect: false, feedbackHint: "\u0915\u092E\u0932 \u092E\u0947\u0902 \u0915\u094B\u0908 \u0938\u0902\u092F\u0941\u0915\u094D\u0924\u093E\u0915\u094D\u0937\u0930 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964" }
        ],
        stepByStepHint: "\u0924 \u0914\u0930 \u0930 \u092E\u093F\u0932\u0915\u0930 \u0924\u094D\u0930 \u092C\u0928\u0924\u093E \u0939\u0948: \u0924\u094D\u0930\u093F\u0936\u0942\u0932!"
      };
    }
    if (isOdia) {
      return {
        id: `act_blend_sh_or_${Date.now()}`,
        skillId: "skill_consonant_blends",
        title: "\u0B2F\u0B41\u0B15\u0B4D\u0B24\u0B3E\u0B15\u0B4D\u0B37\u0B30: /\u0B24\u0B4D\u0B30/ \u{1F1EE}\u{1F1F3}",
        instruction: '\u0B15\u0B47\u0B09\u0B01 \u0B36\u0B2C\u0B4D\u0B26\u0B30\u0B47 "\u0B24\u0B4D\u0B30" \u0B2F\u0B41\u0B15\u0B4D\u0B24\u0B3E\u0B15\u0B4D\u0B37\u0B30 \u0B30\u0B39\u0B3F\u0B1B\u0B3F:',
        difficulty: req.difficulty,
        language: req.language || "Odia",
        type: "word_match",
        prompt: '\u0B15\u0B47\u0B09\u0B01 \u0B36\u0B2C\u0B4D\u0B26\u0B30\u0B47 "\u0B24\u0B4D\u0B30" \u0B2F\u0B41\u0B15\u0B4D\u0B24\u0B3E\u0B15\u0B4D\u0B37\u0B30 \u0B05\u0B1B\u0B3F?',
        audioPrompt: "\u0B24\u0B4D\u0B30\u0B3F\u0B30\u0B19\u0B4D\u0B17\u0B3E \u0B36\u0B2C\u0B4D\u0B26 \u0B1A\u0B3F\u0B39\u0B4D\u0B28\u0B1F \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41",
        items: [
          { id: "opt_triranga", text: "\u0B24\u0B4D\u0B30\u0B3F\u0B30\u0B19\u0B4D\u0B17\u0B3E", visual: "\u{1F1EE}\u{1F1F3}", isCorrect: true, feedbackHint: '\u0B05\u0B24\u0B3F \u0B38\u0B41\u0B28\u0B4D\u0B26\u0B30! \u0B24\u0B4D\u0B30\u0B3F\u0B30\u0B19\u0B4D\u0B17\u0B3E\u0B30\u0B47 "\u0B24\u0B4D\u0B30" \u0B2F\u0B41\u0B15\u0B4D\u0B24\u0B3E\u0B15\u0B4D\u0B37\u0B30 \u0B05\u0B1B\u0B3F! \u{1F1EE}\u{1F1F3}' },
          { id: "opt_kamala", text: "\u0B15\u0B2E\u0B33", visual: "\u{1FAB7}", isCorrect: false, feedbackHint: "\u0B15\u0B2E\u0B33\u0B30\u0B47 \u0B15\u0B4C\u0B23\u0B38\u0B3F \u0B2F\u0B41\u0B15\u0B4D\u0B24\u0B3E\u0B15\u0B4D\u0B37\u0B30 \u0B28\u0B3E\u0B39\u0B3F\u0B01\u0964" }
        ],
        stepByStepHint: "\u0B24 \u0B0F\u0B2C\u0B02 \u0B30 \u0B2E\u0B3F\u0B36\u0B3F \u0B24\u0B4D\u0B30 \u0B39\u0B41\u0B0F: \u0B24\u0B4D\u0B30\u0B3F\u0B30\u0B19\u0B4D\u0B17\u0B3E!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_blend_sh_pa_${Date.now()}`,
        skillId: "skill_consonant_blends",
        title: "\u0A38\u0A70\u0A2F\u0A41\u0A15\u0A24 \u0A27\u0A41\u0A28\u0A40: /\u0A24\u0A4D\u0A30/ \u{1F531}",
        instruction: '\u0A15\u0A3F\u0A39\u0A5C\u0A47 \u0A38\u0A3C\u0A2C\u0A26 \u0A35\u0A3F\u0A71\u0A1A "\u0A24\u0A4D\u0A30" \u0A27\u0A41\u0A28\u0A40 \u0A39\u0A48:',
        difficulty: req.difficulty,
        language: req.language || "Punjabi",
        type: "word_match",
        prompt: '\u0A15\u0A3F\u0A39\u0A5C\u0A47 \u0A38\u0A3C\u0A2C\u0A26 \u0A35\u0A3F\u0A71\u0A1A "\u0A24\u0A4D\u0A30" \u0A27\u0A41\u0A28\u0A40 \u0A39\u0A48?',
        audioPrompt: "\u0A24\u0A4D\u0A30\u0A3F\u0A38\u0A3C\u0A42\u0A32 \u0A38\u0A3C\u0A2C\u0A26 \u0A1A\u0A41\u0A23\u0A4B",
        items: [
          { id: "opt_trishul", text: "\u0A24\u0A4D\u0A30\u0A3F\u0A38\u0A3C\u0A42\u0A32", visual: "\u{1F531}", isCorrect: true, feedbackHint: '\u0A2C\u0A39\u0A41\u0A24 \u0A35\u0A27\u0A40\u0A06! \u0A24\u0A4D\u0A30\u0A3F\u0A38\u0A3C\u0A42\u0A32 \u0A35\u0A3F\u0A71\u0A1A "\u0A24\u0A4D\u0A30" \u0A27\u0A41\u0A28\u0A40 \u0A39\u0A48! \u{1F531}' },
          { id: "opt_kamal", text: "\u0A15\u0A2E\u0A32", visual: "\u{1FAB7}", isCorrect: false, feedbackHint: "\u0A15\u0A2E\u0A32 \u0A35\u0A3F\u0A71\u0A1A \u0A38\u0A70\u0A2F\u0A41\u0A15\u0A24 \u0A27\u0A41\u0A28\u0A40 \u0A28\u0A39\u0A40\u0A02 \u0A39\u0A48\u0964" }
        ],
        stepByStepHint: "\u0A24 \u0A05\u0A24\u0A47 \u0A30 \u0A30\u0A32 \u0A15\u0A47 \u0A24\u0A4D\u0A30 \u0A2C\u0A23\u0A26\u0A3E \u0A39\u0A48: \u0A24\u0A4D\u0A30\u0A3F\u0A38\u0A3C\u0A42\u0A32!"
      };
    }
    if (isTamil) {
      return {
        id: `act_blend_sh_ta_${Date.now()}`,
        skillId: "skill_consonant_blends",
        title: "\u0B95\u0BC2\u0B9F\u0BCD\u0B9F\u0BC1 \u0BAE\u0BC6\u0BAF\u0BCD\u0BAF\u0BCA\u0BB2\u0BBF: /\u0BA4\u0BCD\u0BB0/ \u{1F347}",
        instruction: '\u0B8E\u0BA8\u0BCD\u0BA4\u0B9A\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BBF\u0BB2\u0BCD "\u0BA4\u0BBF\u0BB0\u0BBE" \u0B92\u0BB2\u0BBF \u0BB5\u0BB0\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1:',
        difficulty: req.difficulty,
        language: req.language || "Tamil",
        type: "word_match",
        prompt: '\u0B8E\u0BA8\u0BCD\u0BA4\u0B9A\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BBF\u0BB2\u0BCD "\u0BA4\u0BBF\u0BB0\u0BBE" \u0B95\u0BC2\u0B9F\u0BCD\u0B9F\u0BC1 \u0B92\u0BB2\u0BBF \u0B89\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1?',
        audioPrompt: "\u0BA4\u0BBF\u0BB0\u0BBE\u0B9F\u0BCD\u0B9A\u0BC8 \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC8\u0BA4\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD",
        items: [
          { id: "opt_grapes", text: "\u0BA4\u0BBF\u0BB0\u0BBE\u0B9F\u0BCD\u0B9A\u0BC8", visual: "\u{1F347}", isCorrect: true, feedbackHint: "\u0B85\u0BB0\u0BC1\u0BAE\u0BC8! \u0BA4\u0BBF\u0BB0\u0BBE\u0B9F\u0BCD\u0B9A\u0BC8\u0BAF\u0BBF\u0BB2\u0BCD \u0B95\u0BC2\u0B9F\u0BCD\u0B9F\u0BC1 \u0B92\u0BB2\u0BBF \u0B89\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1! \u{1F347}" },
          { id: "opt_apple", text: "\u0B86\u0BAA\u0BCD\u0BAA\u0BBF\u0BB3\u0BCD", visual: "\u{1F34E}", isCorrect: false, feedbackHint: "\u0BA4\u0BBF\u0BB0\u0BBE\u0B9F\u0BCD\u0B9A\u0BC8 \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC8\u0BA4\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD." }
        ],
        stepByStepHint: "\u0BA4\u0BCD + \u0BB0\u0BBE = \u0BA4\u0BBF\u0BB0\u0BBE: \u0BA4\u0BBF\u0BB0\u0BBE\u0B9F\u0BCD\u0B9A\u0BC8!"
      };
    }
    return {
      id: `act_blend_sh_en_${Date.now()}`,
      skillId: "skill_consonant_blends",
      title: "Digraph Safari: /sh/ Sound \u{1F6A2}",
      instruction: "Find the word starting with the quiet /sh/ sound:",
      difficulty: req.difficulty,
      language: req.language || "English",
      type: "word_match",
      prompt: "Which word starts with /sh/?",
      audioPrompt: "Find the word that starts with sh",
      items: [
        { id: "opt_ship", text: "Ship", visual: "\u{1F6A2}", isCorrect: true, feedbackHint: "Super! Shhh-ip starts with /sh/! \u{1F6A2}" },
        { id: "opt_boat", text: "Boat", visual: "\u26F5", isCorrect: false, feedbackHint: "Boat starts with /b/." }
      ],
      stepByStepHint: "Put your finger to your lips: shhhhh... Ship!"
    };
  }
  if (req.skillId === "skill_letter_sounds_vowels") {
    if (isHindi) {
      return {
        id: `act_vow_hi_${Date.now()}`,
        skillId: "skill_letter_sounds_vowels",
        title: "\u0938\u094D\u0935\u0930 \u0927\u094D\u0935\u0928\u093F: /\u0905/ \u{1F34E}",
        instruction: '\u0915\u094C\u0928-\u0938\u093E \u0936\u092C\u094D\u0926 "\u0905" \u0938\u094D\u0935\u0930 \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0924\u093E \u0939\u0948:',
        difficulty: req.difficulty,
        language: req.language || "Hindi",
        type: "word_match",
        prompt: '\u0915\u094C\u0928-\u0938\u093E \u0936\u092C\u094D\u0926 "\u0905" \u0938\u094D\u0935\u0930 \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0924\u093E \u0939\u0948?',
        audioPrompt: "\u0905 \u0938\u0947 \u0905\u0928\u093E\u0930 \u092A\u0939\u091A\u093E\u0928\u093F\u090F",
        items: [
          { id: "opt_anar", text: "\u0905\u0928\u093E\u0930", visual: "\u{1F34E}", isCorrect: true, feedbackHint: "\u092C\u0939\u0941\u0924 \u092C\u0922\u093C\u093F\u092F\u093E! \u0905 \u0938\u0947 \u0905\u0928\u093E\u0930! \u{1F34E}" },
          { id: "opt_kela", text: "\u0915\u0947\u0932\u093E", visual: "\u{1F34C}", isCorrect: false, feedbackHint: '\u0915\u0947\u0932\u093E "\u0915" \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0924\u093E \u0939\u0948\u0964' },
          { id: "opt_aam", text: "\u0906\u092E", visual: "\u{1F96D}", isCorrect: false, feedbackHint: '\u0906\u092E "\u0906" \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0924\u093E \u0939\u0948\u0964' }
        ],
        stepByStepHint: "\u0917\u0932\u0947 \u0938\u0947 \u091B\u094B\u091F\u0940 \u0938\u094D\u0935\u0930 \u0927\u094D\u0935\u0928\u093F \u0928\u093F\u0915\u093E\u0932\u093F\u090F: \u0905... \u0905\u0928\u093E\u0930!"
      };
    }
    if (isOdia) {
      return {
        id: `act_vow_or_${Date.now()}`,
        skillId: "skill_letter_sounds_vowels",
        title: "\u0B38\u0B4D\u0B71\u0B30 \u0B27\u0B4D\u0B71\u0B28\u0B3F: /\u0B05/ \u{1F348}",
        instruction: '\u0B15\u0B47\u0B09\u0B01 \u0B36\u0B2C\u0B4D\u0B26\u0B1F\u0B3F "\u0B05" \u0B38\u0B4D\u0B71\u0B30\u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B47\u0B09\u0B1B\u0B3F:',
        difficulty: req.difficulty,
        language: req.language || "Odia",
        type: "word_match",
        prompt: '\u0B15\u0B47\u0B09\u0B01 \u0B36\u0B2C\u0B4D\u0B26\u0B1F\u0B3F "\u0B05" \u0B38\u0B4D\u0B71\u0B30\u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B41\u0B0F?',
        audioPrompt: "\u0B05 \u0B30\u0B41 \u0B05\u0B2E\u0B43\u0B24\u0B2D\u0B23\u0B4D\u0B21\u0B3E \u0B2C\u0B3E\u0B1B\u0B28\u0B4D\u0B24\u0B41",
        items: [
          { id: "opt_amruta", text: "\u0B05\u0B2E\u0B43\u0B24\u0B2D\u0B23\u0B4D\u0B21\u0B3E", visual: "\u{1F348}", isCorrect: true, feedbackHint: "\u0B1A\u0B2E\u0B24\u0B4D\u0B15\u0B3E\u0B30! \u0B05 \u0B30\u0B41 \u0B05\u0B2E\u0B43\u0B24\u0B2D\u0B23\u0B4D\u0B21\u0B3E! \u{1F348}" },
          { id: "opt_kadali", text: "\u0B15\u0B26\u0B33\u0B40", visual: "\u{1F34C}", isCorrect: false, feedbackHint: '\u0B15\u0B26\u0B33\u0B40 "\u0B15" \u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B41\u0B0F\u0964' },
          { id: "opt_aamba", text: "\u0B06\u0B2E\u0B4D\u0B2C", visual: "\u{1F96D}", isCorrect: false, feedbackHint: '\u0B06\u0B2E\u0B4D\u0B2C "\u0B06" \u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B41\u0B0F\u0964' }
        ],
        stepByStepHint: "\u0B15\u0B23\u0B4D\u0B20\u0B30\u0B41 \u0B27\u0B4D\u0B71\u0B28\u0B3F \u0B2C\u0B3E\u0B39\u0B3E\u0B30 \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41: \u0B05... \u0B05\u0B2E\u0B43\u0B24\u0B2D\u0B23\u0B4D\u0B21\u0B3E!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_vow_pa_${Date.now()}`,
        skillId: "skill_letter_sounds_vowels",
        title: "\u0A38\u0A35\u0A30 \u0A27\u0A41\u0A28\u0A40: /\u0A05/ \u{1F34E}",
        instruction: '\u0A15\u0A3F\u0A39\u0A5C\u0A3E \u0A38\u0A3C\u0A2C\u0A26 "\u0A05" \u0A38\u0A35\u0A30 \u0A28\u0A3E\u0A32 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A39\u0A41\u0A70\u0A26\u0A3E \u0A39\u0A48:',
        difficulty: req.difficulty,
        language: req.language || "Punjabi",
        type: "word_match",
        prompt: '\u0A15\u0A3F\u0A39\u0A5C\u0A3E \u0A38\u0A3C\u0A2C\u0A26 "\u0A05" \u0A38\u0A35\u0A30 \u0A28\u0A3E\u0A32 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A39\u0A41\u0A70\u0A26\u0A3E \u0A39\u0A48?',
        audioPrompt: "\u0A05 \u0A24\u0A4B\u0A02 \u0A05\u0A28\u0A3E\u0A30 \u0A1A\u0A41\u0A23\u0A4B",
        items: [
          { id: "opt_anar", text: "\u0A05\u0A28\u0A3E\u0A30", visual: "\u{1F34E}", isCorrect: true, feedbackHint: "\u0A2C\u0A39\u0A41\u0A24 \u0A35\u0A27\u0A40\u0A06! \u0A05 \u0A24\u0A4B\u0A02 \u0A05\u0A28\u0A3E\u0A30! \u{1F34E}" },
          { id: "opt_kela", text: "\u0A15\u0A47\u0A32\u0A3E", visual: "\u{1F34C}", isCorrect: false, feedbackHint: '\u0A15\u0A47\u0A32\u0A3E "\u0A15" \u0A28\u0A3E\u0A32 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A39\u0A41\u0A70\u0A26\u0A3E \u0A39\u0A48\u0964' },
          { id: "opt_amb", text: "\u0A05\u0A70\u0A2C", visual: "\u{1F96D}", isCorrect: false, feedbackHint: "\u0A07\u0A39 \u0A1F\u0A3F\u0A71\u0A2A\u0A40 \u0A35\u0A3E\u0A32\u0A3E \u0A05\u0A70\u0A2C \u0A39\u0A48\u0964" }
        ],
        stepByStepHint: "\u0A38\u0A70\u0A18 \u0A35\u0A3F\u0A71\u0A1A\u0A4B\u0A02 \u0A1B\u0A4B\u0A1F\u0A40 \u0A06\u0A35\u0A3E\u0A1C\u0A3C \u0A15\u0A71\u0A22\u0A4B: \u0A05... \u0A05\u0A28\u0A3E\u0A30!"
      };
    }
    if (isTamil) {
      return {
        id: `act_vow_ta_${Date.now()}`,
        skillId: "skill_letter_sounds_vowels",
        title: "\u0B89\u0BAF\u0BBF\u0BB0\u0BCD \u0B92\u0BB2\u0BBF: /\u0B85/ \u{1F43F}\uFE0F",
        instruction: '\u0B8E\u0BA8\u0BCD\u0BA4\u0B9A\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD "\u0B85" \u0B89\u0BAF\u0BBF\u0BB0\u0BCD \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1:',
        difficulty: req.difficulty,
        language: req.language || "Tamil",
        type: "word_match",
        prompt: '\u0B8E\u0BA8\u0BCD\u0BA4\u0B9A\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD "\u0B85" \u0B89\u0BAF\u0BBF\u0BB0\u0BCD \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1?',
        audioPrompt: "\u0B85 \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0B85\u0BA3\u0BBF\u0BB2\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC8\u0BA4\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD",
        items: [
          { id: "opt_anil", text: "\u0B85\u0BA3\u0BBF\u0BB2\u0BCD", visual: "\u{1F43F}\uFE0F", isCorrect: true, feedbackHint: '\u0B85\u0BB0\u0BC1\u0BAE\u0BC8! \u0B85-\u0B85\u0BA3\u0BBF\u0BB2\u0BCD "\u0B85" \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1! \u{1F43F}\uFE0F' },
          { id: "opt_poonai", text: "\u0BAA\u0BC2\u0BA9\u0BC8", visual: "\u{1F431}", isCorrect: false, feedbackHint: '\u0BAA\u0BC2\u0BA9\u0BC8 "\u0BAA\u0BC2" \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1.' },
          { id: "opt_aadu", text: "\u0B86\u0B9F\u0BC1", visual: "\u{1F410}", isCorrect: false, feedbackHint: '\u0B86\u0B9F\u0BC1 \u0BA8\u0BC6\u0B9F\u0BBF\u0BB2\u0BCD "\u0B86" \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1.' }
        ],
        stepByStepHint: "\u0BB5\u0BBE\u0BAF\u0BC8\u0BA4\u0BCD \u0BA4\u0BBF\u0BB1\u0BA8\u0BCD\u0BA4\u0BC1 \u0B92\u0BB2\u0BBF\u0BAF\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: \u0B85... \u0B85\u0BA3\u0BBF\u0BB2\u0BCD!"
      };
    }
    return {
      id: `act_vow_en_${Date.now()}`,
      skillId: "skill_letter_sounds_vowels",
      title: "Vowel Valley: Short /a/ \u{1F34E}",
      instruction: "Find the picture with the short /a/ vowel sound:",
      difficulty: req.difficulty,
      language: req.language || "English",
      type: "word_match",
      prompt: 'Which word has the short /a/ sound like "apple"?',
      audioPrompt: "Find the short a sound",
      items: [
        { id: "opt_apple", text: "Apple", visual: "\u{1F34E}", isCorrect: true, feedbackHint: "Awesome! A-a-apple has the short /a/ sound! \u{1F34E}" },
        { id: "opt_star", text: "Star", visual: "\u2B50", isCorrect: false, feedbackHint: "Star has the /ar/ sound." },
        { id: "opt_tree", text: "Tree", visual: "\u{1F333}", isCorrect: false, feedbackHint: "Tree has the long /e/ sound." }
      ],
      stepByStepHint: "Open your mouth and drop your chin: /a/ /a/ /a/... Apple!"
    };
  }
  if (req.skillId === "skill_phonemic_isolation") {
    if (isHindi) {
      return {
        id: `act_iso_hi_${Date.now()}`,
        skillId: "skill_phonemic_isolation",
        title: "\u092A\u094D\u0930\u0925\u092E \u0927\u094D\u0935\u0928\u093F \u092A\u0939\u091A\u093E\u0928 \u{1F575}\uFE0F",
        instruction: '\u0915\u094C\u0928-\u0938\u093E \u091A\u093F\u0924\u094D\u0930 "\u092B" \u0927\u094D\u0935\u0928\u093F \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0924\u093E \u0939\u0948?',
        difficulty: req.difficulty,
        language: "Hindi",
        type: "word_match",
        prompt: '"\u092B" \u0927\u094D\u0935\u0928\u093F \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0928\u0947 \u0935\u093E\u0932\u093E \u0936\u092C\u094D\u0926:',
        items: [
          { id: "opt_flower", text: "\u092B\u0942\u0932", visual: "\u{1F338}", isCorrect: true, feedbackHint: '\u0936\u093E\u092C\u093E\u0936! \u092B-\u092B\u0942\u0932 "\u092B" \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0924\u093E \u0939\u0948! \u{1F31F}' },
          { id: "opt_cat", text: "\u092C\u093F\u0932\u094D\u0932\u0940", visual: "\u{1F431}", isCorrect: false, feedbackHint: '\u092C\u093F\u0932\u094D\u0932\u0940 "\u092C" \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0924\u0940 \u0939\u0948\u0964' },
          { id: "opt_bear", text: "\u092D\u093E\u0932\u0942", visual: "\u{1F43B}", isCorrect: false, feedbackHint: '\u092D\u093E\u0932\u0942 "\u092D" \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0924\u093E \u0939\u0948\u0964' }
        ],
        stepByStepHint: "\u0939\u094B\u0902\u0920\u094B\u0902 \u0938\u0947 \u092B\u0942\u0902\u0915 \u092E\u093E\u0930\u0924\u0947 \u0939\u0941\u090F \u092C\u094B\u0932\u093F\u090F: \u092B\u093C... \u092B\u0942\u0932!"
      };
    }
    if (isOdia) {
      return {
        id: `act_iso_or_${Date.now()}`,
        skillId: "skill_phonemic_isolation",
        title: "\u0B2A\u0B4D\u0B30\u0B25\u0B2E \u0B27\u0B4D\u0B71\u0B28\u0B3F \u0B1A\u0B3F\u0B39\u0B4D\u0B28\u0B1F \u{1F575}\uFE0F",
        instruction: '\u0B15\u0B47\u0B09\u0B01 \u0B1B\u0B2C\u0B3F\u0B1F\u0B3F "\u0B2B" \u0B27\u0B4D\u0B71\u0B28\u0B3F\u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B47\u0B09\u0B1B\u0B3F?',
        difficulty: req.difficulty,
        language: "Odia",
        type: "word_match",
        prompt: '"\u0B2B" \u0B27\u0B4D\u0B71\u0B28\u0B3F\u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B47\u0B09\u0B25\u0B3F\u0B2C\u0B3E \u0B36\u0B2C\u0B4D\u0B26:',
        items: [
          { id: "opt_flower", text: "\u0B2B\u0B41\u0B32", visual: "\u{1F338}", isCorrect: true, feedbackHint: '\u0B2C\u0B22\u0B3C\u0B3F\u0B06! \u0B2B-\u0B2B\u0B41\u0B32 "\u0B2B" \u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B41\u0B0F! \u{1F31F}' },
          { id: "opt_cat", text: "\u0B2C\u0B3F\u0B32\u0B47\u0B07", visual: "\u{1F431}", isCorrect: false, feedbackHint: '\u0B2C\u0B3F\u0B32\u0B47\u0B07 "\u0B2C" \u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B41\u0B0F\u0964' }
        ],
        stepByStepHint: "\u0B27\u0B40\u0B30\u0B47 \u0B15\u0B41\u0B39\u0B28\u0B4D\u0B24\u0B41: \u0B2B... \u0B2B\u0B41\u0B32!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_iso_pa_${Date.now()}`,
        skillId: "skill_phonemic_isolation",
        title: "\u0A2A\u0A39\u0A3F\u0A32\u0A40 \u0A27\u0A41\u0A28\u0A40 \u0A2A\u0A1B\u0A3E\u0A23 \u{1F575}\uFE0F",
        instruction: '\u0A15\u0A3F\u0A39\u0A5C\u0A40 \u0A24\u0A38\u0A35\u0A40\u0A30 "\u0A2B" \u0A27\u0A41\u0A28\u0A40 \u0A28\u0A3E\u0A32 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A39\u0A41\u0A70\u0A26\u0A40 \u0A39\u0A48?',
        difficulty: req.difficulty,
        language: "Punjabi",
        type: "word_match",
        prompt: '"\u0A2B" \u0A27\u0A41\u0A28\u0A40 \u0A28\u0A3E\u0A32 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A39\u0A4B\u0A23 \u0A35\u0A3E\u0A32\u0A3E \u0A38\u0A3C\u0A2C\u0A26:',
        items: [
          { id: "opt_flower", text: "\u0A2B\u0A41\u0A71\u0A32", visual: "\u{1F338}", isCorrect: true, feedbackHint: '\u0A2C\u0A39\u0A41\u0A24 \u0A35\u0A27\u0A40\u0A06! \u0A2B-\u0A2B\u0A41\u0A71\u0A32 "\u0A2B" \u0A28\u0A3E\u0A32 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A39\u0A41\u0A70\u0A26\u0A3E \u0A39\u0A48! \u{1F31F}' },
          { id: "opt_cat", text: "\u0A2C\u0A3F\u0A71\u0A32\u0A40", visual: "\u{1F431}", isCorrect: false, feedbackHint: '\u0A2C\u0A3F\u0A71\u0A32\u0A40 "\u0A2C" \u0A28\u0A3E\u0A32 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A39\u0A41\u0A70\u0A26\u0A40 \u0A39\u0A48\u0964' }
        ],
        stepByStepHint: "\u0A39\u0A4C\u0A32\u0A40 \u0A2C\u0A4B\u0A32\u0A4B: \u0A2B... \u0A2B\u0A41\u0A71\u0A32!"
      };
    }
    if (isTamil) {
      return {
        id: `act_iso_ta_${Date.now()}`,
        skillId: "skill_phonemic_isolation",
        title: "\u0BAE\u0BC1\u0BA4\u0BB2\u0BCD \u0B92\u0BB2\u0BBF \u0B85\u0BB1\u0BBF\u0BA4\u0BB2\u0BCD \u{1F575}\uFE0F",
        instruction: '\u0B8E\u0BA8\u0BCD\u0BA4\u0BAA\u0BCD \u0BAA\u0B9F\u0BAE\u0BCD "\u0BAA" \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1?',
        difficulty: req.difficulty,
        language: "Tamil",
        type: "word_match",
        prompt: '"\u0BAA" \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0BAE\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD:',
        items: [
          { id: "opt_kite", text: "\u0BAA\u0B9F\u0BCD\u0B9F\u0BAE\u0BCD", visual: "\u{1FA81}", isCorrect: true, feedbackHint: '\u0B85\u0BB1\u0BCD\u0BAA\u0BC1\u0BA4\u0BAE\u0BCD! \u0BAA-\u0BAA\u0B9F\u0BCD\u0B9F\u0BAE\u0BCD "\u0BAA" \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1! \u{1F31F}' },
          { id: "opt_cat", text: "\u0BAA\u0BC2\u0BA9\u0BC8", visual: "\u{1F431}", isCorrect: false, feedbackHint: '\u0B87\u0BA4\u0BC1 "\u0BAA\u0BC2" \u0B92\u0BB2\u0BBF. \u0B95\u0BC1\u0BB1\u0BBF\u0BB2\u0BCD "\u0BAA" \u0B90\u0BA4\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.' }
        ],
        stepByStepHint: "\u0B89\u0BA4\u0B9F\u0BC1\u0B95\u0BB3\u0BC8 \u0B92\u0B9F\u0BCD\u0B9F\u0BB5\u0BC8\u0BA4\u0BCD\u0BA4\u0BC1\u0B9A\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: \u0BAA... \u0BAA\u0B9F\u0BCD\u0B9F\u0BAE\u0BCD!"
      };
    }
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
        { id: "opt_bear", text: "Bear", visual: "\u{1F43B}", isCorrect: false, feedbackHint: "Bear starts with /b/." }
      ],
      stepByStepHint: "Put your teeth on your lower lip and blow gently: /f/ /f/ /f/... fish!"
    };
  }
  if (req.skillId === "skill_phonemic_rhyme" || req.skillId === "skill_rhyming_patterns") {
    if (isHindi) {
      return {
        id: `act_rhyme_hi_${Date.now()}`,
        skillId: "skill_phonemic_rhyme",
        title: "\u0924\u0941\u0915\u092C\u0902\u0926\u0940 \u092E\u093F\u0932\u093E\u0928 \u{1F3F0}",
        instruction: '"\u091C\u0932" \u0915\u0947 \u0938\u093E\u0925 \u0915\u094C\u0928-\u0938\u093E \u0936\u092C\u094D\u0926 \u0924\u0941\u0915 \u092E\u093F\u0932\u093E\u0924\u093E \u0939\u0948?',
        difficulty: req.difficulty,
        language: "Hindi",
        type: "word_match",
        prompt: '"\u091C\u0932" (\u092A\u093E\u0928\u0940) \u0938\u0947 \u092E\u093F\u0932\u0924\u093E-\u091C\u0941\u0932\u0924\u093E \u0936\u092C\u094D\u0926 \u{1F4A7}:',
        items: [
          { id: "opt_phal", text: "\u092B\u0932", visual: "\u{1F34E}", isCorrect: true, feedbackHint: "\u0936\u093E\u092C\u093E\u0936! \u091C\u0932 \u0914\u0930 \u092B\u0932 \u090F\u0915 \u091C\u0948\u0938\u0940 \u0927\u094D\u0935\u0928\u093F \u092A\u0930 \u0916\u0924\u094D\u092E \u0939\u094B\u0924\u0947 \u0939\u0948\u0902! \u{1F34E}" },
          { id: "opt_ghar", text: "\u0918\u0930", visual: "\u{1F3E0}", isCorrect: false, feedbackHint: '\u0918\u0930 "\u0930" \u092A\u0930 \u0916\u0924\u094D\u092E \u0939\u094B\u0924\u093E \u0939\u0948, "\u0932" \u092A\u0930 \u0928\u0939\u0940\u0902\u0964' }
        ],
        stepByStepHint: "\u0905\u0902\u0924\u093F\u092E \u0927\u094D\u0935\u0928\u093F \u0938\u0941\u0928\u093F\u090F: \u091C-\u0932... \u092B-\u0932!"
      };
    }
    if (isOdia) {
      return {
        id: `act_rhyme_or_${Date.now()}`,
        skillId: "skill_phonemic_rhyme",
        title: "\u0B1B\u0B28\u0B4D\u0B26 \u0B36\u0B2C\u0B4D\u0B26 \u0B2E\u0B47\u0B33 \u{1F3F0}",
        instruction: '"\u0B1C\u0B33" \u0B38\u0B39\u0B3F\u0B24 \u0B15\u0B47\u0B09\u0B01 \u0B36\u0B2C\u0B4D\u0B26\u0B30 \u0B1B\u0B28\u0B4D\u0B26 \u0B2E\u0B3F\u0B33\u0B41\u0B1B\u0B3F?',
        difficulty: req.difficulty,
        language: "Odia",
        type: "word_match",
        prompt: '"\u0B1C\u0B33" \u0B38\u0B39\u0B3F\u0B24 \u0B1B\u0B28\u0B4D\u0B26\u0B2F\u0B41\u0B15\u0B4D\u0B24 \u0B36\u0B2C\u0B4D\u0B26 \u{1F4A7}:',
        items: [
          { id: "opt_phal", text: "\u0B2B\u0B33", visual: "\u{1F34E}", isCorrect: true, feedbackHint: "\u0B1A\u0B2E\u0B24\u0B4D\u0B15\u0B3E\u0B30! \u0B1C\u0B33 \u0B0F\u0B2C\u0B02 \u0B2B\u0B33 \u0B38\u0B2E\u0B3E\u0B28 \u0B36\u0B47\u0B37 \u0B27\u0B4D\u0B71\u0B28\u0B3F \u0B2C\u0B3F\u0B36\u0B3F\u0B37\u0B4D\u0B1F! \u{1F34E}" },
          { id: "opt_ghar", text: "\u0B18\u0B30", visual: "\u{1F3E0}", isCorrect: false, feedbackHint: '\u0B18\u0B30 \u0B36\u0B47\u0B37\u0B30\u0B47 "\u0B30" \u0B05\u0B1B\u0B3F\u0964' }
        ],
        stepByStepHint: "\u0B36\u0B47\u0B37 \u0B27\u0B4D\u0B71\u0B28\u0B3F \u0B36\u0B41\u0B23\u0B28\u0B4D\u0B24\u0B41: \u0B1C-\u0B33... \u0B2B-\u0B33!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_rhyme_pa_${Date.now()}`,
        skillId: "skill_phonemic_rhyme",
        title: "\u0A24\u0A41\u0A15\u0A2C\u0A70\u0A26\u0A40 \u0A2E\u0A47\u0A32 \u{1F3F0}",
        instruction: '"\u0A1C\u0A32" \u0A28\u0A3E\u0A32 \u0A15\u0A3F\u0A39\u0A5C\u0A3E \u0A38\u0A3C\u0A2C\u0A26 \u0A24\u0A41\u0A15 \u0A2E\u0A3F\u0A32\u0A3E\u0A09\u0A02\u0A26\u0A3E \u0A39\u0A48?',
        difficulty: req.difficulty,
        language: "Punjabi",
        type: "word_match",
        prompt: '"\u0A1C\u0A32" \u0A28\u0A3E\u0A32 \u0A30\u0A32\u0A26\u0A3E-\u0A2E\u0A3F\u0A32\u0A26\u0A3E \u0A38\u0A3C\u0A2C\u0A26 \u{1F4A7}:',
        items: [
          { id: "opt_phal", text: "\u0A2B\u0A32", visual: "\u{1F34E}", isCorrect: true, feedbackHint: "\u0A2C\u0A71\u0A32\u0A47! \u0A1C\u0A32 \u0A05\u0A24\u0A47 \u0A2B\u0A32 \u0A26\u0A40 \u0A24\u0A41\u0A15 \u0A2E\u0A3F\u0A32\u0A26\u0A40 \u0A39\u0A48! \u{1F34E}" },
          { id: "opt_ghar", text: "\u0A18\u0A30", visual: "\u{1F3E0}", isCorrect: false, feedbackHint: '\u0A18\u0A30 \u0A26\u0A47 \u0A05\u0A70\u0A24 \u0A35\u0A3F\u0A71\u0A1A "\u0A30" \u0A39\u0A48\u0964' }
        ],
        stepByStepHint: "\u0A06\u0A16\u0A30\u0A40 \u0A06\u0A35\u0A3E\u0A1C\u0A3C \u0A38\u0A41\u0A23\u0A4B: \u0A1C-\u0A32... \u0A2B-\u0A32!"
      };
    }
    if (isTamil) {
      return {
        id: `act_rhyme_ta_${Date.now()}`,
        skillId: "skill_phonemic_rhyme",
        title: "\u0B8E\u0BA4\u0BC1\u0B95\u0BC8 \u0BAE\u0BCB\u0BA9\u0BC8 \u0B9A\u0BCA\u0BB2\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BAE\u0BCD \u{1F3F0}",
        instruction: '"\u0B95\u0BBE\u0B9F\u0BC1" \u0B8E\u0BA9\u0BCD\u0BB1 \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BCB\u0B9F\u0BC1 \u0B8E\u0BA4\u0BC1\u0B95\u0BC8 \u0BAA\u0BCA\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1\u0BAE\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD \u0B8E\u0BA4\u0BC1?',
        difficulty: req.difficulty,
        language: "Tamil",
        type: "word_match",
        prompt: '"\u0B95\u0BBE\u0B9F\u0BC1" \u0B89\u0B9F\u0BA9\u0BCD \u0B92\u0BA4\u0BCD\u0BA4 \u0B93\u0B9A\u0BC8\u0BAF\u0BC1\u0B9F\u0BC8\u0BAF \u0B9A\u0BCA\u0BB2\u0BCD \u{1F332}:',
        items: [
          { id: "opt_koodu", text: "\u0B95\u0BC2\u0B9F\u0BC1", visual: "\u{1FAB9}", isCorrect: true, feedbackHint: "\u0B85\u0BB1\u0BCD\u0BAA\u0BC1\u0BA4\u0BAE\u0BCD! \u0B95\u0BBE\u0B9F\u0BC1 \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0B95\u0BC2\u0B9F\u0BC1 \u0B92\u0BB0\u0BC7 \u0B93\u0B9A\u0BC8\u0BAF\u0BBF\u0BB2\u0BCD \u0BAE\u0BC1\u0B9F\u0BBF\u0B95\u0BBF\u0BA9\u0BCD\u0BB1\u0BA9! \u{1FAB9}" },
          { id: "opt_veedu", text: "\u0BB5\u0BC0\u0B9F\u0BC1", visual: "\u{1F3E0}", isCorrect: false, feedbackHint: "\u0B95\u0BBE\u0B9F\u0BC1 - \u0B95\u0BC2\u0B9F\u0BC1 \u0B93\u0B9A\u0BC8\u0BAF\u0BC8 \u0B92\u0BAA\u0BCD\u0BAA\u0BBF\u0B9F\u0BCD\u0B9F\u0BC1\u0BAA\u0BCD \u0BAA\u0BBE\u0BB0\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD." }
        ],
        stepByStepHint: "\u0B87\u0BB1\u0BC1\u0BA4\u0BBF \u0B93\u0B9A\u0BC8\u0BAF\u0BC8\u0B95\u0BCD \u0B95\u0BB5\u0BA9\u0BBF\u0BAF\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: \u0B95\u0BBE-\u0B9F\u0BC1... \u0B95\u0BC2-\u0B9F\u0BC1!"
      };
    }
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
        { id: "opt_dog", text: "Dog", visual: "\u{1F436}", isCorrect: false, feedbackHint: "Dog ends in -og." }
      ],
      stepByStepHint: "Say the ending sound: -at! Now listen: h... at! Hat!"
    };
  }
  if (req.skillId === "skill_syllable_segmentation" || req.skillId === "skill_syllable_clapping") {
    if (isHindi) {
      return {
        id: `act_syl_hi_${Date.now()}`,
        skillId: "skill_syllable_segmentation",
        title: "\u0936\u092C\u094D\u0926 \u0924\u093E\u0932: \u0924\u093E\u0932\u0940 \u092C\u091C\u093E\u0913 \u{1F941}",
        instruction: '"\u092A\u093E-\u0928\u0940" \u092C\u094B\u0932\u0924\u0947 \u0938\u092E\u092F \u0915\u093F\u0924\u0928\u0940 \u092C\u093E\u0930 \u0924\u093E\u0932\u0940 \u092C\u091C\u0947\u0917\u0940?',
        difficulty: req.difficulty,
        language: "Hindi",
        type: "word_match",
        prompt: '"\u092A\u093E - \u0928\u0940" \u092E\u0947\u0902 \u0915\u093F\u0924\u0928\u0940 \u0924\u093E\u0932 \u{1F4A7}?',
        items: [
          { id: "opt_2", text: "2 \u0924\u093E\u0932", visual: "\u270C\uFE0F", isCorrect: true, feedbackHint: "\u0936\u093E\u092C\u093E\u0936! \u092A\u093E (\u0924\u093E\u0932\u0940!) \u0928\u0940 (\u0924\u093E\u0932\u0940!) -> 2 \u0924\u093E\u0932! \u{1F4A7}" },
          { id: "opt_1", text: "1 \u0924\u093E\u0932", visual: "\u261D\uFE0F", isCorrect: false, feedbackHint: "\u092A\u093E... \u0928\u0940, \u0926\u094B \u091F\u0941\u0915\u0921\u093C\u0947 \u0939\u0948\u0902\u0964" }
        ],
        stepByStepHint: "\u092C\u094B\u0932\u0924\u0947 \u0939\u0941\u090F \u0924\u093E\u0932\u0940 \u092C\u091C\u093E\u0907\u090F: \u092A\u093E-\u0928\u0940!"
      };
    }
    if (isOdia) {
      return {
        id: `act_syl_or_${Date.now()}`,
        skillId: "skill_syllable_segmentation",
        title: "\u0B36\u0B2C\u0B4D\u0B26 \u0B24\u0B3E\u0B33: \u0B24\u0B3E\u0B33\u0B3F \u0B2C\u0B1C\u0B3E\u0B28\u0B4D\u0B24\u0B41 \u{1F941}",
        instruction: '"\u0B2A\u0B3E-\u0B23\u0B3F" \u0B15\u0B39\u0B3F\u0B2C\u0B3E \u0B2C\u0B47\u0B33\u0B47 \u0B15\u0B47\u0B24\u0B4B\u0B1F\u0B3F \u0B24\u0B3E\u0B33\u0B3F \u0B2C\u0B3E\u0B1C\u0B3F\u0B2C?',
        difficulty: req.difficulty,
        language: "Odia",
        type: "word_match",
        prompt: '"\u0B2A\u0B3E - \u0B23\u0B3F" \u0B30\u0B47 \u0B15\u0B47\u0B24\u0B4B\u0B1F\u0B3F \u0B24\u0B3E\u0B33\u0B3F \u{1F4A7}?',
        items: [
          { id: "opt_2", text: "\u0B68 \u0B1F\u0B3F \u0B24\u0B3E\u0B33\u0B3F", visual: "\u270C\uFE0F", isCorrect: true, feedbackHint: "\u0B2C\u0B3E\u0B03! \u0B2A\u0B3E (\u0B24\u0B3E\u0B33\u0B3F!) \u0B23\u0B3F (\u0B24\u0B3E\u0B33\u0B3F!) -> \u0B68 \u0B1F\u0B3F \u0B24\u0B3E\u0B33\u0B3F! \u{1F4A7}" },
          { id: "opt_1", text: "\u0B67 \u0B1F\u0B3F \u0B24\u0B3E\u0B33\u0B3F", visual: "\u261D\uFE0F", isCorrect: false, feedbackHint: "\u0B2A\u0B3E-\u0B23\u0B3F \u0B26\u0B41\u0B07\u0B1F\u0B3F \u0B2D\u0B3E\u0B17\u0964" }
        ],
        stepByStepHint: "\u0B27\u0B40\u0B30\u0B47 \u0B15\u0B39\u0B3F \u0B24\u0B3E\u0B33\u0B3F \u0B2C\u0B1C\u0B3E\u0B28\u0B4D\u0B24\u0B41: \u0B2A\u0B3E... \u0B23\u0B3F!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_syl_pa_${Date.now()}`,
        skillId: "skill_syllable_segmentation",
        title: "\u0A38\u0A3C\u0A2C\u0A26 \u0A24\u0A3E\u0A32: \u0A24\u0A3E\u0A5C\u0A40 \u0A2E\u0A3E\u0A30\u0A4B \u{1F941}",
        instruction: '"\u0A2A\u0A3E-\u0A23\u0A40" \u0A2C\u0A4B\u0A32\u0A23 \u0A38\u0A2E\u0A47\u0A02 \u0A15\u0A3F\u0A70\u0A28\u0A40\u0A06\u0A02 \u0A24\u0A3E\u0A5C\u0A40\u0A06\u0A02 \u0A35\u0A71\u0A1C\u0A23\u0A17\u0A40\u0A06\u0A02?',
        difficulty: req.difficulty,
        language: "Punjabi",
        type: "word_match",
        prompt: '"\u0A2A\u0A3E - \u0A23\u0A40" \u0A35\u0A3F\u0A71\u0A1A \u0A15\u0A3F\u0A70\u0A28\u0A40\u0A06\u0A02 \u0A24\u0A3E\u0A5C\u0A40\u0A06\u0A02 \u{1F4A7}?',
        items: [
          { id: "opt_2", text: "2 \u0A24\u0A3E\u0A5C\u0A40\u0A06\u0A02", visual: "\u270C\uFE0F", isCorrect: true, feedbackHint: "\u0A38\u0A3C\u0A3E\u0A2C\u0A3E\u0A38\u0A3C! \u0A2A\u0A3E-\u0A23\u0A40 \u0A35\u0A3F\u0A71\u0A1A 2 \u0A24\u0A3E\u0A5C\u0A40\u0A06\u0A02 \u0A39\u0A28! \u{1F4A7}" },
          { id: "opt_1", text: "1 \u0A24\u0A3E\u0A5C\u0A40", visual: "\u261D\uFE0F", isCorrect: false, feedbackHint: "\u0A26\u0A4B \u0A35\u0A3E\u0A30 \u0A2C\u0A4B\u0A32 \u0A15\u0A47 \u0A26\u0A47\u0A16\u0A4B: \u0A2A\u0A3E... \u0A23\u0A40\u0964" }
        ],
        stepByStepHint: "\u0A24\u0A3E\u0A5C\u0A40 \u0A2E\u0A3E\u0A30 \u0A15\u0A47 \u0A2C\u0A4B\u0A32\u0A4B: \u0A2A\u0A3E-\u0A23\u0A40!"
      };
    }
    if (isTamil) {
      return {
        id: `act_syl_ta_${Date.now()}`,
        skillId: "skill_syllable_segmentation",
        title: "\u0B9A\u0BCA\u0BB2\u0BCD \u0B85\u0B9A\u0BC8 \u0BAA\u0BBF\u0BB0\u0BBF\u0BA4\u0BCD\u0BA4\u0BB2\u0BCD \u{1F941}",
        instruction: '"\u0BA4\u0BA3\u0BCD-\u0BA3\u0BC0\u0BB0\u0BCD" \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BBF\u0BB2\u0BCD \u0B8E\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0B85\u0B9A\u0BC8\u0B95\u0BB3\u0BCD \u0B89\u0BB3\u0BCD\u0BB3\u0BA9?',
        difficulty: req.difficulty,
        language: "Tamil",
        type: "word_match",
        prompt: '"\u0BA4\u0BA3\u0BCD - \u0BA3\u0BC0\u0BB0\u0BCD" \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BBF\u0BB2\u0BCD \u0B8E\u0BA4\u0BCD\u0BA4\u0BA9\u0BC8 \u0BA4\u0BC1\u0B9F\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD \u{1F4A7}?',
        items: [
          { id: "opt_2", text: "2 \u0BA4\u0BC1\u0B9F\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD", visual: "\u270C\uFE0F", isCorrect: true, feedbackHint: "\u0B85\u0BB0\u0BC1\u0BAE\u0BC8! \u0BA4\u0BA3\u0BCD-\u0BA3\u0BC0\u0BB0\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BBF\u0BB2\u0BCD 2 \u0BA4\u0BC1\u0B9F\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD \u0B89\u0BB3\u0BCD\u0BB3\u0BA9! \u{1F4A7}" },
          { id: "opt_1", text: "1 \u0BA4\u0BC1\u0B9F\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1", visual: "\u261D\uFE0F", isCorrect: false, feedbackHint: "\u0BA4\u0BA3\u0BCD-\u0BA3\u0BC0\u0BB0\u0BCD \u0B87\u0BB0\u0BA3\u0BCD\u0B9F\u0BC1 \u0BAA\u0BBE\u0B95\u0B99\u0BCD\u0B95\u0BB3\u0BBE\u0B95 \u0B92\u0BB2\u0BBF\u0B95\u0BCD\u0B95\u0BBF\u0BB1\u0BA4\u0BC1." }
        ],
        stepByStepHint: "\u0B95\u0BC8\u0BA4\u0B9F\u0BCD\u0B9F\u0BBF\u0B9A\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: \u0BA4\u0BA3\u0BCD... \u0BA3\u0BC0\u0BB0\u0BCD!"
      };
    }
    return {
      id: `act_syllables_${Date.now()}`,
      skillId: "skill_syllable_segmentation",
      title: "Syllable Drummer: Beat the Word \u{1F941}",
      instruction: 'Clap out the beats in "wa-ter". How many syllables do you hear?',
      difficulty: req.difficulty,
      language: "English",
      type: "word_match",
      prompt: 'How many claps in "wa - ter" \u{1F4A7}?',
      items: [
        { id: "opt_2", text: "2 claps", visual: "\u270C\uFE0F", isCorrect: true, feedbackHint: "Clap! Clap! Yes, wa-ter has 2 beats! \u{1F4A7}" },
        { id: "opt_1", text: "1 clap", visual: "\u261D\uFE0F", isCorrect: false, feedbackHint: "Try clapping while you say it: wa-ter." }
      ],
      stepByStepHint: 'Put your hand under your chin. Say "wa-ter". Your chin drops twice: 2 syllables!'
    };
  }
  if (req.skillId === "skill_missing_letter") {
    if (isHindi) {
      return {
        id: `act_mis_hi_${Date.now()}`,
        skillId: "skill_missing_letter",
        title: "\u0932\u093E\u092A\u0924\u093E \u0905\u0915\u094D\u0937\u0930 \u0916\u094B\u091C\u0947\u0902 \u{1F50D}",
        instruction: "\u0936\u092C\u094D\u0926 \u092A\u0942\u0930\u093E \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0938\u0939\u0940 \u0905\u0915\u094D\u0937\u0930 \u091A\u0941\u0928\u0947\u0902: \u0915 _ \u0932 (\u092B\u0942\u0932 \u{1FAB7}):",
        difficulty: req.difficulty,
        language: "Hindi",
        type: "letter_distinction",
        prompt: "\u0915 [ ? ] \u0932 \u{1FAB7}",
        items: [
          { id: "opt_ma", text: "\u092E", visual: "\u{1F338}", isCorrect: true, feedbackHint: "\u0936\u093E\u092C\u093E\u0936! \u0915-\u092E-\u0932 \u0938\u0947 \u092C\u0928\u093E \u0915\u092E\u0932! \u{1FAB7}" },
          { id: "opt_ra", text: "\u0930", visual: "\u274C", isCorrect: false, feedbackHint: "\u0915-\u0930-\u0932 \u0928\u0939\u0940\u0902 \u0939\u094B\u0924\u093E\u0964 \u092E \u091A\u0941\u0928\u093F\u090F\u0964" }
        ],
        stepByStepHint: "\u092C\u0940\u091A \u0915\u093E \u0905\u0915\u094D\u0937\u0930 \u092A\u0939\u091A\u093E\u0928\u093F\u090F: \u0915... \u092E... \u0932!"
      };
    }
    if (isOdia) {
      return {
        id: `act_mis_or_${Date.now()}`,
        skillId: "skill_missing_letter",
        title: "\u0B39\u0B1C\u0B3F\u0B2F\u0B3E\u0B07\u0B25\u0B3F\u0B2C\u0B3E \u0B05\u0B15\u0B4D\u0B37\u0B30 \u0B16\u0B4B\u0B1C\u0B28\u0B4D\u0B24\u0B41 \u{1F50D}",
        instruction: "\u0B36\u0B2C\u0B4D\u0B26 \u0B2A\u0B42\u0B30\u0B23 \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41: \u0B15 _ \u0B33 (\u0B2A\u0B26\u0B4D\u0B2E \u0B2B\u0B41\u0B32 \u{1FAB7}):",
        difficulty: req.difficulty,
        language: "Odia",
        type: "letter_distinction",
        prompt: "\u0B15 [ ? ] \u0B33 \u{1FAB7}",
        items: [
          { id: "opt_ma", text: "\u0B2E", visual: "\u{1F338}", isCorrect: true, feedbackHint: "\u0B05\u0B24\u0B3F \u0B38\u0B41\u0B28\u0B4D\u0B26\u0B30! \u0B15-\u0B2E-\u0B33 \u0B39\u0B47\u0B32\u0B3E \u0B15\u0B2E\u0B33! \u{1FAB7}" },
          { id: "opt_ra", text: "\u0B30", visual: "\u274C", isCorrect: false, feedbackHint: "\u0B15-\u0B2E-\u0B33 \u0B2C\u0B3E\u0B1B\u0B28\u0B4D\u0B24\u0B41\u0964" }
        ],
        stepByStepHint: "\u0B2E\u0B1D\u0B3F \u0B05\u0B15\u0B4D\u0B37\u0B30\u0B1F\u0B3F \u0B15\u0B41\u0B39\u0B28\u0B4D\u0B24\u0B41: \u0B15... \u0B2E... \u0B33!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_mis_pa_${Date.now()}`,
        skillId: "skill_missing_letter",
        title: "\u0A17\u0A41\u0A06\u0A1A\u0A3F\u0A06 \u0A05\u0A71\u0A16\u0A30 \u0A32\u0A71\u0A2D\u0A4B \u{1F50D}",
        instruction: "\u0A38\u0A3C\u0A2C\u0A26 \u0A2A\u0A42\u0A30\u0A3E \u0A15\u0A30\u0A4B: \u0A15 _ \u0A32 (\u0A2B\u0A41\u0A71\u0A32 \u{1FAB7}):",
        difficulty: req.difficulty,
        language: "Punjabi",
        type: "letter_distinction",
        prompt: "\u0A15 [ ? ] \u0A32 \u{1FAB7}",
        items: [
          { id: "opt_ma", text: "\u0A2E", visual: "\u{1F338}", isCorrect: true, feedbackHint: "\u0A2C\u0A39\u0A41\u0A24 \u0A35\u0A27\u0A40\u0A06! \u0A15-\u0A2E-\u0A32 \u0A2C\u0A23\u0A3F\u0A06 \u0A15\u0A2E\u0A32! \u{1FAB7}" },
          { id: "opt_ra", text: "\u0A30", visual: "\u274C", isCorrect: false, feedbackHint: "\u0A15-\u0A2E-\u0A32 \u0A1A\u0A41\u0A23\u0A4B\u0964" }
        ],
        stepByStepHint: "\u0A35\u0A3F\u0A1A\u0A15\u0A3E\u0A30\u0A32\u0A3E \u0A05\u0A71\u0A16\u0A30 \u0A32\u0A71\u0A2D\u0A4B: \u0A2E!"
      };
    }
    if (isTamil) {
      return {
        id: `act_mis_ta_${Date.now()}`,
        skillId: "skill_missing_letter",
        title: "\u0BB5\u0BBF\u0B9F\u0BC1\u0BAA\u0B9F\u0BCD\u0B9F \u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1 \u0B85\u0BB1\u0BBF\u0BA4\u0BB2\u0BCD \u{1F50D}",
        instruction: "\u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC8 \u0BA8\u0BBF\u0BB1\u0BC8\u0BB5\u0BC1 \u0B9A\u0BC6\u0BAF\u0BCD\u0B95: \u0BAA _ \u0BAE\u0BCD (\u0B9A\u0BC1\u0BB5\u0BC8\u0BAF\u0BBE\u0BA9 \u0BAA\u0BB4\u0BAE\u0BCD \u{1F34E}):",
        difficulty: req.difficulty,
        language: "Tamil",
        type: "letter_distinction",
        prompt: "\u0BAA [ ? ] \u0BAE\u0BCD \u{1F34E}",
        items: [
          { id: "opt_zha", text: "\u0BB4", visual: "\u{1F34E}", isCorrect: true, feedbackHint: "\u0B85\u0BB1\u0BCD\u0BAA\u0BC1\u0BA4\u0BAE\u0BCD! \u0BAA-\u0BB4-\u0BAE\u0BCD \u0BAA\u0BB4\u0BAE\u0BCD \u0B86\u0BA9\u0BA4\u0BC1! \u{1F34E}" },
          { id: "opt_la", text: "\u0BB2", visual: "\u274C", isCorrect: false, feedbackHint: '\u0B9A\u0BBF\u0BB1\u0BAA\u0BCD\u0BAA\u0BC1 \u0BB4\u0B95\u0BB0\u0BAE\u0BCD "\u0BB4" \u0BB5\u0BC8\u0BA4\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.' }
        ],
        stepByStepHint: "\u0BA8\u0BBE\u0BB5\u0BC8 \u0BAE\u0B9F\u0B95\u0BCD\u0B95\u0BBF \u0B89\u0B9A\u0BCD\u0B9A\u0BB0\u0BBF\u0BAF\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: \u0BB4... \u0BAA\u0BB4\u0BAE\u0BCD!"
      };
    }
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
        { id: "opt_o", text: "o", visual: "\u{1F34A}", isCorrect: false, feedbackHint: "c-o-t spells cot." }
      ],
      stepByStepHint: 'Listen to the middle sound: /k/ ... /\xE6/ ... /t/. The apple letter is "a"!'
    };
  }
  if (req.skillId === "skill_word_building") {
    if (isHindi) {
      return {
        id: `act_wb_hi_${Date.now()}`,
        skillId: "skill_word_building",
        title: "\u0936\u092C\u094D\u0926 \u0928\u093F\u0930\u094D\u092E\u093E\u0923 \u{1F9F1}",
        instruction: "\u0927\u094D\u0935\u0928\u093F\u092F\u094B\u0902 \u0915\u094B \u091C\u094B\u0921\u093C\u0915\u0930 \u0936\u092C\u094D\u0926 \u092C\u0928\u093E\u090F\u0902: \u0915 + \u0932 + \u092E",
        difficulty: req.difficulty,
        language: "Hindi",
        type: "word_match",
        prompt: "\u0932\u093F\u0916\u0928\u0947 \u0935\u093E\u0932\u0940 \u0935\u0938\u094D\u0924\u0941 \u0915\u093E \u0928\u093E\u092E \u270D\uFE0F:",
        items: [
          { id: "opt_kalam", text: "\u0915\u0932\u092E", visual: "\u270D\uFE0F", isCorrect: true, feedbackHint: "\u0935\u093E\u0939! \u0915-\u0932-\u092E \u0938\u0947 \u092C\u0928\u093E \u0915\u0932\u092E! \u{1F31F}" },
          { id: "opt_kamal", text: "\u0915\u092E\u0932", visual: "\u{1FAB7}", isCorrect: false, feedbackHint: "\u092F\u0939 \u0915\u092E\u0932 \u0939\u0948\u0964 \u0932\u093F\u0916\u0928\u0947 \u0935\u093E\u0932\u0940 \u0915\u0932\u092E \u091A\u0941\u0928\u0947\u0902\u0964" }
        ],
        stepByStepHint: "\u0915, \u0932, \u092E \u0915\u094B \u0915\u094D\u0930\u092E \u0938\u0947 \u092C\u094B\u0932\u093F\u090F: \u0915\u0932\u092E!"
      };
    }
    if (isOdia) {
      return {
        id: `act_wb_or_${Date.now()}`,
        skillId: "skill_word_building",
        title: "\u0B36\u0B2C\u0B4D\u0B26 \u0B17\u0B20\u0B28 \u{1F9F1}",
        instruction: "\u0B05\u0B15\u0B4D\u0B37\u0B30 \u0B2F\u0B4B\u0B21\u0B3C\u0B3F \u0B36\u0B2C\u0B4D\u0B26 \u0B24\u0B3F\u0B06\u0B30\u0B3F \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41: \u0B15 + \u0B33 + \u0B2E",
        difficulty: req.difficulty,
        language: "Odia",
        type: "word_match",
        prompt: "\u0B32\u0B47\u0B16\u0B3F\u0B2C\u0B3E \u0B1C\u0B3F\u0B28\u0B3F\u0B37 \u270D\uFE0F:",
        items: [
          { id: "opt_kalam", text: "\u0B15\u0B32\u0B2E", visual: "\u270D\uFE0F", isCorrect: true, feedbackHint: "\u0B2C\u0B22\u0B3C\u0B3F\u0B06! \u0B15-\u0B32-\u0B2E \u0B2E\u0B3F\u0B36\u0B3F \u0B15\u0B32\u0B2E \u0B39\u0B47\u0B32\u0B3E! \u{1F31F}" },
          { id: "opt_kamal", text: "\u0B15\u0B2E\u0B33", visual: "\u{1FAB7}", isCorrect: false, feedbackHint: "\u0B0F\u0B39\u0B3E \u0B15\u0B2E\u0B33\u0964" }
        ],
        stepByStepHint: "\u0B05\u0B15\u0B4D\u0B37\u0B30\u0B17\u0B41\u0B21\u0B3C\u0B3F\u0B15\u0B41 \u0B2E\u0B3F\u0B33\u0B3E\u0B07 \u0B15\u0B41\u0B39\u0B28\u0B4D\u0B24\u0B41: \u0B15\u0B32\u0B2E!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_wb_pa_${Date.now()}`,
        skillId: "skill_word_building",
        title: "\u0A38\u0A3C\u0A2C\u0A26 \u0A09\u0A38\u0A3E\u0A30\u0A40 \u{1F9F1}",
        instruction: "\u0A05\u0A71\u0A16\u0A30 \u0A1C\u0A4B\u0A5C \u0A15\u0A47 \u0A38\u0A3C\u0A2C\u0A26 \u0A2C\u0A23\u0A3E\u0A13: \u0A15 + \u0A32 + \u0A2E",
        difficulty: req.difficulty,
        language: "Punjabi",
        type: "word_match",
        prompt: "\u0A32\u0A3F\u0A16\u0A23 \u0A35\u0A3E\u0A32\u0A40 \u0A15\u0A32\u0A2E \u270D\uFE0F:",
        items: [
          { id: "opt_kalam", text: "\u0A15\u0A32\u0A2E", visual: "\u270D\uFE0F", isCorrect: true, feedbackHint: "\u0A38\u0A3C\u0A3E\u0A2C\u0A3E\u0A38\u0A3C! \u0A15-\u0A32-\u0A2E \u0A24\u0A4B\u0A02 \u0A2C\u0A23\u0A40 \u0A15\u0A32\u0A2E! \u{1F31F}" },
          { id: "opt_kamal", text: "\u0A15\u0A2E\u0A32", visual: "\u{1FAB7}", isCorrect: false, feedbackHint: "\u0A07\u0A39 \u0A15\u0A2E\u0A32 \u0A39\u0A48\u0964" }
        ],
        stepByStepHint: "\u0A15\u0A4D\u0A30\u0A2E \u0A35\u0A3F\u0A71\u0A1A \u0A2C\u0A4B\u0A32\u0A4B: \u0A15\u0A32\u0A2E!"
      };
    }
    if (isTamil) {
      return {
        id: `act_wb_ta_${Date.now()}`,
        skillId: "skill_word_building",
        title: "\u0B9A\u0BCA\u0BB2\u0BCD \u0B86\u0B95\u0BCD\u0B95\u0BAE\u0BCD \u{1F9F1}",
        instruction: "\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BB3\u0BC8 \u0B87\u0BA3\u0BC8\u0BA4\u0BCD\u0BA4\u0BC1\u0B9A\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD \u0B89\u0BB0\u0BC1\u0BB5\u0BBE\u0B95\u0BCD\u0B95\u0BC1\u0B95: \u0BAE + \u0BB2 + \u0BB0\u0BCD",
        difficulty: req.difficulty,
        language: "Tamil",
        type: "word_match",
        prompt: "\u0B85\u0BB4\u0B95\u0BBE\u0BA9 \u0BAA\u0BC2\u0BB5\u0BC8\u0B95\u0BCD \u0B95\u0BC1\u0BB1\u0BBF\u0B95\u0BCD\u0B95\u0BC1\u0BAE\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD \u{1F338}:",
        items: [
          { id: "opt_malar", text: "\u0BAE\u0BB2\u0BB0\u0BCD", visual: "\u{1F338}", isCorrect: true, feedbackHint: "\u0B85\u0BB0\u0BC1\u0BAE\u0BC8! \u0BAE-\u0BB2-\u0BB0\u0BCD \u0B9A\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BBE\u0BB2\u0BCD \u0BAE\u0BB2\u0BB0\u0BCD! \u{1F31F}" },
          { id: "opt_maram", text: "\u0BAE\u0BB0\u0BAE\u0BCD", visual: "\u{1F333}", isCorrect: false, feedbackHint: "\u0B87\u0BA4\u0BC1 \u0BAE\u0BB0\u0BAE\u0BCD. \u0BAE\u0BB2\u0BB0\u0BC8\u0BA4\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD." }
        ],
        stepByStepHint: "\u0B92\u0BA9\u0BCD\u0BB1\u0BBE\u0B95\u0B9A\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: \u0BAE-\u0BB2-\u0BB0\u0BCD -> \u0BAE\u0BB2\u0BB0\u0BCD!"
      };
    }
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
        { id: "opt_bird", text: "bird", visual: "\u{1F426}", isCorrect: true, feedbackHint: "You built the word BIRD! \u{1F426}" },
        { id: "opt_drib", text: "drib", visual: "\u2753", isCorrect: false, feedbackHint: "Start with /b/ sound." }
      ],
      stepByStepHint: "First sound is /b/, then -ird: bird!"
    };
  }
  if (req.skillId === "skill_sight_words_high_freq") {
    if (isHindi) {
      return {
        id: `act_sw_hi_${Date.now()}`,
        skillId: "skill_sight_words_high_freq",
        title: "\u0938\u093E\u092E\u093E\u0928\u094D\u092F \u0936\u092C\u094D\u0926 \u092A\u0939\u091A\u093E\u0928 \u26A1",
        instruction: '\u0935\u093E\u0915\u094D\u092F\u094B\u0902 \u092E\u0947\u0902 \u0905\u0915\u094D\u0938\u0930 \u0906\u0928\u0947 \u0935\u093E\u0932\u093E \u0936\u092C\u094D\u0926 "\u0914\u0930" \u092A\u0939\u091A\u093E\u0928\u093F\u090F:',
        difficulty: req.difficulty,
        language: "Hindi",
        type: "word_match",
        prompt: '"\u0914\u0930" \u0936\u092C\u094D\u0926 \u0915\u094C\u0928-\u0938\u093E \u0939\u0948?',
        items: [
          { id: "opt_aur", text: "\u0914\u0930", visual: "\u2728", isCorrect: true, feedbackHint: '\u0936\u093E\u0928\u0926\u093E\u0930! "\u0914\u0930" \u090F\u0915 \u092C\u0939\u0941\u0924 \u0909\u092A\u092F\u094B\u0917\u0940 \u0936\u092C\u094D\u0926 \u0939\u0948! \u{1F31F}' },
          { id: "opt_aurat", text: "\u0914\u0930\u0924", visual: "\u{1F469}", isCorrect: false, feedbackHint: '\u092F\u0939 \u0914\u0930\u0924 \u0939\u0948\u0964 "\u0914\u0930" \u091A\u0941\u0928\u0947\u0902\u0964' }
        ],
        stepByStepHint: "\u0914 \u0915\u0940 \u092E\u093E\u0924\u094D\u0930\u093E \u0914\u0930 \u0930: \u0914\u0930!"
      };
    }
    if (isOdia) {
      return {
        id: `act_sw_or_${Date.now()}`,
        skillId: "skill_sight_words_high_freq",
        title: "\u0B26\u0B43\u0B37\u0B4D\u0B1F\u0B3F \u0B36\u0B2C\u0B4D\u0B26 \u0B2A\u0B30\u0B3F\u0B1A\u0B5F \u26A1",
        instruction: '\u0B2C\u0B3E\u0B30\u0B2E\u0B4D\u0B2C\u0B3E\u0B30 \u0B2C\u0B4D\u0B5F\u0B2C\u0B39\u0B43\u0B24 \u0B36\u0B2C\u0B4D\u0B26 "\u0B0F\u0B2C\u0B02" \u0B15\u0B41 \u0B1A\u0B3F\u0B39\u0B4D\u0B28\u0B28\u0B4D\u0B24\u0B41:',
        difficulty: req.difficulty,
        language: "Odia",
        type: "word_match",
        prompt: '"\u0B0F\u0B2C\u0B02" \u0B36\u0B2C\u0B4D\u0B26\u0B1F\u0B3F \u0B15\u0B47\u0B09\u0B01\u0B1F\u0B3F?',
        items: [
          { id: "opt_ebang", text: "\u0B0F\u0B2C\u0B02", visual: "\u2728", isCorrect: true, feedbackHint: '\u0B38\u0B20\u0B3F\u0B15\u0B4D! "\u0B0F\u0B2C\u0B02" \u0B0F\u0B15 \u0B38\u0B3E\u0B27\u0B3E\u0B30\u0B23 \u0B36\u0B2C\u0B4D\u0B26 \u0B05\u0B1F\u0B47! \u{1F31F}' },
          { id: "opt_eka", text: "\u0B0F\u0B15", visual: "\u261D\uFE0F", isCorrect: false, feedbackHint: "\u0B0F\u0B39\u0B3E \u0B0F\u0B15\u0964" }
        ],
        stepByStepHint: "\u0B0F - \u0B2C - \u0B02: \u0B0F\u0B2C\u0B02!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_sw_pa_${Date.now()}`,
        skillId: "skill_sight_words_high_freq",
        title: "\u0A06\u0A2E \u0A38\u0A3C\u0A2C\u0A26 \u0A2A\u0A1B\u0A3E\u0A23 \u26A1",
        instruction: '\u0A06\u0A2E \u0A35\u0A30\u0A24\u0A3F\u0A06 \u0A1C\u0A3E\u0A23 \u0A35\u0A3E\u0A32\u0A3E \u0A38\u0A3C\u0A2C\u0A26 "\u0A05\u0A24\u0A47" \u0A2A\u0A1B\u0A3E\u0A23\u0A4B:',
        difficulty: req.difficulty,
        language: "Punjabi",
        type: "word_match",
        prompt: '"\u0A05\u0A24\u0A47" \u0A38\u0A3C\u0A2C\u0A26 \u0A15\u0A3F\u0A39\u0A5C\u0A3E \u0A39\u0A48?',
        items: [
          { id: "opt_ate", text: "\u0A05\u0A24\u0A47", visual: "\u2728", isCorrect: true, feedbackHint: '\u0A15\u0A2E\u0A3E\u0A32! "\u0A05\u0A24\u0A47" \u0A2C\u0A39\u0A41\u0A24 \u0A2E\u0A39\u0A71\u0A24\u0A35\u0A2A\u0A42\u0A30\u0A28 \u0A38\u0A3C\u0A2C\u0A26 \u0A39\u0A48! \u{1F31F}' },
          { id: "opt_ajj", text: "\u0A05\u0A71\u0A1C", visual: "\u{1F4C5}", isCorrect: false, feedbackHint: "\u0A07\u0A39 \u0A05\u0A71\u0A1C \u0A39\u0A48\u0964" }
        ],
        stepByStepHint: "\u0A05 - \u0A24\u0A47: \u0A05\u0A24\u0A47!"
      };
    }
    if (isTamil) {
      return {
        id: `act_sw_ta_${Date.now()}`,
        skillId: "skill_sight_words_high_freq",
        title: "\u0BAA\u0BBE\u0BB0\u0BCD\u0BB5\u0BC8\u0B9A\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD \u0B85\u0BB1\u0BBF\u0BA4\u0BB2\u0BCD \u26A1",
        instruction: '\u0B85\u0B9F\u0BBF\u0B95\u0BCD\u0B95\u0B9F\u0BBF \u0BB5\u0BB0\u0BC1\u0BAE\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BBE\u0BA9 "\u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD" \u0B90\u0B95\u0BCD \u0B95\u0BA3\u0BCD\u0B9F\u0BB1\u0BBF\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD:',
        difficulty: req.difficulty,
        language: "Tamil",
        type: "word_match",
        prompt: '"\u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD" \u0B8E\u0BA9\u0BCD\u0BB1 \u0B9A\u0BCA\u0BB2\u0BCD \u0B8E\u0BA4\u0BC1?',
        items: [
          { id: "opt_matrum", text: "\u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD", visual: "\u2728", isCorrect: true, feedbackHint: '\u0B85\u0BB0\u0BC1\u0BAE\u0BC8! "\u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD" \u0BAA\u0BAF\u0BA9\u0BC1\u0BB3\u0BCD\u0BB3 \u0B9A\u0BCA\u0BB2\u0BCD! \u{1F31F}' },
          { id: "opt_man", text: "\u0BAE\u0BA3\u0BCD", visual: "\u{1FAB4}", isCorrect: false, feedbackHint: "\u0B87\u0BA4\u0BC1 \u0BAE\u0BA3\u0BCD." }
        ],
        stepByStepHint: "\u0BAE-\u0BB1\u0BCD-\u0BB1\u0BC1-\u0BAE\u0BCD: \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD!"
      };
    }
    return {
      id: `act_sight_words_${Date.now()}`,
      skillId: "skill_sight_words_high_freq",
      title: "Sight Word Sparkle \u26A1",
      instruction: 'Spot the sight word "the" used in "the little kite":',
      difficulty: req.difficulty,
      language: "English",
      type: "word_match",
      prompt: 'Which word is "the"?',
      items: [
        { id: "opt_the", text: "the", visual: "\u2728", isCorrect: true, feedbackHint: 'Brilliant! "the" is one of our most helpful sight words! \u{1F31F}' },
        { id: "opt_teh", text: "teh", visual: "\u274C", isCorrect: false, feedbackHint: "Check the letters: t, then h, then e." }
      ],
      stepByStepHint: "Remember the 3 letters: T - H - E. Say: the!"
    };
  }
  if (req.skillId === "skill_story_comprehension") {
    if (isHindi) {
      return {
        id: `act_comp_hi_${Date.now()}`,
        skillId: "skill_story_comprehension",
        title: "\u0915\u0939\u093E\u0928\u0940 \u092C\u094B\u0927: \u0938\u0928\u0940 \u0915\u0940 \u092A\u0924\u0902\u0917 \u{1FA81}",
        instruction: "\u0938\u0928\u0940 \u0928\u0947 \u090F\u0915 \u0932\u093E\u0932 \u092A\u0924\u0902\u0917 \u092C\u0928\u093E\u0908\u0964 \u0939\u0935\u093E \u0909\u0938\u0947 \u092A\u0947\u0921\u093C\u094B\u0902 \u0938\u0947 \u090A\u092A\u0930 \u0932\u0947 \u0917\u0908! \u092A\u0924\u0902\u0917 \u0915\u093E \u0930\u0902\u0917 \u0915\u094D\u092F\u093E \u0925\u093E?",
        difficulty: req.difficulty,
        language: "Hindi",
        type: "word_match",
        prompt: "\u0938\u0928\u0940 \u0915\u0940 \u092A\u0924\u0902\u0917 \u0915\u093E \u0930\u0902\u0917 \u0915\u094D\u092F\u093E \u0925\u093E \u{1FA81}?",
        items: [
          { id: "opt_red", text: "\u0932\u093E\u0932", visual: "\u{1F534}", isCorrect: true, feedbackHint: "\u092C\u093F\u0932\u094D\u0915\u0941\u0932 \u0938\u0939\u0940! \u0938\u0928\u0940 \u0915\u0940 \u092A\u0924\u0902\u0917 \u0932\u093E\u0932 \u0930\u0902\u0917 \u0915\u0940 \u0925\u0940! \u{1FA81}" },
          { id: "opt_blue", text: "\u0928\u0940\u0932\u093E", visual: "\u{1F535}", isCorrect: false, feedbackHint: "\u0915\u0939\u093E\u0928\u0940 \u092E\u0947\u0902 \u0932\u093E\u0932 \u092A\u0924\u0902\u0917 \u0932\u093F\u0916\u0940 \u0939\u0948\u0964" }
        ],
        stepByStepHint: '\u0935\u093E\u0915\u094D\u092F \u092B\u093F\u0930 \u0938\u0947 \u092A\u0922\u093C\u093F\u090F: "\u0938\u0928\u0940 \u0928\u0947 \u090F\u0915 \u0932\u093E\u0932 \u092A\u0924\u0902\u0917 \u092C\u0928\u093E\u0908\u0964"'
      };
    }
    if (isOdia) {
      return {
        id: `act_comp_or_${Date.now()}`,
        skillId: "skill_story_comprehension",
        title: "\u0B17\u0B2A \u0B2C\u0B4B\u0B27: \u0B38\u0B28\u0B3F\u0B30 \u0B17\u0B41\u0B21\u0B3C\u0B3F \u{1FA81}",
        instruction: "\u0B38\u0B28\u0B3F \u0B0F\u0B15 \u0B28\u0B3E\u0B32\u0B3F \u0B17\u0B41\u0B21\u0B3C\u0B3F \u0B24\u0B3F\u0B06\u0B30\u0B3F \u0B15\u0B32\u0B3E\u0964 \u0B2A\u0B2C\u0B28 \u0B24\u0B3E\u0B15\u0B41 \u0B17\u0B1B \u0B09\u0B2A\u0B30\u0B15\u0B41 \u0B09\u0B21\u0B3C\u0B3E\u0B07\u0B32\u0B3E! \u0B17\u0B41\u0B21\u0B3C\u0B3F\u0B30 \u0B30\u0B19\u0B4D\u0B17 \u0B15\u0B23 \u0B25\u0B3F\u0B32\u0B3E?",
        difficulty: req.difficulty,
        language: "Odia",
        type: "word_match",
        prompt: "\u0B38\u0B28\u0B3F\u0B30 \u0B17\u0B41\u0B21\u0B3C\u0B3F \u0B15\u0B47\u0B09\u0B01 \u0B30\u0B19\u0B4D\u0B17\u0B30 \u0B25\u0B3F\u0B32\u0B3E \u{1FA81}?",
        items: [
          { id: "opt_red", text: "\u0B28\u0B3E\u0B32\u0B3F", visual: "\u{1F534}", isCorrect: true, feedbackHint: "\u0B38\u0B20\u0B3F\u0B15\u0B4D! \u0B38\u0B28\u0B3F\u0B30 \u0B17\u0B41\u0B21\u0B3C\u0B3F \u0B28\u0B3E\u0B32\u0B3F \u0B30\u0B19\u0B4D\u0B17\u0B30 \u0B25\u0B3F\u0B32\u0B3E! \u{1FA81}" },
          { id: "opt_blue", text: "\u0B28\u0B40\u0B33", visual: "\u{1F535}", isCorrect: false, feedbackHint: "\u0B17\u0B2A\u0B30\u0B47 \u0B28\u0B3E\u0B32\u0B3F \u0B17\u0B41\u0B21\u0B3C\u0B3F \u0B32\u0B47\u0B16\u0B3E\u0B05\u0B1B\u0B3F\u0964" }
        ],
        stepByStepHint: '\u0B2A\u0B4D\u0B30\u0B25\u0B2E \u0B27\u0B3E\u0B21\u0B3C\u0B3F \u0B26\u0B47\u0B16\u0B28\u0B4D\u0B24\u0B41: "\u0B28\u0B3E\u0B32\u0B3F \u0B17\u0B41\u0B21\u0B3C\u0B3F\u0964"'
      };
    }
    if (isPunjabi) {
      return {
        id: `act_comp_pa_${Date.now()}`,
        skillId: "skill_story_comprehension",
        title: "\u0A15\u0A39\u0A3E\u0A23\u0A40 \u0A38\u0A2E\u0A1D: \u0A38\u0A70\u0A28\u0A40 \u0A26\u0A40 \u0A2A\u0A24\u0A70\u0A17 \u{1FA81}",
        instruction: "\u0A38\u0A70\u0A28\u0A40 \u0A28\u0A47 \u0A07\u0A71\u0A15 \u0A32\u0A3E\u0A32 \u0A2A\u0A24\u0A70\u0A17 \u0A2C\u0A23\u0A3E\u0A08\u0964 \u0A39\u0A35\u0A3E \u0A09\u0A38\u0A28\u0A42\u0A70 \u0A30\u0A41\u0A71\u0A16\u0A3E\u0A02 \u0A24\u0A4B\u0A02 \u0A09\u0A71\u0A1A\u0A3E \u0A32\u0A48 \u0A17\u0A08! \u0A2A\u0A24\u0A70\u0A17 \u0A26\u0A3E \u0A30\u0A70\u0A17 \u0A15\u0A40 \u0A38\u0A40?",
        difficulty: req.difficulty,
        language: "Punjabi",
        type: "word_match",
        prompt: "\u0A38\u0A70\u0A28\u0A40 \u0A26\u0A40 \u0A2A\u0A24\u0A70\u0A17 \u0A26\u0A3E \u0A30\u0A70\u0A17 \u0A15\u0A40 \u0A38\u0A40 \u{1FA81}?",
        items: [
          { id: "opt_red", text: "\u0A32\u0A3E\u0A32", visual: "\u{1F534}", isCorrect: true, feedbackHint: "\u0A38\u0A39\u0A40 \u0A09\u0A71\u0A24\u0A30! \u0A38\u0A70\u0A28\u0A40 \u0A26\u0A40 \u0A2A\u0A24\u0A70\u0A17 \u0A32\u0A3E\u0A32 \u0A38\u0A40! \u{1FA81}" },
          { id: "opt_blue", text: "\u0A28\u0A40\u0A32\u0A3E", visual: "\u{1F535}", isCorrect: false, feedbackHint: "\u0A15\u0A39\u0A3E\u0A23\u0A40 \u0A35\u0A3F\u0A71\u0A1A \u0A32\u0A3E\u0A32 \u0A2A\u0A24\u0A70\u0A17 \u0A39\u0A48\u0964" }
        ],
        stepByStepHint: '\u0A2A\u0A39\u0A3F\u0A32\u0A3E \u0A35\u0A3E\u0A15 \u0A2A\u0A5C\u0A4D\u0A39\u0A4B: "\u0A07\u0A71\u0A15 \u0A32\u0A3E\u0A32 \u0A2A\u0A24\u0A70\u0A17 \u0A2C\u0A23\u0A3E\u0A08\u0964"'
      };
    }
    if (isTamil) {
      return {
        id: `act_comp_ta_${Date.now()}`,
        skillId: "skill_story_comprehension",
        title: "\u0B95\u0BA4\u0BC8\u0BAA\u0BCD \u0BAA\u0BC1\u0BB0\u0BBF\u0BA4\u0BB2\u0BCD: \u0B9A\u0BA9\u0BCD\u0BA9\u0BBF\u0BAF\u0BBF\u0BA9\u0BCD \u0BAA\u0B9F\u0BCD\u0B9F\u0BAE\u0BCD \u{1FA81}",
        instruction: "\u0B9A\u0BA9\u0BCD\u0BA9\u0BBF \u0B92\u0BB0\u0BC1 \u0B9A\u0BBF\u0BB5\u0BAA\u0BCD\u0BAA\u0BC1\u0BAA\u0BCD \u0BAA\u0B9F\u0BCD\u0B9F\u0BAE\u0BCD \u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BBE\u0BB3\u0BCD. \u0B95\u0BBE\u0BB1\u0BCD\u0BB1\u0BC1 \u0B85\u0BA4\u0BC8 \u0BAE\u0BB0\u0B99\u0BCD\u0B95\u0BB3\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0BAE\u0BC7\u0BB2\u0BCD \u0B89\u0BAF\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BBF\u0BAF\u0BA4\u0BC1! \u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BCD\u0BA4\u0BBF\u0BA9\u0BCD \u0BA8\u0BBF\u0BB1\u0BAE\u0BCD \u0B8E\u0BA9\u0BCD\u0BA9?",
        difficulty: req.difficulty,
        language: "Tamil",
        type: "word_match",
        prompt: "\u0B9A\u0BA9\u0BCD\u0BA9\u0BBF\u0BAF\u0BBF\u0BA9\u0BCD \u0BAA\u0B9F\u0BCD\u0B9F\u0BAE\u0BCD \u0B8E\u0BA9\u0BCD\u0BA9 \u0BA8\u0BBF\u0BB1\u0BAE\u0BCD \u{1FA81}?",
        items: [
          { id: "opt_red", text: "\u0B9A\u0BBF\u0BB5\u0BAA\u0BCD\u0BAA\u0BC1", visual: "\u{1F534}", isCorrect: true, feedbackHint: "\u0B9A\u0BB0\u0BBF\u0BAF\u0BBE\u0BA9 \u0BAA\u0BA4\u0BBF\u0BB2\u0BCD! \u0B9A\u0BA9\u0BCD\u0BA9\u0BBF\u0BAF\u0BBF\u0BA9\u0BCD \u0BAA\u0B9F\u0BCD\u0B9F\u0BAE\u0BCD \u0B9A\u0BBF\u0BB5\u0BAA\u0BCD\u0BAA\u0BC1 \u0BA8\u0BBF\u0BB1\u0BAE\u0BCD! \u{1FA81}" },
          { id: "opt_blue", text: "\u0BA8\u0BC0\u0BB2\u0BAE\u0BCD", visual: "\u{1F535}", isCorrect: false, feedbackHint: "\u0B95\u0BA4\u0BC8\u0BAF\u0BBF\u0BB2\u0BCD \u0B9A\u0BBF\u0BB5\u0BAA\u0BCD\u0BAA\u0BC1\u0BAA\u0BCD \u0BAA\u0B9F\u0BCD\u0B9F\u0BAE\u0BCD \u0B8E\u0BA9\u0BCD\u0BB1\u0BC1\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1." }
        ],
        stepByStepHint: '\u0BAE\u0BC1\u0BA4\u0BB2\u0BCD \u0BB5\u0BB0\u0BBF\u0BAF\u0BC8\u0BAA\u0BCD \u0BAA\u0B9F\u0BBF\u0BAF\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: "\u0B92\u0BB0\u0BC1 \u0B9A\u0BBF\u0BB5\u0BAA\u0BCD\u0BAA\u0BC1\u0BAA\u0BCD \u0BAA\u0B9F\u0BCD\u0B9F\u0BAE\u0BCD \u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BBE\u0BB3\u0BCD."'
      };
    }
    return {
      id: `act_story_comp_${Date.now()}`,
      skillId: "skill_story_comprehension",
      title: "Story Explorer: Sunny and the Kite \u{1FA81}",
      instruction: "Sunny made a red kite. The wind lifted it up above the trees! What color was the kite?",
      difficulty: req.difficulty,
      language: "English",
      type: "word_match",
      prompt: "What color was Sunny's kite \u{1FA81}?",
      items: [
        { id: "opt_red", text: "Red", visual: "\u{1F534}", isCorrect: true, feedbackHint: "Spot on! Sunny made a bright RED kite that flew high! \u{1FA81}" },
        { id: "opt_blue", text: "Blue", visual: "\u{1F535}", isCorrect: false, feedbackHint: "The story said Sunny made a RED kite." }
      ],
      stepByStepHint: 'Look back at the first sentence: "Sunny made a red kite."'
    };
  }
  if (req.skillId === "skill_sentence_fluency") {
    if (isHindi) {
      return {
        id: `act_fl_hi_${Date.now()}`,
        skillId: "skill_sentence_fluency",
        title: "\u0936\u092C\u094D\u0926 \u0905\u0930\u094D\u0925: \u0915\u094B\u092E\u0932 \u0938\u094D\u092A\u0930\u094D\u0936 \u{1F33F}",
        instruction: '"\u0915\u094B\u092E\u0932" \u0915\u093E \u0905\u0930\u094D\u0925 \u092C\u0939\u0941\u0924 \u0928\u0930\u092E \u0914\u0930 \u092A\u094D\u092F\u093E\u0930\u093E \u0939\u094B\u0924\u093E \u0939\u0948\u0964 \u0915\u094C\u0928-\u0938\u093E \u091A\u093F\u0924\u094D\u0930 \u0915\u094B\u092E\u0932 \u0938\u094D\u092A\u0930\u094D\u0936 \u0926\u093F\u0916\u093E\u0924\u093E \u0939\u0948?',
        difficulty: req.difficulty,
        language: "Hindi",
        type: "word_match",
        prompt: "\u0915\u094B\u092E\u0932 \u091A\u0940\u091C\u093C \u0915\u094C\u0928-\u0938\u0940 \u0939\u0948?",
        items: [
          { id: "opt_butterfly", text: "\u0924\u093F\u0924\u0932\u0940 \u0915\u093E \u092B\u0942\u0932 \u092A\u0930 \u092C\u0948\u0920\u0928\u093E", visual: "\u{1F98B}", isCorrect: true, feedbackHint: "\u092C\u0939\u0941\u0924 \u0916\u0942\u092C! \u0924\u093F\u0924\u0932\u0940 \u092B\u0942\u0932 \u092A\u0930 \u092C\u0939\u0941\u0924 \u0915\u094B\u092E\u0932\u0924\u093E \u0938\u0947 \u092C\u0948\u0920\u0924\u0940 \u0939\u0948! \u{1F338}" },
          { id: "opt_storm", text: "\u0924\u0947\u091C\u093C \u0924\u0942\u092B\u093C\u0A3E\u0A28", visual: "\u26C8\uFE0F", isCorrect: false, feedbackHint: "\u0924\u0942\u092B\u093C\u093E\u0928 \u0924\u0947\u091C\u093C \u0914\u0930 \u0915\u0920\u094B\u0930 \u0939\u094B\u0924\u093E \u0939\u0948\u0964" }
        ],
        stepByStepHint: "\u0938\u094B\u091A\u093F\u090F \u092B\u0942\u0932 \u0915\u0940 \u092A\u0902\u0916\u0941\u0921\u093C\u093F\u092F\u094B\u0902 \u091C\u0948\u0938\u093E \u0915\u094D\u092F\u093E \u0939\u0948: \u0924\u093F\u0924\u0932\u0940!"
      };
    }
    if (isOdia) {
      return {
        id: `act_fl_or_${Date.now()}`,
        skillId: "skill_sentence_fluency",
        title: "\u0B36\u0B2C\u0B4D\u0B26 \u0B05\u0B30\u0B4D\u0B25: \u0B15\u0B4B\u0B2E\u0B33 \u0B38\u0B4D\u0B2A\u0B30\u0B4D\u0B36 \u{1F33F}",
        instruction: '"\u0B15\u0B4B\u0B2E\u0B33" \u0B30 \u0B05\u0B30\u0B4D\u0B25 \u0B28\u0B30\u0B2E \u0B13 \u0B38\u0B4D\u0B28\u0B47\u0B39\u0B2D\u0B30\u0B3E\u0964 \u0B15\u0B47\u0B09\u0B01 \u0B1B\u0B2C\u0B3F\u0B1F\u0B3F \u0B15\u0B4B\u0B2E\u0B33\u0B24\u0B3E \u0B26\u0B30\u0B4D\u0B36\u0B3E\u0B09\u0B1B\u0B3F?',
        difficulty: req.difficulty,
        language: "Odia",
        type: "word_match",
        prompt: "\u0B15\u0B4B\u0B2E\u0B33 \u0B2C\u0B38\u0B4D\u0B24\u0B41 \u0B15\u0B47\u0B09\u0B01\u0B1F\u0B3F?",
        items: [
          { id: "opt_butterfly", text: "\u0B2B\u0B41\u0B32 \u0B09\u0B2A\u0B30\u0B47 \u0B2A\u0B4D\u0B30\u0B1C\u0B3E\u0B2A\u0B24\u0B3F", visual: "\u{1F98B}", isCorrect: true, feedbackHint: "\u0B05\u0B24\u0B3F \u0B38\u0B41\u0B28\u0B4D\u0B26\u0B30! \u0B2A\u0B4D\u0B30\u0B1C\u0B3E\u0B2A\u0B24\u0B3F \u0B2B\u0B41\u0B32 \u0B09\u0B2A\u0B30\u0B47 \u0B15\u0B4B\u0B2E\u0B33 \u0B2D\u0B3E\u0B2C\u0B47 \u0B2C\u0B38\u0B47! \u{1F338}" },
          { id: "opt_storm", text: "\u0B2A\u0B4D\u0B30\u0B2C\u0B33 \u0B1D\u0B21\u0B3C", visual: "\u26C8\uFE0F", isCorrect: false, feedbackHint: "\u0B1D\u0B21\u0B3C \u0B15\u0B20\u0B4B\u0B30 \u0B05\u0B1F\u0B47\u0964" }
        ],
        stepByStepHint: "\u0B28\u0B30\u0B2E \u0B13 \u0B36\u0B3E\u0B28\u0B4D\u0B24 \u0B1C\u0B3F\u0B28\u0B3F\u0B37 \u0B1A\u0B3F\u0B28\u0B4D\u0B24\u0B3E \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41: \u0B2A\u0B4D\u0B30\u0B1C\u0B3E\u0B2A\u0B24\u0B3F!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_fl_pa_${Date.now()}`,
        skillId: "skill_sentence_fluency",
        title: "\u0A38\u0A3C\u0A2C\u0A26 \u0A05\u0A30\u0A25: \u0A15\u0A4B\u0A2E\u0A32 \u0A1B\u0A4B\u0A39 \u{1F33F}",
        instruction: '"\u0A15\u0A4B\u0A2E\u0A32" \u0A26\u0A3E \u0A05\u0A30\u0A25 \u0A28\u0A30\u0A2E \u0A05\u0A24\u0A47 \u0A2A\u0A3F\u0A06\u0A30\u0A3E \u0A39\u0A41\u0A70\u0A26\u0A3E \u0A39\u0A48\u0964 \u0A15\u0A3F\u0A39\u0A5C\u0A40 \u0A24\u0A38\u0A35\u0A40\u0A30 \u0A15\u0A4B\u0A2E\u0A32\u0A24\u0A3E \u0A26\u0A30\u0A38\u0A3E\u0A09\u0A02\u0A26\u0A40 \u0A39\u0A48?',
        difficulty: req.difficulty,
        language: "Punjabi",
        type: "word_match",
        prompt: "\u0A15\u0A4B\u0A2E\u0A32 \u0A1A\u0A40\u0A1C\u0A3C \u0A15\u0A3F\u0A39\u0A5C\u0A40 \u0A39\u0A48?",
        items: [
          { id: "opt_butterfly", text: "\u0A2B\u0A41\u0A71\u0A32 \u0A09\u0A71\u0A24\u0A47 \u0A24\u0A3F\u0A71\u0A24\u0A32\u0A40", visual: "\u{1F98B}", isCorrect: true, feedbackHint: "\u0A38\u0A3C\u0A3E\u0A2C\u0A3E\u0A38\u0A3C! \u0A24\u0A3F\u0A71\u0A24\u0A32\u0A40 \u0A2C\u0A39\u0A41\u0A24 \u0A15\u0A4B\u0A2E\u0A32 \u0A39\u0A41\u0A70\u0A26\u0A40 \u0A39\u0A48! \u{1F338}" },
          { id: "opt_storm", text: "\u0A2D\u0A3E\u0A30\u0A40 \u0A24\u0A42\u0A2B\u0A3C\u0A3E\u0A28", visual: "\u26C8\uFE0F", isCorrect: false, feedbackHint: "\u0A24\u0A42\u0A2B\u0A3C\u0A3E\u0A28 \u0A24\u0A47\u0A1C\u0A3C \u0A39\u0A41\u0A70\u0A26\u0A3E \u0A39\u0A48\u0964" }
        ],
        stepByStepHint: "\u0A28\u0A30\u0A2E \u0A05\u0A24\u0A47 \u0A38\u0A3C\u0A3E\u0A02\u0A24 \u0A38\u0A4B\u0A1A\u0A4B: \u0A24\u0A3F\u0A71\u0A24\u0A32\u0A40!"
      };
    }
    if (isTamil) {
      return {
        id: `act_fl_ta_${Date.now()}`,
        skillId: "skill_sentence_fluency",
        title: "\u0B9A\u0BCA\u0BB2\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BB3\u0BCD: \u0BAE\u0BC6\u0BA9\u0BCD\u0BAE\u0BC8\u0BAF\u0BBE\u0BA9 \u0BA4\u0BCA\u0B9F\u0BC1\u0BA4\u0BB2\u0BCD \u{1F33F}",
        instruction: '"\u0BAE\u0BC6\u0BA9\u0BCD\u0BAE\u0BC8\u0BAF\u0BBE\u0BA9" \u0B8E\u0BA9\u0BCD\u0BB1\u0BBE\u0BB2\u0BCD \u0BAE\u0BBF\u0B95\u0BB5\u0BC1\u0BAE\u0BCD \u0B87\u0BA4\u0BAE\u0BBE\u0BA9\u0BA4\u0BC1. \u0B8E\u0BA4\u0BC1 \u0BAE\u0BC6\u0BA9\u0BCD\u0BAE\u0BC8\u0BAF\u0BC8 \u0B89\u0BA3\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1?',
        difficulty: req.difficulty,
        language: "Tamil",
        type: "word_match",
        prompt: "\u0BAE\u0BC6\u0BA9\u0BCD\u0BAE\u0BC8\u0BAF\u0BBE\u0BA9 \u0B9A\u0BC6\u0BAF\u0BB2\u0BCD \u0B8E\u0BA4\u0BC1?",
        items: [
          { id: "opt_butterfly", text: "\u0BAA\u0BC2\u0BB5\u0BBF\u0BA9\u0BCD \u0BAE\u0BC0\u0BA4\u0BC1 \u0BB5\u0BA3\u0BCD\u0BA3\u0BA4\u0BCD\u0BA4\u0BC1\u0BAA\u0BCD\u0BAA\u0BC2\u0B9A\u0BCD\u0B9A\u0BBF", visual: "\u{1F98B}", isCorrect: true, feedbackHint: "\u0B85\u0BB0\u0BC1\u0BAE\u0BC8! \u0BB5\u0BA3\u0BCD\u0BA3\u0BA4\u0BCD\u0BA4\u0BC1\u0BAA\u0BCD\u0BAA\u0BC2\u0B9A\u0BCD\u0B9A\u0BBF \u0BAE\u0BBF\u0B95\u0BB5\u0BC1\u0BAE\u0BCD \u0BAE\u0BC6\u0BA9\u0BCD\u0BAE\u0BC8\u0BAF\u0BBE\u0B95 \u0B85\u0BAE\u0BB0\u0BC1\u0BAE\u0BCD! \u{1F338}" },
          { id: "opt_storm", text: "\u0B95\u0B9F\u0BC1\u0BAE\u0BCD \u0BAA\u0BC1\u0BAF\u0BB2\u0BCD", visual: "\u26C8\uFE0F", isCorrect: false, feedbackHint: "\u0BAA\u0BC1\u0BAF\u0BB2\u0BCD \u0B95\u0B9F\u0BBF\u0BA9\u0BAE\u0BBE\u0BA9\u0BA4\u0BC1." }
        ],
        stepByStepHint: "\u0B87\u0BA4\u0BAE\u0BBE\u0BA9 \u0B85\u0BAE\u0BC8\u0BA4\u0BBF\u0BAF\u0BBE\u0BA9 \u0B85\u0BB4\u0B95\u0BC8\u0B9A\u0BCD \u0B9A\u0BBF\u0BA8\u0BCD\u0BA4\u0BBF\u0BAF\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: \u0BB5\u0BA3\u0BCD\u0BA3\u0BA4\u0BCD\u0BA4\u0BC1\u0BAA\u0BCD\u0BAA\u0BC2\u0B9A\u0BCD\u0B9A\u0BBF!"
      };
    }
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
        { id: "opt_storm", text: "A loud roaring storm", visual: "\u26C8\uFE0F", isCorrect: false, feedbackHint: "A storm is loud and fierce, not gentle." }
      ],
      stepByStepHint: "Think about petting a little sleeping bunny: that is gentle!"
    };
  }
  if (req.skillId === "skill_listening_pronunciation") {
    if (isHindi) {
      return {
        id: `act_lp_hi_${Date.now()}`,
        skillId: "skill_listening_pronunciation",
        title: "\u0938\u0941\u0928\u094B \u0914\u0930 \u092A\u0939\u091A\u093E\u0928\u094B \u{1F3A7}",
        instruction: '\u0927\u094D\u092F\u093E\u0928 \u0938\u0947 \u0938\u0941\u0928\u093F\u090F: "\u0918\u093E\u0938 \u092E\u0947\u0902 \u090F\u0915 \u092A\u094D\u092F\u093E\u0930\u093E \u092A\u093F\u0932\u094D\u0932\u093E \u0916\u0947\u0932 \u0930\u0939\u093E \u0925\u093E\u0964" \u0918\u093E\u0938 \u092E\u0947\u0902 \u0915\u094C\u0928 \u0916\u0947\u0932 \u0930\u0939\u093E \u0925\u093E?',
        difficulty: req.difficulty,
        language: "Hindi",
        type: "word_match",
        prompt: "\u0918\u093E\u0938 \u092E\u0947\u0902 \u0915\u094C\u0928 \u0916\u0947\u0932 \u0930\u0939\u093E \u0925\u093E \u{1F33F}?",
        audioPrompt: "\u0918\u093E\u0938 \u092E\u0947\u0902 \u090F\u0915 \u092A\u094D\u092F\u093E\u0930\u093E \u092A\u093F\u0932\u094D\u0932\u093E \u0916\u0947\u0932 \u0930\u0939\u093E \u0925\u093E\u0964",
        items: [
          { id: "opt_puppy", text: "\u092A\u093F\u0932\u094D\u0932\u093E", visual: "\u{1F436}", isCorrect: true, feedbackHint: "\u092C\u0939\u0941\u0924 \u092C\u0922\u093C\u093F\u092F\u093E \u0936\u094D\u0930\u0935\u0923! \u0918\u093E\u0938 \u092E\u0947\u0902 \u092A\u093F\u0932\u094D\u0932\u093E \u0925\u093E! \u{1F43E}" },
          { id: "opt_frog", text: "\u092E\u0947\u0902\u0922\u0915", visual: "\u{1F438}", isCorrect: false, feedbackHint: "\u0911\u0921\u093F\u092F\u094B \u092E\u0947\u0902 \u092A\u093F\u0932\u094D\u0932\u093E \u0915\u0939\u093E \u0917\u092F\u093E \u0925\u093E\u0964" }
        ],
        stepByStepHint: '\u0935\u093E\u0915\u094D\u092F \u0927\u094D\u092F\u093E\u0928 \u0938\u0947 \u0938\u0941\u0928\u093F\u090F: "\u092A\u094D\u092F\u093E\u0930\u093E \u092A\u093F\u0932\u094D\u0932\u093E\u0964"'
      };
    }
    if (isOdia) {
      return {
        id: `act_lp_or_${Date.now()}`,
        skillId: "skill_listening_pronunciation",
        title: "\u0B36\u0B41\u0B23\u0B28\u0B4D\u0B24\u0B41 \u0B0F\u0B2C\u0B02 \u0B1A\u0B3F\u0B39\u0B4D\u0B28\u0B28\u0B4D\u0B24\u0B41 \u{1F3A7}",
        instruction: '\u0B27\u0B4D\u0B5F\u0B3E\u0B28\u0B30\u0B47 \u0B36\u0B41\u0B23\u0B28\u0B4D\u0B24\u0B41: "\u0B18\u0B3E\u0B38\u0B30\u0B47 \u0B17\u0B4B\u0B1F\u0B3F\u0B0F \u0B1B\u0B4B\u0B1F \u0B15\u0B41\u0B15\u0B41\u0B30 \u0B1B\u0B41\u0B06 \u0B16\u0B47\u0B33\u0B41\u0B25\u0B3F\u0B32\u0B3E\u0964" \u0B18\u0B3E\u0B38\u0B30\u0B47 \u0B15\u0B3F\u0B0F \u0B16\u0B47\u0B33\u0B41\u0B25\u0B3F\u0B32\u0B3E?',
        difficulty: req.difficulty,
        language: "Odia",
        type: "word_match",
        prompt: "\u0B18\u0B3E\u0B38\u0B30\u0B47 \u0B15\u0B3F\u0B0F \u0B16\u0B47\u0B33\u0B41\u0B25\u0B3F\u0B32\u0B3E \u{1F33F}?",
        audioPrompt: "\u0B18\u0B3E\u0B38\u0B30\u0B47 \u0B17\u0B4B\u0B1F\u0B3F\u0B0F \u0B1B\u0B4B\u0B1F \u0B15\u0B41\u0B15\u0B41\u0B30 \u0B1B\u0B41\u0B06 \u0B16\u0B47\u0B33\u0B41\u0B25\u0B3F\u0B32\u0B3E\u0964",
        items: [
          { id: "opt_puppy", text: "\u0B15\u0B41\u0B15\u0B41\u0B30 \u0B1B\u0B41\u0B06", visual: "\u{1F436}", isCorrect: true, feedbackHint: "\u0B05\u0B24\u0B3F \u0B09\u0B24\u0B4D\u0B24\u0B2E \u0B36\u0B4D\u0B30\u0B2C\u0B23! \u0B15\u0B41\u0B15\u0B41\u0B30 \u0B1B\u0B41\u0B06 \u0B16\u0B47\u0B33\u0B41\u0B25\u0B3F\u0B32\u0B3E! \u{1F43E}" },
          { id: "opt_frog", text: "\u0B2C\u0B47\u0B19\u0B4D\u0B17", visual: "\u{1F438}", isCorrect: false, feedbackHint: "\u0B15\u0B41\u0B15\u0B41\u0B30 \u0B1B\u0B41\u0B06 \u0B36\u0B2C\u0B4D\u0B26 \u0B15\u0B41\u0B39\u0B3E\u0B2F\u0B3E\u0B07\u0B25\u0B3F\u0B32\u0B3E\u0964" }
        ],
        stepByStepHint: "\u0B36\u0B41\u0B23\u0B3F \u0B15\u0B41\u0B39\u0B28\u0B4D\u0B24\u0B41: \u0B15\u0B41\u0B15\u0B41\u0B30 \u0B1B\u0B41\u0B06!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_lp_pa_${Date.now()}`,
        skillId: "skill_listening_pronunciation",
        title: "\u0A38\u0A41\u0A23\u0A4B \u0A05\u0A24\u0A47 \u0A2A\u0A1B\u0A3E\u0A23\u0A4B \u{1F3A7}",
        instruction: '\u0A27\u0A3F\u0A06\u0A28 \u0A28\u0A3E\u0A32 \u0A38\u0A41\u0A23\u0A4B: "\u0A18\u0A3E\u0A39 \u0A35\u0A3F\u0A71\u0A1A \u0A07\u0A71\u0A15 \u0A28\u0A3F\u0A71\u0A15\u0A3E \u0A15\u0A24\u0A42\u0A30\u0A3E \u0A16\u0A47\u0A21 \u0A30\u0A3F\u0A39\u0A3E \u0A38\u0A40\u0964" \u0A18\u0A3E\u0A39 \u0A35\u0A3F\u0A71\u0A1A \u0A15\u0A4C\u0A23 \u0A38\u0A40?',
        difficulty: req.difficulty,
        language: "Punjabi",
        type: "word_match",
        prompt: "\u0A18\u0A3E\u0A39 \u0A35\u0A3F\u0A71\u0A1A \u0A15\u0A4C\u0A23 \u0A16\u0A47\u0A21 \u0A30\u0A3F\u0A39\u0A3E \u0A38\u0A40 \u{1F33F}?",
        audioPrompt: "\u0A18\u0A3E\u0A39 \u0A35\u0A3F\u0A71\u0A1A \u0A07\u0A71\u0A15 \u0A28\u0A3F\u0A71\u0A15\u0A3E \u0A15\u0A24\u0A42\u0A30\u0A3E \u0A16\u0A47\u0A21 \u0A30\u0A3F\u0A39\u0A3E \u0A38\u0A40\u0964",
        items: [
          { id: "opt_puppy", text: "\u0A15\u0A24\u0A42\u0A30\u0A3E", visual: "\u{1F436}", isCorrect: true, feedbackHint: "\u0A2C\u0A39\u0A41\u0A24 \u0A35\u0A27\u0A40\u0A06 \u0A38\u0A41\u0A23\u0A3F\u0A06! \u0A18\u0A3E\u0A39 \u0A35\u0A3F\u0A71\u0A1A \u0A15\u0A24\u0A42\u0A30\u0A3E \u0A38\u0A40! \u{1F43E}" },
          { id: "opt_frog", text: "\u0A21\u0A71\u0A21\u0A42", visual: "\u{1F438}", isCorrect: false, feedbackHint: "\u0A15\u0A24\u0A42\u0A30\u0A3E \u0A38\u0A3C\u0A2C\u0A26 \u0A15\u0A3F\u0A39\u0A3E \u0A17\u0A3F\u0A06 \u0A38\u0A40\u0964" }
        ],
        stepByStepHint: "\u0A38\u0A41\u0A23 \u0A15\u0A47 \u0A2C\u0A4B\u0A32\u0A4B: \u0A15\u0A24\u0A42\u0A30\u0A3E!"
      };
    }
    if (isTamil) {
      return {
        id: `act_lp_ta_${Date.now()}`,
        skillId: "skill_listening_pronunciation",
        title: "\u0B95\u0BC7\u0B9F\u0BCD\u0B9F\u0BC1 \u0B85\u0BB1\u0BBF\u0BA4\u0BB2\u0BCD \u{1F3A7}",
        instruction: '\u0B95\u0BB5\u0BA9\u0BAE\u0BBE\u0B95\u0B95\u0BCD \u0B95\u0BC7\u0BB3\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: "\u0BAA\u0BC1\u0BB2\u0BCD\u0BB5\u0BC6\u0BB3\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0B92\u0BB0\u0BC1 \u0B9A\u0BC1\u0B9F\u0BCD\u0B9F\u0BBF \u0BA8\u0BBE\u0BAF\u0BCD\u0B95\u0BCD\u0B95\u0BC1\u0B9F\u0BCD\u0B9F\u0BBF \u0BB5\u0BBF\u0BB3\u0BC8\u0BAF\u0BBE\u0B9F\u0BBF\u0BAF\u0BA4\u0BC1." \u0BAA\u0BC1\u0BB2\u0BCD\u0BB5\u0BC6\u0BB3\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BB5\u0BBF\u0BB3\u0BC8\u0BAF\u0BBE\u0B9F\u0BBF\u0BAF\u0BA4\u0BC1 \u0BAF\u0BBE\u0BB0\u0BCD?',
        difficulty: req.difficulty,
        language: "Tamil",
        type: "word_match",
        prompt: "\u0BAA\u0BC1\u0BB2\u0BCD\u0BB5\u0BC6\u0BB3\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BB5\u0BBF\u0BB3\u0BC8\u0BAF\u0BBE\u0B9F\u0BBF\u0BAF\u0BA4\u0BC1 \u0BAF\u0BBE\u0BB0\u0BCD \u{1F33F}?",
        audioPrompt: "\u0BAA\u0BC1\u0BB2\u0BCD\u0BB5\u0BC6\u0BB3\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0B92\u0BB0\u0BC1 \u0B9A\u0BC1\u0B9F\u0BCD\u0B9F\u0BBF \u0BA8\u0BBE\u0BAF\u0BCD\u0B95\u0BCD\u0B95\u0BC1\u0B9F\u0BCD\u0B9F\u0BBF \u0BB5\u0BBF\u0BB3\u0BC8\u0BAF\u0BBE\u0B9F\u0BBF\u0BAF\u0BA4\u0BC1.",
        items: [
          { id: "opt_puppy", text: "\u0BA8\u0BBE\u0BAF\u0BCD\u0B95\u0BCD\u0B95\u0BC1\u0B9F\u0BCD\u0B9F\u0BBF", visual: "\u{1F436}", isCorrect: true, feedbackHint: "\u0B85\u0BB0\u0BC1\u0BAE\u0BC8\u0BAF\u0BBE\u0BA9 \u0B95\u0BB5\u0BA9\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1! \u0BA8\u0BBE\u0BAF\u0BCD\u0B95\u0BCD\u0B95\u0BC1\u0B9F\u0BCD\u0B9F\u0BBF \u0BB5\u0BBF\u0BB3\u0BC8\u0BAF\u0BBE\u0B9F\u0BBF\u0BAF\u0BA4\u0BC1! \u{1F43E}" },
          { id: "opt_frog", text: "\u0BA4\u0BB5\u0BB3\u0BC8", visual: "\u{1F438}", isCorrect: false, feedbackHint: "\u0BA8\u0BBE\u0BAF\u0BCD\u0B95\u0BCD\u0B95\u0BC1\u0B9F\u0BCD\u0B9F\u0BBF \u0B8E\u0BA9\u0BCD\u0BB1\u0BC1 \u0B92\u0BB2\u0BBF\u0BA4\u0BCD\u0BA4\u0BA4\u0BC1." }
        ],
        stepByStepHint: "\u0BAE\u0BC0\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD \u0B95\u0BC7\u0BB3\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: \u0B9A\u0BC1\u0B9F\u0BCD\u0B9F\u0BBF \u0BA8\u0BBE\u0BAF\u0BCD\u0B95\u0BCD\u0B95\u0BC1\u0B9F\u0BCD\u0B9F\u0BBF!"
      };
    }
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
        { id: "opt_frog", text: "Frog", visual: "\u{1F438}", isCorrect: false, feedbackHint: "Listen again." }
      ],
      stepByStepHint: 'Say the words out loud: "friendly puppy" -> puppy!'
    };
  }
  if (req.skillId === "skill_spelling_cvc" || req.skillId === "skill_spelling_phonetic") {
    if (isHindi) {
      return {
        id: `act_sp_hi_${Date.now()}`,
        skillId: "skill_spelling_cvc",
        title: "\u0927\u094D\u0935\u0928\u093F \u0935\u0930\u094D\u0924\u0928\u0940: \u0928\u0932 \u270F\uFE0F",
        instruction: "\u092A\u093E\u0928\u0940 \u0915\u0947 \u0928\u0932 \u0915\u0940 \u0935\u0930\u094D\u0924\u0928\u0940 \u0915\u094D\u092F\u093E \u0939\u0948: /\u0928/ ... /\u0932/",
        difficulty: req.difficulty,
        language: "Hindi",
        type: "word_match",
        prompt: '"\u0928\u0932" (\u092A\u093E\u0928\u0940 \u0915\u093E \u0928\u0932) \u0915\u0948\u0938\u0947 \u0932\u093F\u0916\u093E \u091C\u093E\u0924\u093E \u0939\u0948 \u{1F6B0}?',
        items: [
          { id: "opt_nal", text: "\u0928\u0932", visual: "\u{1F6B0}", isCorrect: true, feedbackHint: "\u0936\u093E\u092C\u093E\u0936! \u0928-\u0932 \u0938\u0947 \u0928\u0932 \u092C\u0928\u093E! \u{1F31F}" },
          { id: "opt_lan", text: "\u0932\u0928", visual: "\u274C", isCorrect: false, feedbackHint: "\u092A\u0939\u0932\u0947 \u0928, \u092B\u093F\u0930 \u0932: \u0928\u0932!" }
        ],
        stepByStepHint: "\u0928 \u0914\u0930 \u0932 \u0915\u094B \u092E\u093F\u0932\u093E\u0907\u090F: \u0928\u0932!"
      };
    }
    if (isOdia) {
      return {
        id: `act_sp_or_${Date.now()}`,
        skillId: "skill_spelling_cvc",
        title: "\u0B27\u0B4D\u0B71\u0B28\u0B3F \u0B2C\u0B28\u0B3E\u0B28: \u0B28\u0B33 \u270F\uFE0F",
        instruction: "\u0B2A\u0B3E\u0B23\u0B3F \u0B28\u0B33\u0B30 \u0B2C\u0B28\u0B3E\u0B28 \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41: /\u0B28/ ... /\u0B33/",
        difficulty: req.difficulty,
        language: "Odia",
        type: "word_match",
        prompt: '"\u0B28\u0B33" \u0B15\u0B3F\u0B2A\u0B30\u0B3F \u0B32\u0B47\u0B16\u0B3E\u0B2F\u0B3E\u0B0F \u{1F6B0}?',
        items: [
          { id: "opt_nal", text: "\u0B28\u0B33", visual: "\u{1F6B0}", isCorrect: true, feedbackHint: "\u0B05\u0B24\u0B3F \u0B09\u0B24\u0B4D\u0B24\u0B2E! \u0B28-\u0B33 \u0B2E\u0B3F\u0B36\u0B3F \u0B28\u0B33 \u0B39\u0B47\u0B32\u0B3E! \u{1F31F}" },
          { id: "opt_lan", text: "\u0B33\u0B28", visual: "\u274C", isCorrect: false, feedbackHint: "\u0B2A\u0B4D\u0B30\u0B25\u0B2E\u0B47 \u0B28, \u0B2A\u0B30\u0B47 \u0B33: \u0B28\u0B33!" }
        ],
        stepByStepHint: "\u0B28 \u0B0F\u0B2C\u0B02 \u0B33 \u0B2E\u0B3F\u0B36\u0B3E\u0B28\u0B4D\u0B24\u0B41: \u0B28\u0B33!"
      };
    }
    if (isPunjabi) {
      return {
        id: `act_sp_pa_${Date.now()}`,
        skillId: "skill_spelling_cvc",
        title: "\u0A27\u0A41\u0A28\u0A40 \u0A38\u0A2A\u0A48\u0A32\u0A3F\u0A70\u0A17: \u0A1C\u0A32 \u270F\uFE0F",
        instruction: "\u0A2A\u0A3E\u0A23\u0A40 (\u0A1C\u0A32) \u0A26\u0A47 \u0A38\u0A2A\u0A48\u0A32\u0A3F\u0A70\u0A17 \u0A15\u0A40 \u0A39\u0A28: /\u0A1C/ ... /\u0A32/",
        difficulty: req.difficulty,
        language: "Punjabi",
        type: "word_match",
        prompt: '"\u0A1C\u0A32" \u0A15\u0A3F\u0A35\u0A47\u0A02 \u0A32\u0A3F\u0A16\u0A3F\u0A06 \u0A1C\u0A3E\u0A02\u0A26\u0A3E \u0A39\u0A48 \u{1F4A7}?',
        items: [
          { id: "opt_jal", text: "\u0A1C\u0A32", visual: "\u{1F4A7}", isCorrect: true, feedbackHint: "\u0A2C\u0A39\u0A41\u0A24 \u0A16\u0A3C\u0A42\u0A2C! \u0A1C-\u0A32 \u0A24\u0A4B\u0A02 \u0A1C\u0A32 \u0A2C\u0A23\u0A3F\u0A06! \u{1F31F}" },
          { id: "opt_laj", text: "\u0A32\u0A1C", visual: "\u274C", isCorrect: false, feedbackHint: "\u0A2A\u0A39\u0A3F\u0A32\u0A3E\u0A02 \u0A1C, \u0A2B\u0A3F\u0A30 \u0A32: \u0A1C\u0A32!" }
        ],
        stepByStepHint: "\u0A1C \u0A05\u0A24\u0A47 \u0A32 \u0A1C\u0A4B\u0A5C\u0A4B: \u0A1C\u0A32!"
      };
    }
    if (isTamil) {
      return {
        id: `act_sp_ta_${Date.now()}`,
        skillId: "skill_spelling_cvc",
        title: "\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BCD \u0B95\u0BC2\u0B9F\u0BCD\u0B9F\u0BC1\u0BA4\u0BB2\u0BCD: \u0B95\u0BB2\u0BCD \u270F\uFE0F",
        instruction: "\u0BAA\u0BBE\u0BB1\u0BC8 (\u0B95\u0BB2\u0BCD) \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BBF\u0BA9\u0BCD \u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BB3\u0BCD \u0B8E\u0BB5\u0BC8: /\u0B95/ ... /\u0BB2\u0BCD/",
        difficulty: req.difficulty,
        language: "Tamil",
        type: "word_match",
        prompt: '"\u0B95\u0BB2\u0BCD" \u0B8E\u0BAA\u0BCD\u0BAA\u0B9F\u0BBF \u0B8E\u0BB4\u0BC1\u0BA4\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1 \u{1FAA8}?',
        items: [
          { id: "opt_kal", text: "\u0B95\u0BB2\u0BCD", visual: "\u{1FAA8}", isCorrect: true, feedbackHint: "\u0B85\u0BB0\u0BC1\u0BAE\u0BC8! \u0B95-\u0BB2\u0BCD \u0B95\u0BB2\u0BCD! \u{1F31F}" },
          { id: "opt_lak", text: "\u0BB2\u0BCD\u0B95", visual: "\u274C", isCorrect: false, feedbackHint: "\u0BAE\u0BC1\u0BA4\u0BB2\u0BBF\u0BB2\u0BCD \u0B95, \u0BAA\u0BBF\u0BA9\u0BCD \u0BB2\u0BCD: \u0B95\u0BB2\u0BCD!" }
        ],
        stepByStepHint: "\u0B95 \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BB2\u0BCD \u0B9A\u0BC7\u0BB0\u0BCD\u0B95\u0BCD\u0B95: \u0B95\u0BB2\u0BCD!"
      };
    }
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
        { id: "opt_deb", text: "deb", visual: "\u274C", isCorrect: false, feedbackHint: "Remember the bed trick: left hand is b, right hand is d: b-e-d!" }
      ],
      stepByStepHint: 'Left hand makes "b", middle is "e", right hand makes "d": b-e-d!'
    };
  }
  if (isHindi) {
    return {
      id: `act_ls_hi_${Date.now()}`,
      skillId: "skill_letter_sounds_basic",
      title: "\u0905\u0915\u094D\u0937\u0930 \u0927\u094D\u0935\u0928\u093F \u092E\u093F\u0932\u093E\u0928 \u{1F981}",
      instruction: '\u091A\u093F\u0924\u094D\u0930 \u0926\u0947\u0916\u0915\u0930 \u092C\u0924\u093E\u0907\u090F \u0915\u093F \u0915\u094C\u0928-\u0938\u093E \u0936\u092C\u094D\u0926 "\u092E" \u0927\u094D\u0935\u0928\u093F \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0924\u093E \u0939\u0948:',
      difficulty: req.difficulty,
      language: req.language || "Hindi",
      type: "word_match",
      prompt: '"\u092E" \u0927\u094D\u0935\u0928\u093F \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0928\u0947 \u0935\u093E\u0932\u093E \u0936\u092C\u094D\u0926 \u0915\u094C\u0928-\u0938\u093E \u0939\u0948?',
      audioPrompt: "\u092E \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0928\u0947 \u0935\u093E\u0932\u093E \u0936\u092C\u094D\u0926 \u092A\u0939\u091A\u093E\u0928\u093F\u090F",
      items: [
        { id: "opt_fish", text: "\u092E\u091B\u0932\u0940", visual: "\u{1F41F}", isCorrect: true, feedbackHint: '\u092C\u0939\u0941\u0924 \u092C\u0922\u093C\u093F\u092F\u093E! \u092E-\u092E-\u092E\u091B\u0932\u0940 "\u092E" \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0924\u0940 \u0939\u0948! \u{1F680}' },
        { id: "opt_tree", text: "\u092A\u0947\u0921\u093C", visual: "\u{1F333}", isCorrect: false, feedbackHint: '\u092A\u0947\u0921\u093C "\u092A" \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0924\u093E \u0939\u0948\u0964 \u092E \u0938\u0947 \u092E\u091B\u0932\u0940 \u091A\u0941\u0928\u0947\u0902\u0964' },
        { id: "opt_star", text: "\u0924\u093E\u0930\u093E", visual: "\u2B50", isCorrect: false, feedbackHint: '\u0924\u093E\u0930\u093E "\u0924" \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0924\u093E \u0939\u0948\u0964' }
      ],
      stepByStepHint: "\u0939\u094B\u0902\u0920\u094B\u0902 \u0915\u094B \u092E\u093F\u0932\u093E\u0915\u0930 \u0917\u0941\u0928\u0917\u0941\u0928\u093E\u090F\u0902: \u092E\u092E\u094D\u092E\u092E... \u092E\u091B\u0932\u0940!"
    };
  }
  if (isOdia) {
    return {
      id: `act_ls_or_${Date.now()}`,
      skillId: "skill_letter_sounds_basic",
      title: "\u0B05\u0B15\u0B4D\u0B37\u0B30 \u0B27\u0B4D\u0B71\u0B28\u0B3F \u0B2E\u0B47\u0B33 \u{1F981}",
      instruction: '\u0B15\u0B47\u0B09\u0B01 \u0B36\u0B2C\u0B4D\u0B26\u0B1F\u0B3F "\u0B2E" \u0B27\u0B4D\u0B71\u0B28\u0B3F\u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B47\u0B09\u0B1B\u0B3F:',
      difficulty: req.difficulty,
      language: req.language || "Odia",
      type: "word_match",
      prompt: '"\u0B2E" \u0B27\u0B4D\u0B71\u0B28\u0B3F\u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B47\u0B09\u0B25\u0B3F\u0B2C\u0B3E \u0B36\u0B2C\u0B4D\u0B26\u0B1F\u0B3F \u0B15\u0B47\u0B09\u0B01\u0B1F\u0B3F?',
      audioPrompt: "\u0B2E \u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B47\u0B09\u0B25\u0B3F\u0B2C\u0B3E \u0B36\u0B2C\u0B4D\u0B26 \u0B2C\u0B3E\u0B1B\u0B28\u0B4D\u0B24\u0B41",
      items: [
        { id: "opt_fish", text: "\u0B2E\u0B3E\u0B1B", visual: "\u{1F41F}", isCorrect: true, feedbackHint: '\u0B05\u0B24\u0B3F \u0B09\u0B24\u0B4D\u0B24\u0B2E! \u0B2E-\u0B2E-\u0B2E\u0B3E\u0B1B "\u0B2E" \u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B41\u0B0F! \u{1F680}' },
        { id: "opt_tree", text: "\u0B17\u0B1B", visual: "\u{1F333}", isCorrect: false, feedbackHint: '\u0B17\u0B1B "\u0B17" \u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B41\u0B0F\u0964' },
        { id: "opt_star", text: "\u0B24\u0B3E\u0B30\u0B3E", visual: "\u2B50", isCorrect: false, feedbackHint: '\u0B24\u0B3E\u0B30\u0B3E "\u0B24" \u0B30\u0B41 \u0B06\u0B30\u0B2E\u0B4D\u0B2D \u0B39\u0B41\u0B0F\u0964' }
      ],
      stepByStepHint: "\u0B13\u0B20 \u0B2F\u0B4B\u0B21\u0B3C\u0B3F \u0B09\u0B1A\u0B4D\u0B1A\u0B3E\u0B30\u0B23 \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41: \u0B2E... \u0B2E\u0B3E\u0B1B!"
    };
  }
  if (isPunjabi) {
    return {
      id: `act_ls_pa_${Date.now()}`,
      skillId: "skill_letter_sounds_basic",
      title: "\u0A05\u0A71\u0A16\u0A30 \u0A27\u0A41\u0A28\u0A40 \u0A2E\u0A47\u0A32 \u{1F981}",
      instruction: '\u0A15\u0A3F\u0A39\u0A5C\u0A3E \u0A38\u0A3C\u0A2C\u0A26 "\u0A2E" \u0A27\u0A41\u0A28\u0A40 \u0A28\u0A3E\u0A32 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A39\u0A41\u0A70\u0A26\u0A3E \u0A39\u0A48:',
      difficulty: req.difficulty,
      language: req.language || "Punjabi",
      type: "word_match",
      prompt: '"\u0A2E" \u0A27\u0A41\u0A28\u0A40 \u0A28\u0A3E\u0A32 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A39\u0A4B\u0A23 \u0A35\u0A3E\u0A32\u0A3E \u0A38\u0A3C\u0A2C\u0A26 \u0A15\u0A3F\u0A39\u0A5C\u0A3E \u0A39\u0A48?',
      audioPrompt: "\u0A2E \u0A28\u0A3E\u0A32 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A39\u0A4B\u0A23 \u0A35\u0A3E\u0A32\u0A3E \u0A38\u0A3C\u0A2C\u0A26 \u0A1A\u0A41\u0A23\u0A4B",
      items: [
        { id: "opt_fish", text: "\u0A2E\u0A71\u0A1B\u0A40", visual: "\u{1F41F}", isCorrect: true, feedbackHint: '\u0A2C\u0A39\u0A41\u0A24 \u0A35\u0A27\u0A40\u0A06! \u0A2E-\u0A2E-\u0A2E\u0A71\u0A1B\u0A40 "\u0A2E" \u0A28\u0A3E\u0A32 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A39\u0A41\u0A70\u0A26\u0A40 \u0A39\u0A48! \u{1F680}' },
        { id: "opt_tree", text: "\u0A30\u0A41\u0A71\u0A16", visual: "\u{1F333}", isCorrect: false, feedbackHint: '\u0A30\u0A41\u0A71\u0A16 "\u0A30" \u0A28\u0A3E\u0A32 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A39\u0A41\u0A70\u0A26\u0A3E \u0A39\u0A48\u0964' },
        { id: "opt_star", text: "\u0A24\u0A3E\u0A30\u0A3E", visual: "\u2B50", isCorrect: false, feedbackHint: '\u0A24\u0A3E\u0A30\u0A3E "\u0A24" \u0A28\u0A3E\u0A32 \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A39\u0A41\u0A70\u0A26\u0A3E \u0A39\u0A48\u0964' }
      ],
      stepByStepHint: "\u0A39\u0A4C\u0A32\u0A40 \u0A2C\u0A4B\u0A32\u0A4B: \u0A2E... \u0A2E\u0A71\u0A1B\u0A40!"
    };
  }
  if (isTamil) {
    return {
      id: `act_ls_ta_${Date.now()}`,
      skillId: "skill_letter_sounds_basic",
      title: "\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1 \u0B92\u0BB2\u0BBF \u0BAA\u0BCA\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BAE\u0BCD \u{1F981}",
      instruction: '\u0B8E\u0BA8\u0BCD\u0BA4\u0B9A\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD "\u0BAE" \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1:',
      difficulty: req.difficulty,
      language: req.language || "Tamil",
      type: "word_match",
      prompt: '"\u0BAE" \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0BAE\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD \u0B8E\u0BA4\u0BC1?',
      audioPrompt: "\u0BAE \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0BAE\u0BCD \u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC8\u0BA4\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD",
      items: [
        { id: "opt_fish", text: "\u0BAE\u0BC0\u0BA9\u0BCD", visual: "\u{1F41F}", isCorrect: true, feedbackHint: '\u0B85\u0BB0\u0BC1\u0BAE\u0BC8! \u0BAE-\u0BAE\u0BC0\u0BA9\u0BCD "\u0BAE" \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1! \u{1F680}' },
        { id: "opt_house", text: "\u0BB5\u0BC0\u0B9F\u0BC1", visual: "\u{1F3E0}", isCorrect: false, feedbackHint: '\u0BB5\u0BC0\u0B9F\u0BC1 "\u0BB5\u0BC0" \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1. \u0BAE-\u0BAE\u0BC0\u0BA9\u0BCD \u0BA4\u0BC7\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.' },
        { id: "opt_bird", text: "\u0BAA\u0BB1\u0BB5\u0BC8", visual: "\u{1F426}", isCorrect: false, feedbackHint: '\u0BAA\u0BB1\u0BB5\u0BC8 "\u0BAA" \u0B92\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1.' }
      ],
      stepByStepHint: "\u0B89\u0BA4\u0B9F\u0BC1\u0B95\u0BB3\u0BC8 \u0B92\u0B9F\u0BCD\u0B9F\u0BB5\u0BC8\u0BA4\u0BCD\u0BA4\u0BC1 \u0B92\u0BB2\u0BBF\u0BAF\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD: \u0BAE\u0BCD... \u0BAE\u0BC0\u0BA9\u0BCD!"
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
      { id: "opt_tree", text: "Tree", visual: "\u{1F333}", isCorrect: false, feedbackHint: "Tree starts with T." }
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
- Use the authentic native script for the chosen language (Devanagari for Hindi, Odia script for Odia, Gurmukhi for Punjabi, Tamil script for Tamil, Latin script for English).
- Do not transliterate non-English words into English alphabet; use native script characters.
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
            temperature: 0.3,
            maxOutputTokens: 1024,
            responseMimeType: "application/json"
          }
        }),
        signal: controller.signal
      });
      if (!res.ok) {
        continue;
      }
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;
      let cleanJson = rawText.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      const parsed = JSON.parse(cleanJson);
      const validation = validateActivityContent(parsed, req.language);
      if (validation.valid && validation.sanitized) {
        clearTimeout(timeoutId);
        return validation.sanitized;
      }
    } catch {
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
