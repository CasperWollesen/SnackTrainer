/**
 * A short "time's up" signal: three beeps and a vibration where supported. Browsers only allow
 * sound after a user gesture, so `unlockSound` is called from the Start tap. Best effort: never throws.
 */

let context: AudioContext | null = null;

export function unlockSound(): void {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    if (context.state === 'suspended') void context.resume();
  } catch {
    context = null;
  }
}

export function playTimeUp(): void {
  try {
    navigator.vibrate?.([200, 100, 200, 100, 400]);
  } catch {
    // ignore
  }
  try {
    if (!context) return;
    const start = context.currentTime + 0.05;
    for (let i = 0; i < 3; i++) {
      const t = start + i * 0.35;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 2 ? 1175 : 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain).connect(context.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  } catch {
    // ignore
  }
}
