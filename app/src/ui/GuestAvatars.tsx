// Twelve illustrated Sudanese children for guest mode (public/art/avatars/g*.webp, imported by tools/import-avatars.py):
// six boys and six girls in two age bands: young (kindergarten to grade 2) and older (grade 3 to 6). The new-player
// screen shows only the pictures that match the child's gender and band. Ids keep their place so saved guests keep theirs.

export type Band = 'young' | 'older';
export type Look = { id: string; gender: 'm' | 'f'; band: Band };
export const GUEST_AVATARS: Look[] = [
  { id: 'g1', gender: 'm', band: 'young' }, { id: 'g4', gender: 'm', band: 'young' }, { id: 'g2', gender: 'm', band: 'young' },
  { id: 'g9', gender: 'm', band: 'older' }, { id: 'g3', gender: 'm', band: 'older' }, { id: 'g10', gender: 'm', band: 'older' },
  { id: 'g5', gender: 'f', band: 'young' }, { id: 'g7', gender: 'f', band: 'young' }, { id: 'g6', gender: 'f', band: 'young' },
  { id: 'g12', gender: 'f', band: 'older' }, { id: 'g8', gender: 'f', band: 'older' }, { id: 'g11', gender: 'f', band: 'older' },
];
/** kindergarten and grades 1-2 are "young"; grades 3-6 "older" */
export const bandOf = (grade: number | null): Band => (grade == null || grade <= 2 ? 'young' : 'older');
export const avatarsFor = (gender: 'm' | 'f', band: Band) => GUEST_AVATARS.filter(a => a.gender === gender && a.band === band);
/** every picture of that gender (young first, then older), and which one starts in the middle for that grade:
 *  the middle picture of the child's own age band */
export function picturesFor(gender: 'm' | 'f', grade: number | null) {
  const all = GUEST_AVATARS.filter(a => a.gender === gender).sort((a, b) => Number(a.band === 'older') - Number(b.band === 'older'));
  const own = all.map((a, i) => (a.band === bandOf(grade) ? i : -1)).filter(i => i >= 0);
  return { ids: all.map(a => a.id), start: own[Math.floor(own.length / 2)] ?? 0 };
}

export const artUrl = (path: string) => import.meta.env.BASE_URL + 'art/' + path;

export function GuestAvatar({ id, size = 112 }: { id: string; size?: number }) {
  const l = GUEST_AVATARS.find(a => a.id === id) ?? GUEST_AVATARS[0];
  return (
    <img src={artUrl(`avatars/${l.id}.webp`)} width={size} height={size} alt={l.gender === 'f' ? 'صورة بنت' : 'صورة ولد'} draggable={false}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
  );
}
