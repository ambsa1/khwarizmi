// Reads the curriculum data straight from ../content (validated by `npm run validate`).
import worldsDoc from '../../../content/worlds/worlds.json';
import coding from '../../../content/skills/coding.json';
import techai from '../../../content/skills/techai.json';
import english from '../../../content/skills/english.json';
import brain from '../../../content/skills/brain.json';
import explorer from '../../../content/skills/explorer.json';

export type Skill = { id: string; title: { ar: string; en?: string }; zone: string; ages: { min: number; max?: number } };
export type World = (typeof worldsDoc.worlds)[number];

export const WORLDS = worldsDoc.worlds;
export const worldById = (id: string) => WORLDS.find(w => w.id === id)!;

const TREES: Record<string, { skills: Skill[] }> = { kassala: coding, mogran: techai, meroe: english, suakin: brain, saqiya: explorer };

/** Skills of a world in path order: zone order first, then the order inside the tree file. */
export function worldSkills(worldId: string): Skill[] {
  const w = worldById(worldId);
  const tree = TREES[worldId];
  if (!tree) return [];
  const zoneOrder = new Map(w.zones.map(z => [z.id, z.order]));
  return tree.skills.slice().sort((a, b) => (zoneOrder.get(a.zone)! - zoneOrder.get(b.zone)!));
}

export function skillCount(worldId: string) {
  return worldId === 'marra' ? 0 : worldSkills(worldId).length;
}

/** Short world names for chips, cards and the top bar. */
export const SHORT_NAME: Record<string, string> = { kassala: 'كسلا', mogran: 'المقرن', meroe: 'مروي', suakin: 'سواكن', marra: 'جبل مرّة', saqiya: 'الساقية' };
