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
    { points: createArc(340, 300, 130, -Math.PI / 4, -Math.PI / 4 - Math.PI * 7/4, 100) }, // Arc from upper-right (315°), CLOCKWISE 315° to right-middle (0°) - MORE POINTS for easier completion
    { points: createLine(470, 300, 350, 300, 25) }, // Horizontal line inward (right to left) - more points
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
    { points: [...createLine(300, 150, 300, 400, 25), ...createCurve(300, 400, 300, 480, 240, 450, 15)] }, // One continuous stroke: vertical down then hook to left
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
    { points: createLine(220, 150, 220, 450) }, // 1. Left vertical down from top
    { points: createLine(220, 150, 300, 320) }, // 2. Left diagonal down to middle
    { points: createLine(380, 150, 300, 320) }, // 3. Right diagonal up to top-right
    { points: createLine(380, 150, 380, 450) }, // 4. Right vertical down from top
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
      ...createArc(300, 220, 70, Math.PI*2, Math.PI*0.65, 80),        // Top curve: MANY MORE points for easier completion
      ...createArc(300, 380, 70, -0.35*Math.PI, Math.PI, 80)          // Bottom curve: MANY MORE points for easier completion
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
  Å: [
    { points: createArc(300, 375, 70, Math.PI* 3 / 2 , -Math.PI / 2 ,50) }, // Circle/oval
    { points: createLine(370, 375, 370, 450) }, // Vertical line down on the right
    { points: createLine(300, 230, 300, 230, 5) }, // Dot at top
  ],
  Ä: [
    { points: createArc(300, 375, 70, Math.PI* 3 / 2 , -Math.PI / 2 ,50) }, // Circle/oval
    { points: createLine(370, 375, 370, 450) }, // Vertical line down on the right
    { points: createLine(300, 230, 300, 230, 5) }, // Dot at top
    { points: createLine(270, 230, 270, 230, 5) }, // Dot at top
    { points: createLine(330, 230, 330, 230, 5) }, // Dot at top
  ],
  Ö: [
    { points: createArc(300, 330, 120, -Math.PI / 2, -Math.PI / 2 - 2 * Math.PI, 60) }, // Circle from top, counter-clockwise (negative direction in screen coords) 360°
    { points: createLine(260, 150, 260, 150, 5) }, // Dot at top
    { points: createLine(340, 150, 340, 150, 5) }, // Dot at top
  ],
};

// Define strokes for lowercase letters
// Lowercase letters are positioned between middle line (y=300) and bottom line (y=450)
// They typically use the "x-height" which is approximately 150 pixels tall
const lowercaseLetterStrokes: { [key: string]: Stroke[] } = {
  a: [
    { points: createArc(300, 375, 70, Math.PI* 3 / 2 , -Math.PI / 2 ,50) }, // Circle/oval
    { points: createLine(370, 375, 370, 450) }, // Vertical line down on the right
  ],
  b: [
    { points: createLine(250, 150, 250, 450) }, // Vertical line from top (capital height) to bottom
    { points: [...createCurve(250, 300, 380, 300, 380, 375, 15), ...createCurve(380, 375, 380, 450, 250, 450, 15)] }, // Bottom bump
  ],
  c: [
    { points: createArc(300, 375, 70, -Math.PI / 4, Math.PI / 4 - Math.PI * 4/2, 60) }, // Open curve
  ],
  d: [
    { points: createLine(350, 150, 350, 450) }, // Vertical line from top (capital height) to bottom
    { points: [...createCurve(350, 300, 250, 300, 250, 375, 15), ...createCurve(250, 375, 250, 450, 350, 450, 15)] }, // Bottom bump
  ],
  e: [
    { points: createLine(230, 375, 370, 375, 25) },
    { points: createArc(300, 375, 70, -0 , -Math.PI * 3.3 / 2,  50) }, // Open curve

  ],
  f: [
    { points: createArc(290, 220, 60, 0, -Math.PI, 20) }, // Vertical line from top (capital height) to bottom
    { points: createLine(230, 220, 230, 450) }, // Top horizontal
    { points: createLine(180, 300, 280, 300) }, // Middle horizontal
  ],
  g: [
    { points: createArc(300, 375, 70, 0, -Math.PI *22/11 , 50) }, // Top circle
    { points: createLine(370, 380, 370, 520, 20) }, // Descender line down
    { points: createArc(300, 500, 70, 0, Math.PI , 50) }, // Bottom curve
  ],
  h: [
    { points: createLine(250, 150, 250, 450 ,20) }, // Left vertical from top (capital height) to bottom
    { points: createArc(300, 350, 50, -Math.PI, -0 , 50) }, // Right vertical from middle to bottom
    { points: createLine(350, 350, 350, 450 ,20) }, // Horizontal bar connecting
  ],
  i: [
    
    { points: createLine(300, 300, 300, 450) }, // Vertical line from middle to bottom
    { points: createLine(300, 230, 300, 230, 5) }, // Dot at top
  ],
  j: [
    { points: createLine(300, 230, 300, 230, 5) }, // Dot at top
    { points: [...createLine(300, 300, 300, 450, 25), ...createCurve(300, 450, 300, 520, 250, 485, 15)] }, // Vertical with hook
  ],
  k: [
    { points: createLine(250, 150, 250, 450) }, // Vertical line from top (capital height) to bottom
    { points: createLine(370, 300, 250, 375) }, // Diagonal from middle
    { points: createLine(250, 375, 370, 450) }, // Diagonal to bottom
  ],
  l: [
    { points: createLine(250, 150, 250, 450) }, // Vertical line from top (capital height) to bottom
  ],
  m: [
    { points: createLine(220, 300, 220, 450) }, // 1. Left vertical down from middle
    { points: createArc(260, 350, 40, -Math.PI, -0 , 50) }, // 2. Left diagonal down to middle
    { points: createLine(300, 350, 300, 450) }, // 3. Right diagonal up to middle
    { points: createArc(340, 350, 40, -Math.PI, -0 , 50) },
    { points: createLine(380, 350, 380, 450) }, // 4. Right vertical down from middle
  ],
  n: [
    { points: createLine(230, 300, 230, 450) }, // 1. Left vertical down from middle
    { points: createArc(300, 370, 70, -Math.PI, -0 , 50) }, // 2. Diagonal from left-middle to right-bottom
    { points: createLine(370,370, 370, 450) }, // 3. Right vertical down from middle
  ],
  o: [
    { points: createArc(300, 375, 70, -Math.PI / 2, -Math.PI / 2 - 2 * Math.PI, 50) }, // Circle
  ],
  p: [
    { points: createLine(250, 300, 250, 580) }, // Vertical line from top (capital height) to bottom
    { points: [...createCurve(250, 300, 380, 300, 380, 375, 15), ...createCurve(380, 375, 380, 450, 250, 450, 15)] }, // Bottom bump
  ],
  q: [
    { points: createArc(300, 375, 70, -Math.PI / 2, -Math.PI / 2 - 2 * Math.PI, 50) }, // Circle
    { points: createLine(340, 400, 390, 450, 15) }, // Tail descending
  ],
  r: [
    { points: createLine(250, 300, 250, 450) }, // Vertical line from top (capital height) to bottom
    { points: createArc(310, 360, 60, -Math.PI, -Math.PI/2 , 15)}, // Top bump then diagonal down
  ],
  s: [
    { points: [
      ...createArc(300, 330, 50, Math.PI*2, Math.PI*0.65, 50),        // Top curve
      ...createArc(300, 420, 50, -0.35*Math.PI, Math.PI, 50)          // Bottom curve
    ] }, // S curve
  ],
  t: [
    { points: createLine(300, 150, 300, 450, 35) },
    { points: createArc(300, 390, 60, Math.PI/2, Math.PI/5 , 50) }, 
    { points: createLine(260, 250, 340, 250, 35) }, // Middle horizontal
  ],
  u: [
    { points: [
      ...createLine(240, 300, 240, 395, 25),        // Left vertical down from middle
      ...createArc(300, 390, 60, Math.PI, 0, 40),   // Bottom curve
      ...createLine(360, 395, 360, 300, 25)         // Right vertical up from bottom
    ] }, // U shape
  ],
  v: [
    { points: createLine(230, 300, 300, 450) }, // Left diagonal down from middle to bottom
    { points: createLine(370, 300, 300, 450) }, // Right diagonal down from middle to bottom
  ],
  w: [
    { points: createLine(210, 300, 250, 450) }, // 1. Top-left straight down to bottom-left
    { points: createLine(300, 325, 250, 450) }, // 2. From middle-top down-left to bottom-left
    { points: createLine(300, 325, 350, 450) }, // 3. From middle-top down-right to bottom-right
    { points: createLine(390, 300, 350, 450) }, // 4. Top-right straight down to bottom-right
  ],
  x: [
    { points: createLine(230, 300, 370, 450) }, // Diagonal from middle left to bottom right
    { points: createLine(370, 300, 230, 450) }, // Diagonal from middle right to bottom left
  ],
  y: [
    { points: createArc(300, 300, 60, Math.PI, 0, 40),},
    { points: createLine(360, 300, 360, 500, 25) }, // Vertical line down with descender
    { points: createArc(320, 490, 40, 0, Math.PI/1.2, 40),}, // Small hook at bottom
  ],
  z: [
    { points: createLine(240, 300, 360, 300) }, // Top horizontal
    { points: createLine(360, 300, 240, 450) }, // Diagonal down
    { points: createLine(240, 450, 360, 450) }, // Bottom horizontal
  ],
  å: [
    { points: createArc(300, 375, 70, Math.PI* 3 / 2 , -Math.PI / 2 ,50) }, // Circle/oval
    { points: createLine(370, 375, 370, 450) }, // Vertical line down on the right
    { points: createLine(300, 230, 300, 230, 5) }, // Dot at top
  ],
  ä: [
    { points: createArc(300, 375, 70, Math.PI* 3 / 2 , -Math.PI / 2 ,50) }, // Circle/oval
    { points: createLine(370, 375, 370, 450) }, // Vertical line down on the right
    { points: createLine(270, 230, 270, 230, 5) }, // Dot at top
    { points: createLine(330, 230, 330, 230, 5) }, // Dot at top
  ],
  ö: [
    { points: createArc(300, 375, 70, -Math.PI / 2, -Math.PI / 2 - 2 * Math.PI, 50) }, // Circle
    { points: createArc(260, 230, 3, 0, Math.PI *2 , 5) }, // Circle
    //{ points: createLine(270, 230, 270, 230, 5) }, // Dot at top
    { points: createLine(330, 230, 330, 230, 5) }, // Dot at top
  ],
};

export function getLetterStrokes(letter: string): Stroke[] {
  const upperLetter = letter.toUpperCase();
  return letterStrokes[upperLetter] || letterStrokes["A"];
}

export function getLowercaseLetterStrokes(letter: string): Stroke[] {
  const lowerLetter = letter.toLowerCase();
  return lowercaseLetterStrokes[lowerLetter] || lowercaseLetterStrokes["a"];
}

// Get strokes for any character (letter, punctuation, etc.)
export function getCharacterStrokes(char: string): Stroke[] {
  // Handle punctuation
  if (char === "." || char === "。") {
    // Dot/period - small circle at bottom
    return [{ points: createArc(300, 450, 30, 0, 2 * Math.PI, 40) }];
  }
  
  if (char === ",") {
    // Comma - small curved line
    return [{ points: createArc(300, 450, 25, Math.PI / 4, Math.PI / 4 + Math.PI, 30) }];
  }
  
  if (char === "!") {
    // Exclamation mark - vertical line + dot
    return [
      { points: createLine(300, 150, 300, 400, 35) }, // Vertical line
      { points: createArc(300, 440, 20, 0, 2 * Math.PI, 30) } // Dot
    ];
  }
  
  if (char === "?") {
    // Question mark - curved top + vertical line + dot
    return [
      { points: createArc(300, 220, 70, Math.PI / 2, Math.PI / 2 - Math.PI * 1.2, 50) }, // Curved top
      { points: createLine(300, 290, 300, 380, 30) }, // Vertical line
      { points: createArc(300, 420, 20, 0, 2 * Math.PI, 30) } // Dot
    ];
  }
  
  // Handle spaces (return empty strokes - will be skipped)
  if (char === " " || char === "\u00A0") {
    return [];
  }
  
  // Handle letters
  if (char === char.toUpperCase() && char !== char.toLowerCase()) {
    // Capital letter
    return getLetterStrokes(char);
  } else if (char === char.toLowerCase() && char !== char.toUpperCase()) {
    // Lowercase letter
    return getLowercaseLetterStrokes(char);
  }
  
  // Default to capital letter if unrecognized
  return getLetterStrokes(char);
}

export function getAllLetters(): string[] {
  return Object.keys(letterStrokes);
}

