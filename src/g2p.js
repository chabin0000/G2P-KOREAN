import { composeFromParts, decomposeHangul, isHangulSyllable } from "./hangul.js";

const LIMITATIONS = [
  "본 프로그램은 국어 음운 변동 학습용 규칙 기반 프로토타입입니다.",
  "완전한 한국어 G2P 시스템이 아니며, 형태소 분석과 예외 발음 사전은 포함하지 않습니다.",
  "단순 연음은 먹어, 밥이, 꽃이 같은 기본 사례만 처리하며 읽어, 값이, 닭이처럼 겹받침이 포함된 연음은 구현하지 않았습니다.",
];

const TEST_CASES = [
  { input: "국물", expected: "궁물", rule: "비음화" },
  { input: "밥물", expected: "밤물", rule: "비음화" },
  { input: "닫는", expected: "단는", rule: "비음화" },
  { input: "신라", expected: "실라", rule: "유음화" },
  { input: "난로", expected: "날로", rule: "유음화" },
  { input: "굳이", expected: "구지", rule: "구개음화" },
  { input: "같이", expected: "가치", rule: "구개음화" },
  { input: "국밥", expected: "국빱", rule: "된소리되기" },
  { input: "먹다", expected: "먹따", rule: "된소리되기" },
  { input: "먹어", expected: "머거", rule: "단순 연음" },
  { input: "밥이", expected: "바비", rule: "단순 연음" },
  { input: "꽃이", expected: "꼬치", rule: "단순 연음" },
];

const UNSUPPORTED_CASES = {
  읽어: {
    expected: "일거",
    category: "겹받침 연음",
    reason: "겹받침 ㄺ에서 어떤 자음이 앞 음절에 남고 어떤 자음이 뒤 음절 초성으로 이동하는지 판단해야 합니다.",
    improvement: "겹받침 분해 규칙과 자음군 단순화 규칙을 추가해야 합니다.",
  },
  값이: {
    expected: "갑씨",
    category: "자음군 단순화 + 된소리되기 + 연음",
    reason: "겹받침 ㅄ 처리, 된소리되기, 연음이 함께 작용하므로 단순 연음 규칙만으로 처리하기 어렵습니다.",
    improvement: "자음군 단순화, 된소리되기 적용 순서, 연음 규칙을 함께 고려해야 합니다.",
  },
  닭이: {
    expected: "달기",
    category: "겹받침 연음",
    reason: "겹받침 ㄺ의 발음 조건을 판단해야 하며, 현재 프로토타입은 단일 받침 연음만 지원합니다.",
    improvement: "ㄺ 같은 겹받침의 환경별 발음 규칙을 추가해야 합니다.",
  },
  색연필: {
    expected: "생년필",
    category: "ㄴ첨가 + 비음화",
    reason: "합성어 또는 형태소 경계에서 ㄴ첨가가 먼저 일어나고, 이후 비음화가 연속적으로 작용합니다.",
    improvement: "형태소 정보, ㄴ첨가 규칙, 규칙 적용 순서 처리가 필요합니다.",
  },
  좋아: {
    expected: "조아",
    category: "ㅎ탈락",
    reason: "모음으로 시작하는 뒤 음절 앞에서 ㅎ이 탈락하는 규칙이 필요합니다.",
    improvement: "ㅎ탈락 규칙을 추가해야 합니다.",
  },
  놓고: {
    expected: "노코",
    category: "거센소리되기",
    reason: "ㅎ과 ㄱ이 결합해 ㅋ으로 발음되는 거센소리되기 규칙이 필요합니다.",
    improvement: "ㅎ 관련 규칙과 거센소리되기 규칙을 추가해야 합니다.",
  },
};

const IGNORED_INPUT_PATTERN = /[\s.,!?;:'"“”‘’()[\]{}<>《》〈〉·~\-_/\\|@#$%^&*=+]/gu;
const NASAL_TARGET_INITIALS = new Set(["ㄴ", "ㅁ"]);
const G_FINALS = new Set(["ㄱ", "ㄲ", "ㅋ", "ㄳ", "ㄺ"]);
const D_FINALS = new Set(["ㄷ", "ㅅ", "ㅆ", "ㅈ", "ㅊ", "ㅌ", "ㅎ"]);
const B_FINALS = new Set(["ㅂ", "ㅍ", "ㄼ", "ㄿ", "ㅄ"]);
const OBSTRUENT_FINALS = new Set([
  "ㄱ",
  "ㄲ",
  "ㅋ",
  "ㄳ",
  "ㄺ",
  "ㄷ",
  "ㅅ",
  "ㅆ",
  "ㅈ",
  "ㅊ",
  "ㅌ",
  "ㅎ",
  "ㅂ",
  "ㅍ",
  "ㄼ",
  "ㄿ",
  "ㅄ",
]);

const TENSE_INITIAL_MAP = {
  "ㄱ": "ㄲ",
  "ㄷ": "ㄸ",
  "ㅂ": "ㅃ",
  "ㅅ": "ㅆ",
  "ㅈ": "ㅉ",
};

const SIMPLE_LIAISON_INITIAL_MAP = {
  "ㄱ": "ㄱ",
  "ㄲ": "ㄲ",
  "ㄴ": "ㄴ",
  "ㄷ": "ㄷ",
  "ㄹ": "ㄹ",
  "ㅁ": "ㅁ",
  "ㅂ": "ㅂ",
  "ㅅ": "ㅅ",
  "ㅆ": "ㅆ",
  "ㅇ": "ㅇ",
  "ㅈ": "ㅈ",
  "ㅊ": "ㅊ",
  "ㅋ": "ㅋ",
  "ㅌ": "ㅌ",
  "ㅍ": "ㅍ",
  "ㅎ": "ㅎ",
};

export function normalizeInput(text) {
  return String(text ?? "").trim().replace(IGNORED_INPUT_PATTERN, "");
}

export function validateKoreanInput(rawText, normalizedText = normalizeInput(rawText)) {
  if (!String(rawText ?? "").trim()) {
    return { ok: false, message: "분석할 한국어 단어를 입력해 주세요." };
  }

  if (!normalizedText) {
    return { ok: false, message: "현재는 한국어 한글 입력만 지원합니다." };
  }

  const chars = [...normalizedText];
  if (!chars.every(isHangulSyllable)) {
    return { ok: false, message: "현재는 한국어 한글 입력만 지원합니다." };
  }

  return { ok: true, message: "" };
}

export function analyzePronunciation(text) {
  const inputText = String(text ?? "");
  const recognizedText = normalizeInput(inputText);
  const validation = validateKoreanInput(inputText, recognizedText);

  if (!validation.ok) {
    return {
      inputText,
      recognizedText,
      pronunciation: "",
      displayPronunciation: "",
      appliedRules: [],
      analysisSteps: [],
      limitations: LIMITATIONS,
      error: validation.message,
    };
  }

  const unsupportedCase = UNSUPPORTED_CASES[recognizedText];
  if (unsupportedCase) {
    return {
      inputText,
      recognizedText,
      pronunciation: "",
      displayPronunciation: "[미지원]",
      appliedRules: [
        {
          rule: "현재 프로토타입에서는 미지원",
          before: recognizedText,
          after: unsupportedCase.expected,
          explanation: `${unsupportedCase.category}: ${unsupportedCase.reason}`,
        },
      ],
      analysisSteps: [
        {
          rule: "오류 가능 사례",
          before: recognizedText,
          after: unsupportedCase.expected,
          explanation: `기대 발음은 [${unsupportedCase.expected}]이지만, ${unsupportedCase.improvement}`,
        },
      ],
      limitations: LIMITATIONS,
      unsupported: unsupportedCase,
      error: "",
    };
  }

  const syllables = [...recognizedText].map(decomposeHangul);
  const result = applyG2PRules(syllables);
  const pronunciation = syllablesToText(result.syllables);

  return {
    inputText,
    recognizedText,
    pronunciation,
    displayPronunciation: `[${pronunciation}]`,
    appliedRules: result.logs,
    analysisSteps: result.logs,
    limitations: LIMITATIONS,
    error: "",
  };
}

export function applyG2PRules(syllables) {
  const working = cloneSyllables(syllables);
  const logs = [];

  applyPalatalization(working, logs);
  applyNasalization(working, logs);
  applyLiquidization(working, logs);
  applyTensification(working, logs);
  applySimpleLiaison(working, logs);

  return { syllables: working, logs };
}

function applyPalatalization(syllables, logs) {
  for (let i = 0; i < syllables.length - 1; i += 1) {
    const current = syllables[i];
    const next = syllables[i + 1];

    // 제한적 구개음화: "굳이", "같이"처럼 뒤 음절이 '이'인 경우만 다룹니다.
    if (next.initial !== "ㅇ" || next.medial !== "ㅣ" || next.final !== "") continue;

    const before = syllablesToText(syllables);

    if (current.final === "ㄷ") {
      current.final = "";
      next.initial = "ㅈ";
      pushLog(
        logs,
        "구개음화",
        before,
        syllablesToText(syllables),
        "받침 ㄷ이 형식 형태소 '이'와 만나 ㅈ으로 바뀌었습니다.",
      );
    } else if (current.final === "ㅌ") {
      current.final = "";
      next.initial = "ㅊ";
      pushLog(
        logs,
        "구개음화",
        before,
        syllablesToText(syllables),
        "받침 ㅌ이 형식 형태소 '이'와 만나 ㅊ으로 바뀌었습니다.",
      );
    }
  }
}

function applyNasalization(syllables, logs) {
  for (let i = 0; i < syllables.length - 1; i += 1) {
    const current = syllables[i];
    const next = syllables[i + 1];
    if (!NASAL_TARGET_INITIALS.has(next.initial)) continue;

    const before = syllablesToText(syllables);
    const nextInitial = next.initial;

    if (G_FINALS.has(current.final)) {
      current.final = "ㅇ";
      pushLog(
        logs,
        "비음화",
        before,
        syllablesToText(syllables),
        `받침 ㄱ 계열 뒤에 비음 ${nextInitial}이 이어져 ㄱ 계열 받침이 ㅇ으로 바뀌었습니다.`,
      );
    } else if (D_FINALS.has(current.final)) {
      current.final = "ㄴ";
      pushLog(
        logs,
        "비음화",
        before,
        syllablesToText(syllables),
        `받침 ㄷ 계열 뒤에 비음 ${nextInitial}이 이어져 ㄷ 계열 받침이 ㄴ으로 바뀌었습니다.`,
      );
    } else if (B_FINALS.has(current.final)) {
      current.final = "ㅁ";
      pushLog(
        logs,
        "비음화",
        before,
        syllablesToText(syllables),
        `받침 ㅂ 계열 뒤에 비음 ${nextInitial}이 이어져 ㅂ 계열 받침이 ㅁ으로 바뀌었습니다.`,
      );
    }
  }
}

function applyLiquidization(syllables, logs) {
  for (let i = 0; i < syllables.length - 1; i += 1) {
    const current = syllables[i];
    const next = syllables[i + 1];
    const before = syllablesToText(syllables);

    if (current.final === "ㄴ" && next.initial === "ㄹ") {
      current.final = "ㄹ";
      pushLog(
        logs,
        "유음화",
        before,
        syllablesToText(syllables),
        "받침 ㄴ 뒤에 유음 ㄹ이 이어져 ㄴ이 ㄹ로 바뀌었습니다.",
      );
    } else if (current.final === "ㄹ" && next.initial === "ㄴ") {
      next.initial = "ㄹ";
      pushLog(
        logs,
        "유음화",
        before,
        syllablesToText(syllables),
        "받침 ㄹ 뒤에 ㄴ이 이어져 뒤 음절의 ㄴ이 ㄹ로 바뀌었습니다.",
      );
    }
  }
}

function applyTensification(syllables, logs) {
  for (let i = 0; i < syllables.length - 1; i += 1) {
    const current = syllables[i];
    const next = syllables[i + 1];
    const originalInitial = next.initial;
    const tenseInitial = TENSE_INITIAL_MAP[originalInitial];

    if (!OBSTRUENT_FINALS.has(current.final) || !tenseInitial) continue;

    const before = syllablesToText(syllables);
    next.initial = tenseInitial;
    pushLog(
      logs,
      "된소리되기",
      before,
      syllablesToText(syllables),
      `장애음 받침 뒤의 예사소리 ${originalInitial}이 된소리 ${tenseInitial}으로 바뀌었습니다.`,
    );
  }
}

function applySimpleLiaison(syllables, logs) {
  for (let i = 0; i < syllables.length - 1; i += 1) {
    const current = syllables[i];
    const next = syllables[i + 1];
    const movedInitial = SIMPLE_LIAISON_INITIAL_MAP[current.final];

    // 단순 연음: 소리값이 없는 초성 ㅇ 앞에서 앞 음절 받침을 뒤 음절 초성으로 옮깁니다.
    // 겹받침과 형태소 분석이 필요한 복잡한 연음은 이 학습용 규칙에서 제외합니다.
    if (!movedInitial || next.initial !== "ㅇ") continue;

    const before = syllablesToText(syllables);
    current.final = "";
    next.initial = movedInitial;
    pushLog(
      logs,
      "단순 연음",
      before,
      syllablesToText(syllables),
      `받침 ${movedInitial}이 뒤 음절의 빈 초성 ㅇ 자리로 이어져 발음되었습니다.`,
    );
  }
}

function pushLog(logs, rule, before, after, explanation) {
  if (before === after) return;
  logs.push({ rule, before, after, explanation });
}

function cloneSyllables(syllables) {
  return syllables.map((syllable) => ({ ...syllable }));
}

export function syllablesToText(syllables) {
  return syllables.map(composeFromParts).join("");
}

export function getG2PTestCases() {
  return [...TEST_CASES];
}

export function getUnsupportedCases() {
  return Object.entries(UNSUPPORTED_CASES).map(([input, info]) => ({ input, ...info }));
}

export function runG2PTests() {
  return TEST_CASES.map((testCase) => {
    const result = analyzePronunciation(testCase.input);
    const hasRule = result.appliedRules.some((log) => log.rule === testCase.rule);

    return {
      ...testCase,
      actual: result.pronunciation,
      passed: result.pronunciation === testCase.expected && hasRule,
      appliedRules: result.appliedRules.map((log) => log.rule),
    };
  });
}
