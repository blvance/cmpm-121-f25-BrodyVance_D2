import "./style.css";

//
// --- Canvas + DOM setup ---------------------------------------------
//
document.body.innerHTML = `
  <h1> D2 Assigment </h1>
  <canvas id="myCanvas" width="256" height="256"></canvas>
`;

const myCanvas = document.getElementById("myCanvas") as HTMLCanvasElement;
const ctx = myCanvas.getContext("2d")!;

//
// --- Global state & event bus --------------------------------------
//
const bus = new EventTarget();

// Drawing state
const commands: Drawable[] = [];
const redoCommands: Drawable[] = [];

let currentLine: Drawable | null = null;
let cursor: CursorCommand | null = null;

let currentThickness = 4; // default marker thickness (pixels)
let lastThickness = 4; // remembers last-chosen thickness even when sticker selected
let currentTool: "marker" | string = "marker"; // marker default

let toolPreview: Drawable | null = null;

//
// --- Utilities & helpers -------------------------------------------
//
function notify(name: string) {
  bus.dispatchEvent(new Event(name));
}

function isDraggable(
  obj: Drawable | null,
): obj is Drawable & { drag(x: number, y: number): void } {
  if (!obj) return false;
  const maybe = obj as unknown as { drag?: unknown };
  return typeof maybe.drag === "function";
}

// Button selection helpers (supports marker + thickness selected simultaneously)

function clearToolSelections() {
  // clear only tool-type buttons (marker + stickers)
  const toolButtons = document.querySelectorAll("[data-tool-button]");
  toolButtons.forEach((b) => b.classList.remove("selectedTool"));
}
function clearThicknessSelections() {
  const thButtons = document.querySelectorAll("[data-thickness-button]");
  thButtons.forEach((b) => b.classList.remove("selectedTool"));
}
function selectToolButton(button: HTMLButtonElement) {
  clearToolSelections();
  button.classList.add("selectedTool");
}
function selectThicknessButton(button: HTMLButtonElement) {
  clearThicknessSelections();
  button.classList.add("selectedTool");
}

//
// --- Rendering -----------------------------------------------------
//
function redraw() {
  ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);

  commands.forEach((cmd) => cmd.display(ctx));

  if (cursor) {
    cursor.display(ctx);
  }

  if (toolPreview && !currentLine) {
    toolPreview.display(ctx);
  }
}

bus.addEventListener("drawing-changed", redraw);
bus.addEventListener("cursor-changed", redraw);
bus.addEventListener("tool-moved", redraw);

function tick() {
  redraw();
  requestAnimationFrame(tick);
}
tick();

//
// --- Types & Drawable classes -------------------------------------
//
type Point = { x: number; y: number };

interface Drawable {
  display(ctx: CanvasRenderingContext2D): void;
}

// Sticker command: fixed-size emoji independent of thickness
class StickerCommand implements Drawable {
  private x: number;
  private y: number;
  private emoji: string;

  constructor(x: number, y: number, emoji: string) {
    this.x = x;
    this.y = y;
    this.emoji = emoji;
  }

  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.font = "32px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
    ctx.restore();
  }
}

class StickerPreview implements Drawable {
  private x: number;
  private y: number;
  private emoji: string;

  constructor(x: number, y: number, emoji: string) {
    this.x = x;
    this.y = y;
    this.emoji = emoji;
  }

  update(x: number, y: number, _thickness: number, emoji?: string) {
    this.x = x;
    this.y = y;
    if (emoji) this.emoji = emoji;
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.font = "32px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
    ctx.restore();
  }
}

// Line command (marker strokes)
class LineCommand implements Drawable {
  private points: Point[] = [];
  private thickness: number;

  constructor(x: number, y: number, thickness: number) {
    this.points.push({ x, y });
    this.thickness = thickness;
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;

    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.stroke();
  }
}

// Cursor is intentionally blank (preview handles visible cue)
class CursorCommand implements Drawable {
  private x: number;
  private y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  display(ctx: CanvasRenderingContext2D) {
    void ctx;
  }
}

// Marker preview: circle sized by currentThickness
class ToolPreview implements Drawable {
  private x: number;
  private y: number;
  private thickness: number;

  constructor(x: number, y: number, thickness: number) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
  }

  update(x: number, y: number, thickness: number) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
  }

  display(ctx: CanvasRenderingContext2D) {
    const radius = Math.max(1, this.thickness / 2);
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- Mouse Handling ---

myCanvas.addEventListener("mouseout", (_e) => {
  cursor = null;
  toolPreview = null;
  notify("cursor-changed");
  notify("tool-moved");
});

myCanvas.addEventListener("mouseenter", (e) => {
  cursor = new CursorCommand(e.offsetX, e.offsetY);
  if (currentTool === "marker") {
    toolPreview = new ToolPreview(e.offsetX, e.offsetY, currentThickness);
  } else {
    toolPreview = new StickerPreview(e.offsetX, e.offsetY, currentTool);
  }
  notify("cursor-changed");
  notify("tool-moved");
});

myCanvas.addEventListener("mousedown", (e: MouseEvent) => {
  if (currentTool === "marker") {
    currentLine = new LineCommand(e.offsetX, e.offsetY, currentThickness);
    commands.push(currentLine);
  } else {
    const sticker = new StickerCommand(e.offsetX, e.offsetY, currentTool);
    commands.push(sticker);
    // allow dragging to reposition sticker
    currentLine = sticker as unknown as LineCommand;
  }
  redoCommands.splice(0, redoCommands.length);
  notify("drawing-changed");
});

myCanvas.addEventListener("mousemove", (e: MouseEvent) => {
  cursor = new CursorCommand(e.offsetX, e.offsetY);
  notify("cursor-changed");

  // update or create tool preview when not drawing
  if (!currentLine) {
    if (currentTool === "marker") {
      if (toolPreview) {
        (toolPreview as ToolPreview).update(
          e.offsetX,
          e.offsetY,
          currentThickness,
        );
      } else {
        toolPreview = new ToolPreview(e.offsetX, e.offsetY, currentThickness);
      }
    } else {
      if (toolPreview) {
        (toolPreview as StickerPreview).update(
          e.offsetX,
          e.offsetY,
          currentThickness,
          currentTool,
        );
      } else {
        toolPreview = new StickerPreview(e.offsetX, e.offsetY, currentTool);
      }
    }
    notify("tool-moved");
  }

  if (e.buttons == 1 && currentLine) {
    if (isDraggable(currentLine)) {
      currentLine.drag(e.offsetX, e.offsetY);
    }
    notify("drawing-changed");
  }
});

myCanvas.addEventListener("mouseup", () => {
  currentLine = null;
  notify("drawing-changed");
});

//
// --- Button creation helpers --------------------------------------
//
function makeButton(text: string) {
  const b = document.createElement("button");
  b.innerHTML = text;
  document.body.append(b);
  return b;
}

function makeToolButton(text: string) {
  const b = makeButton(text);
  b.setAttribute("data-tool-button", "1");
  return b;
}

function makeThicknessButton(text: string) {
  const b = makeButton(text);
  b.setAttribute("data-thickness-button", "1");
  return b;
}

//
// --- UI Buttons (grouped logically) -------------------------------
//

// -- Tool + thickness row (marker + thin/thick)
const markerButton = makeToolButton("marker");
markerButton.addEventListener("click", () => {
  currentTool = "marker";

  // visually mark tool and thickness according to remembered thickness
  selectToolButton(markerButton);
  if (lastThickness === 4) {
    selectThicknessButton(thinButton);
  } else {
    selectThicknessButton(thickButton);
  }

  // ensure currentThickness matches lastThickness when returning to marker
  currentThickness = lastThickness;
  notify("tool-moved");
});

// thickness buttons (always update remembered thickness; highlight only when marker active)
const thinButton = makeThicknessButton("thin");
thinButton.addEventListener("click", () => {
  lastThickness = 4;
  currentThickness = 4;
  // highlight thin only if marker is currently selected
  if (currentTool === "marker") selectThicknessButton(thinButton);
  notify("drawing-changed");
});

const thickButton = makeThicknessButton("thick");
thickButton.addEventListener("click", () => {
  lastThickness = 8;
  currentThickness = 8;
  if (currentTool === "marker") selectThicknessButton(thickButton);
  notify("drawing-changed");
});

// -- Sticker row
function makeStickerButton(emoji: string) {
  const b = makeToolButton(emoji);
  b.addEventListener("click", () => {
    currentTool = emoji;
    // select only the sticker (tool) and clear thickness highlighting
    selectToolButton(b);
    clearThicknessSelections();
    toolPreview = null;
    notify("tool-moved");
  });
  return b;
}

makeStickerButton("🌟");
makeStickerButton("🔥");
makeStickerButton("🎯");

// -- History row (undo/redo/clear)
const undoButton = makeButton("undo");
undoButton.addEventListener("click", () => {
  undo();
});

const redoButton = makeButton("redo");
redoButton.addEventListener("click", () => {
  redo();
});

const clearButton = makeButton("clear");
clearButton.addEventListener("click", () => {
  commands.splice(0, commands.length);
  redoCommands.length = 0;
  notify("drawing-changed");
});

function undo() {
  if (commands.length === 0) return;
  const popped = commands.pop();
  if (popped) redoCommands.push(popped);
  notify("drawing-changed");
}

function redo() {
  if (redoCommands.length === 0) return;
  const popped = redoCommands.pop();
  if (popped) commands.push(popped);
  notify("drawing-changed");
}

//
// --- Default startup state ----------------------------------------
//
currentThickness = 4;
lastThickness = 4;
currentTool = "marker";
// visually select marker + thin
selectToolButton(markerButton);
selectThicknessButton(thinButton);
notify("tool-moved");
