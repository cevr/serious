/**
 * Speak text using the Web Speech API.
 * Maps ISO language codes to BCP 47 speech synthesis language tags.
 */
export function speakText(text: string, lang: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const langMap: Record<string, string> = {
    fr: "fr-FR",
    es: "es-ES",
    de: "de-DE",
    it: "it-IT",
    pt: "pt-BR",
    ja: "ja-JP",
    ko: "ko-KR",
    zh: "zh-CN",
    en: "en-US",
  };

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langMap[lang] ?? lang;
  utterance.rate = 0.85;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
