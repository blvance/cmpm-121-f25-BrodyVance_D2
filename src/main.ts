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
const stickers: string[] = ["⭐", "🔥", "🍀", "💧"];
let currentLine: DraggableDrawable | null = null;
let cursor: CursorCommand | null = null;

let currentThickness = 4; // default marker thickness
let lastThickness = 4;
let currentTool: "marker" | string = "marker";

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
  return typeof (obj as Partial<{ drag: unknown }>).drag === "function";
}

// Button selection helpers
function clearToolSelections() {
  document
    .querySelectorAll("[data-tool-button]")
    .forEach((b) => b.classList.remove("selectedTool"));
}
function clearThicknessSelections() {
  document
    .querySelectorAll("[data-thickness-button]")
    .forEach((b) => b.classList.remove("selectedTool"));
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
  if (cursor) cursor.display(ctx);
  if (toolPreview && !currentLine) toolPreview.display(ctx);
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

interface DraggableDrawable extends Drawable {
  drag(x: number, y: number): void;
}

class StickerCommand implements DraggableDrawable {
  constructor(private x: number, private y: number, private emoji: string) {}

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
  constructor(private x: number, private y: number, private emoji: string) {}

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

class LineCommand implements DraggableDrawable {
  private points: Point[] = [];
  constructor(x: number, y: number, private thickness: number) {
    this.points.push({ x, y });
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

class CursorCommand implements Drawable {
  constructor(private x: number, private y: number) {}
  update(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  display(_ctx: CanvasRenderingContext2D) {}
}

class ToolPreview implements Drawable {
  constructor(
    private x: number,
    private y: number,
    private thickness: number,
  ) {}
  update(x: number, y: number, thickness: number) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
  }
  display(ctx: CanvasRenderingContext2D) {
    const r = Math.max(1, this.thickness / 2);
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

//
// --- Mouse Handling ------------------------------------------------
//
myCanvas.addEventListener("mouseout", () => {
  cursor = null;
  toolPreview = null;
  notify("cursor-changed");
  notify("tool-moved");
});

myCanvas.addEventListener("mouseenter", (e) => {
  cursor = new CursorCommand(e.offsetX, e.offsetY);
  toolPreview = currentTool === "marker"
    ? new ToolPreview(e.offsetX, e.offsetY, currentThickness)
    : new StickerPreview(e.offsetX, e.offsetY, currentTool);
  notify("cursor-changed");
  notify("tool-moved");
});

myCanvas.addEventListener("mousedown", (e) => {
  if (currentTool === "marker") {
    currentLine = new LineCommand(e.offsetX, e.offsetY, currentThickness);
    commands.push(currentLine);
  } else {
    const sticker = new StickerCommand(e.offsetX, e.offsetY, currentTool);
    commands.push(sticker);
    currentLine = sticker;
  }
  redoCommands.length = 0;
  notify("drawing-changed");
});

myCanvas.addEventListener("mousemove", (e) => {
  cursor = new CursorCommand(e.offsetX, e.offsetY);
  notify("cursor-changed");

  if (!currentLine) {
    if (currentTool === "marker") {
      toolPreview ??= new ToolPreview(e.offsetX, e.offsetY, currentThickness);
      (toolPreview as ToolPreview).update(
        e.offsetX,
        e.offsetY,
        currentThickness,
      );
    } else {
      toolPreview ??= new StickerPreview(e.offsetX, e.offsetY, currentTool);
      (toolPreview as StickerPreview).update(
        e.offsetX,
        e.offsetY,
        currentThickness,
        currentTool,
      );
    }
    notify("tool-moved");
  }

  if (e.buttons === 1 && currentLine && isDraggable(currentLine)) {
    currentLine.drag(e.offsetX, e.offsetY);
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
  b.dataset.toolButton = "1";
  return b;
}
function makeThicknessButton(text: string) {
  const b = makeButton(text);
  b.dataset.thicknessButton = "1";
  return b;
}

//
// --- UI Buttons ----------------------------------------------------
//
const markerButton = makeToolButton("marker");
markerButton.onclick = () => {
  currentTool = "marker";
  selectToolButton(markerButton);
  currentThickness = lastThickness;
  selectThicknessButton(lastThickness === 4 ? thinButton : thickButton);
  notify("tool-moved");
};

const thinButton = makeThicknessButton("thin");
thinButton.onclick = () => {
  lastThickness = currentThickness = 4;
  if (currentTool === "marker") selectThicknessButton(thinButton);
};

const thickButton = makeThicknessButton("thick");
thickButton.onclick = () => {
  lastThickness = currentThickness = 8;
  if (currentTool === "marker") selectThicknessButton(thickButton);
};

// Stickers (data-driven)
stickers.forEach(makeStickerButton);
function makeStickerButton(emoji: string) {
  const b = makeToolButton(emoji);
  b.onclick = () => {
    currentTool = emoji;
    selectToolButton(b);
    clearThicknessSelections();
    toolPreview = null;
    notify("tool-moved");
  };
  return b;
}

// Create real custom sticker button
const customBtn = makeToolButton("Custom sticker text");
customBtn.id = "customStickerBtn";
customBtn.onclick = () => {
  const s = prompt("Custom sticker text", "🧽");
  if (!s) return;
  stickers.push(s);
  makeStickerButton(s);
};

//
// --- Undo / Redo / Clear ------------------------------------------
//
const undoButton = makeButton("undo");
undoButton.onclick = undo;

const redoButton = makeButton("redo");
redoButton.onclick = redo;

const clearButton = makeButton("clear");
clearButton.onclick = () => {
  commands.length = 0;
  redoCommands.length = 0;
  notify("drawing-changed");
};

function undo() {
  if (!commands.length) return;
  redoCommands.push(commands.pop()!);
  notify("drawing-changed");
}

function redo() {
  if (!redoCommands.length) return;
  commands.push(redoCommands.pop()!);
  notify("drawing-changed");
}

//
// --- Default startup ----------------------------------------------
//
currentTool = "marker";
selectToolButton(markerButton);
selectThicknessButton(thinButton);
notify("tool-moved");
