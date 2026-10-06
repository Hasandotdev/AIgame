let voiceEnabled = true;

export function setVoiceEnabled(v) {
  voiceEnabled = Boolean(v);
}

export function speechSupported() {
  return typeof window !== 'undefined' && ('speechSynthesis' in window);
}

export function speak(text) {
  if (!voiceEnabled || !speechSupported() || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).slice(0, 700));
  u.rate = 1.02;
  u.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => /en[-_]/i.test(v.lang)) || voices[0];
  if (preferred) u.voice = preferred;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

const SpeechRecognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export function recognitionSupported() {
  return Boolean(SpeechRecognition);
}

export function listenOnce({ onResult, onError }) {
  if (!recognitionSupported()) {
    onError?.('Speech recognition is not supported in this browser (try Chrome or Edge).');
    return null;
  }
  const rec = new SpeechRecognition();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onResult?.(transcript);
  };
  rec.onerror = (event) => {
    onError?.(event.error === 'not-allowed' ? 'Microphone permission was denied.' : `Voice error: ${event.error}`);
  };
  rec.onend = () => {};
  try {
    rec.start();
    return rec;
  } catch (err) {
    onError?.(String(err.message || err));
    return null;
  }
}
