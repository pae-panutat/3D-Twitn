// Background herd: sculptural, untagged animals resting in the central strip of each pen.
export const BACKGROUND_PIGS = Array.from({length: 6}, (_, pen) =>
  [-3.3, -1.1, 1.1, 3.3].map((offset, slot) => ({
    key: `herd-${pen}-${slot}`,
    x: (pen % 3 - 1) * 10 + offset,
    z: pen < 3 ? -5 : 5,
    heading: (slot % 2 ? -1 : 1) * Math.PI / 2,
    scale: .98 + (slot % 2) * .05,
  })),
).flat();
