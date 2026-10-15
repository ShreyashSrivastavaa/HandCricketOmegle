import confetti from "canvas-confetti";

export function fireVictoryConfetti(): void {
  if (typeof window === "undefined") return;

  const duration = 2.5 * 1000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#3DDC84", "#FFB020", "#4DA3FF", "#FFFFFF"],
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#3DDC84", "#FFB020", "#4DA3FF", "#FFFFFF"],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}
