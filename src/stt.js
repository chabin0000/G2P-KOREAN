export function getSpeechRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionConstructor());
}

export function createKoreanSpeechRecognizer({ onStart, onResult, onError, onEnd }) {
  const SpeechRecognition = getSpeechRecognitionConstructor();
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.lang = "ko-KR";
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    onStart?.();
  };

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript ?? "";
    onResult?.(transcript);
  };

  recognition.onerror = (event) => {
    const message =
      event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "마이크 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용하거나 직접 입력을 사용해 주세요."
        : "음성을 인식하지 못했습니다. 다시 시도하거나 직접 입력해 주세요.";
    onError?.(message);
  };

  recognition.onend = () => {
    onEnd?.();
  };

  return recognition;
}
