/**
 * The journey's shape.
 *
 * Two facts live here rather than inside a component: the order the scenes are walked in, and the
 * lookup that pairs a scene with its copy. Both are read by the stage *and* by the trail rail, and
 * a rail whose order disagrees with the stage's is a navigation bug no type would catch.
 */
import { SCENES } from "./art/contract.mjs";

/**
 * The five scenes of the walk, in order.
 *
 * `edge` is deliberately absent. It is declared in the same art contract and drawn to the same
 * geometry, but it is the contact page — not a stop on this page. Listing the journey's scenes
 * explicitly is what keeps the two from drifting into each other.
 */
export const JOURNEY_SCENES = [
  "entrance",
  "commons",
  "quarters",
  "kitchen",
  "fire",
] as const;

export type JourneySceneKey = (typeof JOURNEY_SCENES)[number];

/**
 * Scenes that are built to the same contract and drawn to the same geometry, but live on their own
 * page instead of on the walk. `edge` is the contact page — the threshold, where outsiders are
 * received.
 */
export const PAGE_SCENES = ["edge"] as const;

export type SceneKey = JourneySceneKey | (typeof PAGE_SCENES)[number];

/**
 * Every scene must exist in the art contract, because `SceneArt` throws on an unknown key and the
 * surface each section declares is read from there. Checking it here means a typo fails at the first
 * import rather than part-way through rendering a page.
 */
for (const key of [...JOURNEY_SCENES, ...PAGE_SCENES]) {
  if (!(key in SCENES)) {
    throw new Error(
      `Scene "${key}" is not declared in src/lib/art/contract.mjs. ` +
        `Known scenes: ${Object.keys(SCENES).join(", ")}.`,
    );
  }
}

/** One scene's copy, as it is written in the per-locale site singleton. */
export interface SceneCopy {
  key: string;
  eyebrow?: string;
  title: string;
  intro?: string;
}

/**
 * The copy for one scene, or a build failure naming exactly what is missing.
 *
 * `scenes:` in the site singleton has a `[]` default, so a locale that simply forgot the block
 * would otherwise render five untitled sections and still build green.
 */
export function sceneCopy(scenes: SceneCopy[], key: SceneKey): SceneCopy {
  const found = scenes.find((scene) => scene.key === key);
  if (!found) {
    throw new Error(
      `No copy for scene "${key}". Add it under "scenes:" in ` +
        `src/content/site/<locale>.yaml. Present: ` +
        `${scenes.map((s) => s.key).join(", ") || "(none)"}.`,
    );
  }
  return found;
}

/** Every scene in walking order, paired with its copy. */
export function journeyScenes(
  scenes: SceneCopy[],
): Array<{ key: JourneySceneKey; copy: SceneCopy }> {
  return JOURNEY_SCENES.map((key) => ({ key, copy: sceneCopy(scenes, key) }));
}

/**
 * `1` → `"01"`. The traverse counters are live text so they translate and can be read aloud; they
 * are never drawn into the art, which is why the art contract bans `<text>`.
 */
export function pad(n: number): string {
  return String(n).padStart(2, "0");
}
