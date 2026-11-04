// Som de pedido novo, gerado pelo Web Audio (sem arquivo de áudio). O
// navegador só libera som depois de um clique ou tecla na página; até lá o
// contexto fica "suspended" e o painel pede um toque para ativar.

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const AudioContextClass =
      window.AudioContext ??
      (
        window as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
  }
  return context;
}

/**
 * O navegador já deixa tocar som nesta página. Não cria o contexto: criado
 * antes de um clique, ele nasce bloqueado e o navegador reclama no console.
 */
export function isAudioUnlocked(): boolean {
  return context?.state === "running";
}

/** Libera o som. Funciona só dentro de um clique ou tecla. */
export async function unlockAudio(): Promise<boolean> {
  const ctx = audioContext();
  if (!ctx) return false;
  if (ctx.state !== "running") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === "running";
}

/** Um ciclo do alarme: dois bipes curtos. */
export function playOrderChime(): void {
  const ctx = audioContext();
  if (!ctx || ctx.state !== "running") return;

  const start = ctx.currentTime;
  for (const [offset, frequency] of [
    [0, 880],
    [0.22, 1175],
  ] as const) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(
      0.4,
      start + offset + 0.02,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      start + offset + 0.18,
    );
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + 0.2);
  }
}

/** Intervalo entre os ciclos enquanto houver pedido novo. */
export const CHIME_INTERVAL_MS = 2000;
