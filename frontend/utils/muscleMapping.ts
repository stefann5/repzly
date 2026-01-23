// Mapping from system muscle names to body highlighter slugs
// @teambuildr/react-native-body-highlighter uses specific slugs with left/right variants

export type BodySide = "front" | "back";

interface MuscleMapping {
  slugs: string[]; // Array of slugs to highlight (left and right)
  side: BodySide | "both";
}

// Map system muscle names (case-insensitive) to body highlighter slugs
// The @teambuildr version uses very specific slugs like "chest-left", "chest-right", etc.
const muscleToSlugMap: Record<string, MuscleMapping> = {
  // Head & Neck
  neck: {
    slugs: ["neck-left-front", "neck-right-front", "neck-left-back", "neck-right-back"],
    side: "both",
  },
  head: {
    slugs: ["head-front", "head-back"],
    side: "both",
  },

  // Shoulders - deltoids
  "front deltoid": {
    slugs: ["deltoids-left-front", "deltoids-right-front"],
    side: "front",
  },
  "front deltoids": {
    slugs: ["deltoids-left-front", "deltoids-right-front"],
    side: "front",
  },
  "side deltoid": {
    slugs: ["deltoids-left-front", "deltoids-right-front"],
    side: "front",
  },
  "side deltoids": {
    slugs: ["deltoids-left-front", "deltoids-right-front"],
    side: "front",
  },
  "rear deltoid": {
    slugs: ["deltoids-left-back", "deltoids-right-back"],
    side: "back",
  },
  "rear deltoids": {
    slugs: ["deltoids-left-back", "deltoids-right-back"],
    side: "back",
  },
  deltoids: {
    slugs: ["deltoids-left-front", "deltoids-right-front"],
    side: "front",
  },
  shoulders: {
    slugs: ["deltoids-left-front", "deltoids-right-front"],
    side: "front",
  },

  // Arms
  triceps: {
    slugs: ["triceps-left-front", "triceps-right-front", "triceps-left-back", "triceps-right-back"],
    side: "both",
  },
  tricep: {
    slugs: ["triceps-left-front", "triceps-right-front", "triceps-left-back", "triceps-right-back"],
    side: "both",
  },
  biceps: {
    slugs: ["biceps-left", "biceps-right"],
    side: "front",
  },
  bicep: {
    slugs: ["biceps-left", "biceps-right"],
    side: "front",
  },
  forearms: {
    slugs: ["forearm-left-front", "forearm-right-front", "forearm-left-back", "forearm-right-back"],
    side: "both",
  },
  forearm: {
    slugs: ["forearm-left-front", "forearm-right-front", "forearm-left-back", "forearm-right-back"],
    side: "both",
  },

  // Torso - Front
  chest: {
    slugs: ["chest-left", "chest-right"],
    side: "front",
  },
  pectorals: {
    slugs: ["chest-left", "chest-right"],
    side: "front",
  },
  pecs: {
    slugs: ["chest-left", "chest-right"],
    side: "front",
  },
  abs: {
    slugs: ["abs-upper", "abs-lower"],
    side: "front",
  },
  abdominals: {
    slugs: ["abs-upper", "abs-lower"],
    side: "front",
  },
  obliques: {
    slugs: ["obliques-left", "obliques-right"],
    side: "front",
  },
  oblique: {
    slugs: ["obliques-left", "obliques-right"],
    side: "front",
  },

  // Torso - Back
  trapezius: {
    slugs: ["trapezius-left-front", "trapezius-right-front", "trapezius-left-back", "trapezius-right-back"],
    side: "both",
  },
  traps: {
    slugs: ["trapezius-left-front", "trapezius-right-front", "trapezius-left-back", "trapezius-right-back"],
    side: "both",
  },
  lats: {
    slugs: ["upper-back-left", "upper-back-right"],
    side: "back",
  },
  latissimus: {
    slugs: ["upper-back-left", "upper-back-right"],
    side: "back",
  },
  "upper back": {
    slugs: ["upper-back-left", "upper-back-right"],
    side: "back",
  },
  "lower back": {
    slugs: ["lower-back-left", "lower-back-right"],
    side: "back",
  },

  // Legs - Front
  quads: {
    slugs: ["quadriceps-left", "quadriceps-right"],
    side: "front",
  },
  quadriceps: {
    slugs: ["quadriceps-left", "quadriceps-right"],
    side: "front",
  },
  tibialis: {
    slugs: ["tibialis-left", "tibialis-right"],
    side: "front",
  },
  adductors: {
    slugs: ["adductors-left-front", "adductors-right-front", "adductors-left-back", "adductors-right-back"],
    side: "both",
  },
  adductor: {
    slugs: ["adductors-left-front", "adductors-right-front", "adductors-left-back", "adductors-right-back"],
    side: "both",
  },
  // Note: abductors not available in @teambuildr version, map to hips
  abductors: {
    slugs: ["hips-left", "hips-right"],
    side: "back",
  },
  abductor: {
    slugs: ["hips-left", "hips-right"],
    side: "back",
  },

  // Legs - Back
  glutes: {
    slugs: ["gluteal-left", "gluteal-right"],
    side: "back",
  },
  gluteal: {
    slugs: ["gluteal-left", "gluteal-right"],
    side: "back",
  },
  gluteus: {
    slugs: ["gluteal-left", "gluteal-right"],
    side: "back",
  },
  hamstrings: {
    slugs: ["hamstring-left", "hamstring-right"],
    side: "back",
  },
  hamstring: {
    slugs: ["hamstring-left", "hamstring-right"],
    side: "back",
  },
  calves: {
    slugs: ["calves-left-front", "calves-right-front", "calves-left-back", "calves-right-back"],
    side: "both",
  },
  calf: {
    slugs: ["calves-left-front", "calves-right-front", "calves-left-back", "calves-right-back"],
    side: "both",
  },

  // Knees
  knees: {
    slugs: ["knees-left", "knees-right"],
    side: "front",
  },
  knee: {
    slugs: ["knees-left", "knees-right"],
    side: "front",
  },
};

export interface BodyPartData {
  slug: string;
  intensity: number;
  color: string;
}

/**
 * Convert system muscle name to body highlighter mapping
 */
export function getBodyHighlighterMapping(muscle: string): MuscleMapping | null {
  const normalized = muscle.toLowerCase().trim();
  return muscleToSlugMap[normalized] || null;
}

/**
 * Convert analytics data to body highlighter format
 * Creates entries for each slug (left/right variants) with the same intensity
 */
export function convertToBodyHighlighterData(
  analyticsData: Array<{ muscle: string; total_intensity: number }>,
  side: BodySide
): BodyPartData[] {
  const intensityBySlug: Record<string, number> = {};
  let maxIntensity = 0;

  // First pass: aggregate intensities by slug
  for (const item of analyticsData) {
    const mapping = getBodyHighlighterMapping(item.muscle);
    if (!mapping) {
      console.warn(`No mapping found for muscle: "${item.muscle}"`);
      continue;
    }

    // Only include muscles visible on this side
    if (mapping.side !== "both" && mapping.side !== side) continue;

    // Filter slugs to only include those for the current side
    const relevantSlugs = mapping.slugs.filter((slug) => {
      if (mapping.side === "both") {
        // For "both" muscles, filter by slug name containing front/back
        if (side === "front") {
          return slug.includes("-front") || (!slug.includes("-back") && !slug.includes("-front"));
        } else {
          return slug.includes("-back") || (!slug.includes("-back") && !slug.includes("-front"));
        }
      }
      return true;
    });

    for (const slug of relevantSlugs) {
      const currentIntensity = intensityBySlug[slug] || 0;
      const newIntensity = currentIntensity + item.total_intensity;
      intensityBySlug[slug] = newIntensity;

      if (newIntensity > maxIntensity) {
        maxIntensity = newIntensity;
      }
    }
  }

  // Second pass: normalize intensities to integer range for color display
  // Colors from light to dark blue based on intensity
  const colors = ["#60a5fa", "#3b82f6", "#1d4ed8"];
  const result: BodyPartData[] = [];
  for (const [slug, intensity] of Object.entries(intensityBySlug)) {
    if (intensity > 0) {
      // Normalize to 1-3 range for color selection
      const normalizedIntensity =
        maxIntensity > 0
          ? Math.max(1, Math.ceil((intensity / maxIntensity) * 3))
          : 1;
      const colorIndex = Math.min(normalizedIntensity - 1, colors.length - 1);
      result.push({
        slug,
        intensity: normalizedIntensity,
        color: colors[colorIndex],
      });
    }
  }

  return result;
}

/**
 * Get all supported muscle names for UI display
 */
export function getSupportedMuscles(): string[] {
  return Object.keys(muscleToSlugMap);
}
