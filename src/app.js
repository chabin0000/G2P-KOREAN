import { analyzePronunciation, runG2PTests } from "./g2p.js";
import { createKoreanSpeechRecognizer, isSpeechRecognitionSupported } from "./stt.js";

const elements = {
  startMicButton: document.querySelector("#startMicButton"),
  stopMicButton: document.querySelector("#stopMicButton"),
  analyzeButton: document.querySelector("#analyzeButton"),
  resetButton: document.querySelector("#resetButton"),
  textInput: document.querySelector("#textInput"),
  speechStatus: document.querySelector("#speechStatus"),
  recognizedText: document.querySelector("#recognizedText"),
  pronunciationResult: document.querySelector("#pronunciationResult"),
  ruleList: document.querySelector("#ruleList"),
  analysisSteps: document.querySelector("#analysisSteps"),
  messageBox: document.querySelector("#messageBox"),
};

let recognizer = null;

function setMessage(message, type = "info") {
  elements.messageBox.textContent = message;
  elements.messageBox.dataset.type = type;
}

function setListeningState(isListening) {
  elements.startMicButton.disabled = isListening;
  elements.stopMicButton.disabled = !isListening;
}

function renderAnalysis(result) {
  if (result.error) {
    renderEmptyResult(result.recognizedText || "분석 실패");
    setMessage(result.error, "error");
    return;
  }

  elements.recognizedText.textContent = result.recognizedText;
  elements.recognizedText.classList.remove("empty-text");
  elements.pronunciationResult.textContent = result.displayPronunciation;

  renderRules(result.appliedRules);
  renderSteps(result.analysisSteps);
  setMessage("분석이 완료되었습니다.", "success");
}

function renderRules(rules) {
  elements.ruleList.textContent = "";

  if (rules.length === 0) {
    const item = document.createElement("li");
    item.className = "empty-text";
    item.textContent = "적용된 규칙이 없습니다.";
    elements.ruleList.append(item);
    return;
  }

  const uniqueRules = [...new Set(rules.map((item) => item.rule))];
  for (const rule of uniqueRules) {
    const item = document.createElement("li");
    item.className = "rule-chip";
    item.textContent = rule;
    elements.ruleList.append(item);
  }
}

function renderSteps(steps) {
  elements.analysisSteps.textContent = "";

  if (steps.length === 0) {
    const item = document.createElement("li");
    item.className = "empty-text";
    item.textContent = "음운 변동 규칙이 적용되지 않았습니다.";
    elements.analysisSteps.append(item);
    return;
  }

  for (const step of steps) {
    const item = document.createElement("li");
    const rule = document.createElement("strong");
    const explanation = document.createElement("span");
    const transition = document.createElement("code");

    item.className = "analysis-step";
    rule.textContent = step.rule;
    explanation.textContent = step.explanation;
    transition.textContent = `${step.before} → ${step.after}`;

    item.append(rule, explanation, transition);
    elements.analysisSteps.append(item);
  }
}

function renderEmptyResult(text = "아직 분석된 텍스트가 없습니다.") {
  elements.recognizedText.textContent = text;
  elements.recognizedText.classList.add("empty-text");
  elements.pronunciationResult.textContent = "[-]";
  renderRules([]);
  elements.ruleList.firstElementChild.textContent = "아직 적용된 규칙이 없습니다.";
  renderSteps([]);
  elements.analysisSteps.firstElementChild.textContent = "분석을 실행하면 단계별 변화가 표시됩니다.";
}

function analyzeText(text) {
  const result = analyzePronunciation(text);
  renderAnalysis(result);
}

function resetView() {
  elements.textInput.value = "";
  renderEmptyResult();
  setMessage("", "info");
}

function startRecognition() {
  if (!isSpeechRecognitionSupported()) {
    setMessage(
      "이 브라우저는 Web Speech API를 지원하지 않습니다. 직접 입력 기능을 사용해 주세요.",
      "warning",
    );
    return;
  }

  recognizer = createKoreanSpeechRecognizer({
    onStart: () => {
      setListeningState(true);
      elements.speechStatus.textContent = "인식 중입니다. 한국어 단어를 말해 주세요.";
      setMessage("마이크 입력을 듣고 있습니다.", "info");
    },
    onResult: (transcript) => {
      if (!transcript) {
        setMessage("음성을 인식하지 못했습니다. 다시 시도하거나 직접 입력해 주세요.", "error");
        return;
      }

      elements.textInput.value = transcript;
      analyzeText(transcript);
    },
    onError: (message) => {
      setMessage(message, "error");
    },
    onEnd: () => {
      setListeningState(false);
      elements.speechStatus.textContent = "음성 인식이 종료되었습니다.";
    },
  });

  try {
    recognizer?.start();
  } catch {
    setListeningState(false);
    setMessage("음성 인식을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
  }
}

function stopRecognition() {
  recognizer?.stop();
  setListeningState(false);
}

elements.analyzeButton.addEventListener("click", () => analyzeText(elements.textInput.value));
elements.resetButton.addEventListener("click", resetView);
elements.startMicButton.addEventListener("click", startRecognition);
elements.stopMicButton.addEventListener("click", stopRecognition);
elements.textInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") analyzeText(elements.textInput.value);
});

if (!isSpeechRecognitionSupported()) {
  elements.speechStatus.textContent =
    "현재 브라우저는 Web Speech API를 지원하지 않습니다. 직접 입력을 사용해 주세요.";
}

window.runG2PTests = runG2PTests;
