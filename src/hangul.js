// 한글 유니코드 계산 기준값입니다.
// 완성형 한글 음절은 AC00(가)부터 D7A3(힣)까지 순서대로 배치됩니다.
export const HANGUL_BASE = 0xac00;
export const HANGUL_END = 0xd7a3;
export const INITIAL_COUNT = 19;
export const MEDIAL_COUNT = 21;
export const FINAL_COUNT = 28;
export const SYLLABLE_BLOCK_SIZE = MEDIAL_COUNT * FINAL_COUNT;

export const INITIALS = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

export const MEDIALS = [
  "ㅏ",
  "ㅐ",
  "ㅑ",
  "ㅒ",
  "ㅓ",
  "ㅔ",
  "ㅕ",
  "ㅖ",
  "ㅗ",
  "ㅘ",
  "ㅙ",
  "ㅚ",
  "ㅛ",
  "ㅜ",
  "ㅝ",
  "ㅞ",
  "ㅟ",
  "ㅠ",
  "ㅡ",
  "ㅢ",
  "ㅣ",
];

export const FINALS = [
  "",
  "ㄱ",
  "ㄲ",
  "ㄳ",
  "ㄴ",
  "ㄵ",
  "ㄶ",
  "ㄷ",
  "ㄹ",
  "ㄺ",
  "ㄻ",
  "ㄼ",
  "ㄽ",
  "ㄾ",
  "ㄿ",
  "ㅀ",
  "ㅁ",
  "ㅂ",
  "ㅄ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

export function isHangulSyllable(char) {
  if (!char || char.length === 0) return false;
  const code = char.charCodeAt(0);
  return code >= HANGUL_BASE && code <= HANGUL_END;
}

export function decomposeHangul(syllable) {
  if (!isHangulSyllable(syllable)) return null;

  // 유니코드 표에서 몇 번째 한글 음절인지 계산한 뒤,
  // 588개 단위는 초성, 28개 단위는 중성, 나머지는 종성으로 해석합니다.
  const offset = syllable.charCodeAt(0) - HANGUL_BASE;
  const initialIndex = Math.floor(offset / SYLLABLE_BLOCK_SIZE);
  const medialIndex = Math.floor((offset % SYLLABLE_BLOCK_SIZE) / FINAL_COUNT);
  const finalIndex = offset % FINAL_COUNT;

  return {
    char: syllable,
    initial: INITIALS[initialIndex],
    medial: MEDIALS[medialIndex],
    final: FINALS[finalIndex],
    initialIndex,
    medialIndex,
    finalIndex,
  };
}

export function composeHangul(initial, medial, final = "") {
  const initialIndex = INITIALS.indexOf(initial);
  const medialIndex = MEDIALS.indexOf(medial);
  const finalIndex = FINALS.indexOf(final);

  if (initialIndex < 0 || medialIndex < 0 || finalIndex < 0) {
    throw new Error("초성, 중성, 종성 값이 올바르지 않습니다.");
  }

  const code =
    HANGUL_BASE +
    SYLLABLE_BLOCK_SIZE * initialIndex +
    FINAL_COUNT * medialIndex +
    finalIndex;

  return String.fromCharCode(code);
}

export function composeFromParts(parts) {
  return composeHangul(parts.initial, parts.medial, parts.final);
}
