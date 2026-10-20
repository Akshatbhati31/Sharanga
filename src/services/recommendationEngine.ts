import type {
  AdaptiveRecommendation,
  ChildSkillState,
  ActivityDifficulty,
  RecommendationType,
} from '../types/adaptive';
import { SKILL_REGISTRY, getSkillDefinition } from './skillModel';
import type { ChildProfile } from '../types/auth';

export class RecommendationEngine {
  private static instance: RecommendationEngine;

  private constructor() {}

  public static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }

  /**
   * Generates a ranked list of adaptive recommendations tailored to a child's skill states.
   */
  public generateRecommendations(
    child: ChildProfile,
    skillStates: Record<string, ChildSkillState>,
    lastAttemptedActivityId?: string
  ): AdaptiveRecommendation[] {
    const recommendations: AdaptiveRecommendation[] = [];
    const language = child.preferredLanguage || 'English';

    // 1. Identify Priority Remediation Skills (consecutive struggles or high mistake count)
    const struggleSkills = Object.values(skillStates)
      .filter(s => s.consecutiveStruggles >= 2 || (s.missedPatterns.length >= 2 && s.estimatedMastery < 0.65))
      .sort((a, b) => b.consecutiveStruggles - a.consecutiveStruggles);

    // 2. Identify Skills Ready to Practice (prerequisites met, not yet fully mastered)
    const candidateSkills = SKILL_REGISTRY.filter(skill => {
      // Must support child's language
      if (!skill.languages.includes(language as any) && !skill.languages.includes('English')) {
        return false;
      }

      const state = skillStates[skill.id];
      // If already fully mastered with high confidence, save for spaced review instead
      if (state && state.estimatedMastery >= 0.85 && state.confidence >= 0.7) {
        return false;
      }

      // Check prerequisites
      const prerequisitesMet = skill.prerequisites.every(preId => {
        const preState = skillStates[preId];
        return preState && preState.estimatedMastery >= 0.6; // Prerequisite baseline
      });

      return prerequisitesMet;
    });

    // 3. Identify Skills for Spaced Review (mastered skills not practiced recently)
    const now = Date.now();
    const reviewSkills = Object.values(skillStates)
      .filter(s => {
        if (s.estimatedMastery < 0.75 || s.confidence < 0.5) return false;
        if (!s.lastPracticed) return false;
        const daysSince = (now - new Date(s.lastPracticed).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince >= 3; // review after 3+ days
      })
      .sort((a, b) => (new Date(a.lastPracticed || 0).getTime()) - (new Date(b.lastPracticed || 0).getTime()));

    // Rule A: If struggling with a skill, recommend targeted remediation with supportive hints or worked example
    if (struggleSkills.length > 0) {
      const topStruggle = struggleSkills[0];
      const def = getSkillDefinition(topStruggle.skillId);
      if (def) {
        const missedDetail = topStruggle.missedPatterns.length > 0
          ? ` focusing on ${topStruggle.missedPatterns.slice(-2).join(' and ')}`
          : '';

        // Avoid serving the exact same activity if it just failed
        const altActivity = def.suggestedActivities.find(act => act !== lastAttemptedActivityId)
          || def.suggestedActivities[0];

        recommendations.push({
          id: `rec_remed_${def.id}_${Date.now()}`,
          activityId: altActivity,
          targetSkillId: def.id,
          skillName: def.name,
          category: def.category,
          title: `Friendly Practice: ${def.name}`,
          description: `Gentle step-by-step guidance${missedDetail} with supportive hints.`,
          learningObjective: `Reinforce ${def.name.toLowerCase()} with visual anchors and scaffolded hints.`,
          difficulty: 'beginner',
          estimatedMinutes: 4,
          prerequisites: def.prerequisites,
          recommendationType: 'remediation',
          reason: `Recommended because ${child.name} encountered challenge with ${def.name.toLowerCase()} recently. We are providing supportive visual clues and reduced difficulty.`,
          pedagogicalRationale: `Adaptive remediation: Consecutive struggle score = ${topStruggle.consecutiveStruggles}. Providing scaffolded hints and lowering cognitive load before advancing.`,
          actionIcon: '🌱',
          actionBg: '#fff2eb',
        });
      }
    }

    // Rule B: Introduce new skill or continue practicing current progression
    for (const skill of candidateSkills) {
      if (recommendations.some(r => r.targetSkillId === skill.id)) continue;
      const state = skillStates[skill.id];

      const difficulty: ActivityDifficulty = !state || state.currentLevel <= 1
        ? 'beginner'
        : state.currentLevel === 2
        ? 'intermediate'
        : 'advanced';

      const isNew = !state || state.attemptsCount === 0;
      const isProvisional = !state || state.isProvisional;
      const recType: RecommendationType = isNew || isProvisional ? (isNew ? 'baseline' : 'new') : 'new';

      let reason = `Recommended as the next natural step in ${child.name}'s reading path.`;
      if (isNew) {
        reason = `Let's explore ${skill.name}! A brand new adventure designed for ${child.grade}.`;
      } else if (state && state.consecutiveSuccesses >= 2) {
        reason = `Great momentum! ${child.name} has demonstrated steady accuracy, so we are stepping up the challenge.`;
      }

      const selectedActivity = skill.suggestedActivities[0] || 'act_general_practice';

      recommendations.push({
        id: `rec_prog_${skill.id}_${recommendations.length}`,
        activityId: selectedActivity,
        targetSkillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        title: skill.name,
        description: skill.description,
        learningObjective: `Develop mastery in ${skill.name.toLowerCase()} through interactive play.`,
        difficulty,
        estimatedMinutes: 5,
        prerequisites: skill.prerequisites,
        recommendationType: recType,
        reason,
        pedagogicalRationale: `Progressive mastery: Current level ${state?.currentLevel || 1}, accuracy ${Math.round((state?.recentAccuracy || 0) * 100)}%, prerequisites verified.`,
        actionIcon: skill.category === 'confused_letters' ? '🔤' : skill.category === 'sound_blending' ? '🧩' : '🎧',
        actionBg: skill.category === 'confused_letters' ? '#fff1d2' : '#e8f3ff',
      });

      if (recommendations.length >= 3) break;
    }

    // Rule C: Add a Spaced Review activity to consolidate previous learning
    if (reviewSkills.length > 0 && recommendations.length < 4) {
      const revSkill = reviewSkills[0];
      const def = getSkillDefinition(revSkill.skillId);
      if (def) {
        recommendations.push({
          id: `rec_rev_${def.id}_${Date.now()}`,
          activityId: def.suggestedActivities[0] || 'act_review',
          targetSkillId: def.id,
          skillName: def.name,
          category: def.category,
          title: `Quick Memory Win: ${def.name}`,
          description: `A fun 3-minute revisit to keep previously mastered sounds sharp!`,
          learningObjective: `Strengthen long-term memory retrieval of ${def.name.toLowerCase()}.`,
          difficulty: 'intermediate',
          estimatedMinutes: 3,
          prerequisites: def.prerequisites,
          recommendationType: 'review',
          reason: `${child.name} mastered this earlier! Revisiting it every few days helps turn reading wins into permanent memory.`,
          pedagogicalRationale: `Spaced repetition: Mastered skill not practiced in >3 days. Refreshing retrieval pathways.`,
          actionIcon: '✨',
          actionBg: '#f3edff',
        });
      }
    }

    // Baseline fallback if child has zero history or all candidates exhausted
    if (recommendations.length === 0) {
      const defaultSkill = SKILL_REGISTRY[0]; // Letter-Sound Association
      recommendations.push({
        id: `rec_default_baseline_${Date.now()}`,
        activityId: defaultSkill.suggestedActivities[0],
        targetSkillId: defaultSkill.id,
        skillName: defaultSkill.name,
        category: defaultSkill.category,
        title: `Welcome Adventure: ${defaultSkill.name}`,
        description: 'A playful first challenge to discover your learning style.',
        learningObjective: 'Establish an initial baseline in basic letter sounds.',
        difficulty: 'beginner',
        estimatedMinutes: 3,
        prerequisites: [],
        recommendationType: 'baseline',
        reason: `Welcome to DyslexiMate! We start with fun sound discovery to personalize your upcoming learning journey.`,
        pedagogicalRationale: 'Provisional baseline assessment: establishing initial learner profile.',
        actionIcon: '🌟',
        actionBg: '#e8f5ef',
      });
    }

    return recommendations;
  }
}
