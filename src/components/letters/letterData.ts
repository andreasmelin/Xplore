type Point = { x: number; y: number };
type Stroke = { points: Point[] };

// Helper function to create a line of points
function createLine(x1: number, y1: number, x2: number, y2: number, numPoints: number = 20): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    points.push({
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t,
    });
  }
  return points;
}

// Helper function to create a curve (quadratic bezier)
function createCurve(
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  numPoints: number = 25
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
    const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
    points.push({ x, y });
  }
  return points;
}

// Helper function to create an arc
function createArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  numPoints: number = 30
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const angle = startAngle + (endAngle - startAngle) * t;
    points.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  return points;
}

// Define strokes for each letter
const letterStrokes: { [key: string]: Stroke[] } = {
  A: [
    { points: createLine(300, 200, 250, 450) }, // Start at top, diagonal down-left
    { points: createLine(300, 200, 350, 450) }, // Start at top, diagonal down-right
    { points: createLine(272, 340, 328, 340, 30) }, // Horizontal bar - fits within the A shape
  ],
  B: [
    { points: createLine(250, 150, 250, 450) }, // Vertical line
    { points: [...createCurve(250, 150, 380, 150, 380, 250, 15), ...createCurve(380, 250, 380, 300, 250, 300, 15)] }, // Top bump
    { points: [...createCurve(250, 300, 400, 300, 400, 375, 15), ...createCurve(400, 375, 400, 450, 250, 450, 15)] }, // Bottom bump
  ],
  C: [
    { points: createArc(300, 300, 130, -Math.PI / 4, -Math.PI / 4 - Math.PI * 3/2, 80) }, // C: Start at upper-right (-45°/315°), sweep 270° CLOCKWISE to lower-right, opens RIGHT - MORE POINTS for easier completion
  ],
  D: [
    { points: createLine(250, 150, 250, 450) }, // Vertical line
    { points: [...createCurve(250, 150, 420, 200, 420, 300, 20), ...createCurve(420, 300, 420, 400, 250, 450, 20)] }, // Rounded right side
  ],
  E: [
    { points: createLine(250, 150, 250, 450) }, // Vertical line first (top to bottom)
    { points: createLine(250, 150, 370, 150) }, // Top horizontal (left to right)
    { points: createLine(250, 300, 350, 300) }, // Middle horizontal (left to right)
    { points: createLine(250, 450, 370, 450) }, // Bottom horizontal (left to right)
  ],
  F: [
    { points: createLine(250, 150, 250, 450) }, // Vertical line first (top to bottom)
    { points: createLine(250, 150, 370, 150) }, // Top horizontal (left to right)
    { points: createLine(250, 300, 350, 300) }, // Middle horizontal (left to right)
  ],
  G: [
    { points: createArc(300, 300, 130, -Math.PI / 4, -Math.PI / 4 - Math.PI * 7/4, 100) }, // Arc from upper-right (315°), CLOCKWISE 315° to right-middle (0°) - MORE POINTS for easier completion
    { points: createLine(430, 300, 350, 300, 25) }, // Horizontal line inward (right to left) - more points
  ],
  H: [
    { points: createLine(250, 150, 250, 450) }, // Left vertical
    { points: createLine(350, 150, 350, 450) }, // Right vertical
    { points: createLine(250, 300, 350, 300) }, // Horizontal bar
  ],
  I: [
    { points: createLine(300, 150, 300, 450) }, // Vertical line only (top to bottom)
  ],
  J: [
    { points: createLine(300, 150, 300, 400) }, // Vertical down
    { points: createCurve(300, 400, 300, 480, 240, 450) }, // Hook to left
  ],
  K: [
    { points: createLine(250, 150, 250, 450) }, // Vertical line
    { points: createLine(370, 150, 250, 300) }, // Diagonal from top right to middle
    { points: createLine(250, 300, 370, 450) }, // Diagonal from middle to bottom right
  ],
  L: [
    { points: createLine(250, 150, 250, 450) }, // Vertical line
    { points: createLine(250, 450, 350, 450) }, // Bottom horizontal
  ],
  M: [
    { points: createLine(220, 150, 220, 450) }, // Left vertical down from top
    { points: createLine(380, 150, 380, 450) }, // Right vertical down from top
    { points: createLine(220, 150, 300, 320) }, // Left diagonal down to middle
    { points: createLine(380, 150, 300, 320) }, // Right diagonal down to middle
  ],
  N: [
    { points: createLine(230, 150, 230, 450) }, // 1. Left vertical down from top
    { points: createLine(230, 150, 370, 450) }, // 2. Diagonal from left-top to right-bottom
    { points: createLine(370, 150, 370, 450) }, // 3. Right vertical down from top
  ],
  O: [
    { points: createArc(300, 300, 130, -Math.PI / 2, -Math.PI / 2 - 2 * Math.PI, 60) }, // Circle from top, counter-clockwise (negative direction in screen coords) 360°
  ],
  P: [
    { points: createLine(250, 150, 250, 450) }, // Vertical line down from top
    { points: [...createCurve(250, 150, 380, 150, 380, 225, 15), ...createCurve(380, 225, 380, 300, 250, 300, 15)] }, // Top bump
  ],
  Q: [
    { points: createArc(300, 300, 130, -Math.PI / 2, -Math.PI / 2 - 2 * Math.PI, 60) }, // Circle from top, counter-clockwise (negative direction in screen coords) 360°
    { points: createLine(360, 400, 410, 470) }, // Tail from inside to bottom-right
  ],
  R: [
    { points: createLine(250, 150, 250, 450) }, // Vertical line down from top
    { points: [...createCurve(250, 150, 380, 150, 380, 225, 15), ...createCurve(380, 225, 380, 300, 250, 300, 15)] }, // Top bump
    { points: createLine(250, 300, 370, 450) }, // Diagonal leg
  ],
  S: [
    { points: [
      ...createArc(300, 220, 70, Math.PI*2, Math.PI*0.85, 80),        // Top curve: MANY MORE points for easier completion
      ...createArc(300, 380, 70, -0.15*Math.PI, Math.PI, 80)          // Bottom curve: MANY MORE points for easier completion
    ] }, // S curve - 160 total detection points for very easy tracing
  ],
  T: [
    { points: createLine(300, 150, 300, 450, 35) }, // Vertical line down first - MORE POINTS
    { points: createLine(220, 150, 380, 150, 35) }, // Top horizontal - MORE POINTS for easier completion
  ],
  U: [
    { points: [
      ...createLine(240, 150, 240, 380, 30),        // Left vertical down - MORE POINTS
      ...createArc(300, 380, 60, Math.PI, 0, 50),   // Bottom curve - MORE POINTS for easier completion
      ...createLine(360, 380, 360, 150, 30)         // Right vertical up - MORE POINTS
    ] }, // U - one continuous stroke with 110 detection points total
  ],
  V: [
    { points: createLine(230, 150, 300, 450) }, // Left diagonal down from top-left to bottom
    { points: createLine(370, 150, 300, 450) }, // Right diagonal down from top-right to bottom
  ],
  W: [
    { points: createLine(210, 150, 250, 450) }, // 1. Top-left straight down to bottom-left
    { points: createLine(300, 200, 250, 450) }, // 2. From middle-top down-left to bottom-left
    { points: createLine(300, 200, 350, 450) }, // 3. From middle-top down-right to bottom-right
    { points: createLine(390, 150, 350, 450) }, // 4. Top-right straight down to bottom-right
  ],
  X: [
    { points: createLine(230, 150, 370, 450) }, // Diagonal from top left to bottom right
    { points: createLine(370, 150, 230, 450) }, // Diagonal from top right to bottom left
  ],
  Y: [
    { points: createLine(230, 150, 300, 280) }, // Left diagonal to center
    { points: createLine(370, 150, 300, 280) }, // Right diagonal to center
    { points: createLine(300, 280, 300, 450) }, // Vertical line down
  ],
  Z: [
    { points: createLine(240, 150, 360, 150) }, // Top horizontal
    { points: createLine(360, 150, 240, 450) }, // Diagonal down
    { points: createLine(240, 450, 360, 450) }, // Bottom horizontal
  ],
};

export function getLetterStrokes(letter: string): Stroke[] {
  const upperLetter = letter.toUpperCase();
  return letterStrokes[upperLetter] || letterStrokes["A"];
}

export function getAllLetters(): string[] {
  return Object.keys(letterStrokes);
}

