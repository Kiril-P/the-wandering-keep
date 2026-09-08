/** Original, slow D-major / B-minor palette shared by music and action sounds. */
export const CHORDS = [
    [50, 57, 61, 64, 69], // Dmaj9
    [43, 54, 57, 62, 66], // Gmaj9
    [47, 54, 57, 61, 64], // Bm11
    [45, 52, 57, 59, 62], // Asus2/4
] as const;
export const PHRASE_SECONDS = 16;
export const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export type AudioPreferences = { muted: boolean; music: number; ambience: number; effects: number };
export const DEFAULT_AUDIO: AudioPreferences = { muted: false, music: .55, ambience: .65, effects: .6 };
export function audioPreferences(value: unknown): AudioPreferences {
    const data = value && typeof value === 'object' ? value as Partial<AudioPreferences> : {};
    const volume = (key: 'music' | 'ambience' | 'effects') => typeof data[key] === 'number' && Number.isFinite(data[key]) ? Math.max(0, Math.min(1, data[key]!)) : DEFAULT_AUDIO[key];
    return { muted: data.muted === true, music: volume('music'), ambience: volume('ambience'), effects: volume('effects') };
}
export function phraseNotes(phrase: number, region: number) {
    const chord = CHORDS[(phrase + (region > 1.5 ? 2 : 0)) % CHORDS.length];
    // Alternate a small question and answer, then leave a phrase of breathing room.
    const motif = phrase % 3 === 2 ? [2, 1] : phrase % 2 ? [3, 2, 1, 2] : [1, 2, 4, 3, 2];
    return { chord, melody: motif.map((degree, i) => ({ note: chord[degree] + 12, offset: 1.7 + i * 2.65, strength: i === 0 ? 1 : .72 })) };
}
