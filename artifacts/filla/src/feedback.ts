let audioContext: AudioContext | null = null;

export function playTone(kind: 'tick' | 'land' | 'tap' = 'tap', enabled = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ??= new AudioContextClass();
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => undefined);
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const frequency = kind === 'land' ? 740 : kind === 'tick' ? 500 : 590;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(kind === 'tick' ? 0.035 : 0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (kind === 'land' ? 0.18 : 0.07));
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + (kind === 'land' ? 0.19 : 0.08));
    if (kind === 'land') {
      if ('vibrate' in navigator) navigator.vibrate?.(16);
    }
  } catch {
    // Audio and vibration are optional enhancements, never game requirements.
  }
}
