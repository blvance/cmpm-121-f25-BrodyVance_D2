import "./style.css";

document.body.innerHTML = `
  <h1> D2 Assigment </h1>
  <canvas id= "myCanvas" width="256" height="256" > </canvas>
`;

const myCanvas = document.getElementById("myCanvas") as HTMLCanvasElement;
const ctx = myCanvas.getContext("2d")!;

// Drawing State
const commands: Drawable[] = [];
const redoCommands: Drawable[] = [];

let currentLine: Drawable | null = null;
let cursor: CursorCommand | null = null;

const bus = new EventTarget();

let currentThickness = 4; // default
let currentTool: "marker" | string = "marker"; // marker is default

let toolPreview: Drawable | null = null;

// --- Tools ---

function isDraggable(
  obj: Drawable | null,
): obj is Drawable & { drag(x: number, y: number): void } {
  if (!obj) return false;
  const maybe = obj as unknown as { drag?: unknown };
  return typeof maybe.drag === "function";
}

function selectButton(button: HTMLButtonElement) {
  document.querySelectorAll("button").forEach((b) =>
    b.classList.remove("selectedTool")
  );
  button.classList.add("selectedTool");
}

function notify(name: string) {
  bus.dispatchEvent(new Event(name));
}

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

// --- Drawing Classes ---

type Point = { x: number; y: number };

interface Drawable {
  display(ctx: CanvasRenderingContext2D): void;
}

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
    ctx.font = "32px serif"; // ✅ fixed sticker size (no thickness influence)
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
    ctx.font = "32px serif"; // preview stays same size
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
    ctx.restore();
  }
}

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
    currentLine = sticker as unknown as LineCommand;
  }
  redoCommands.splice(0, redoCommands.length);
  notify("drawing-changed");
});

myCanvas.addEventListener("mousemove", (e: MouseEvent) => {
  cursor = new CursorCommand(e.offsetX, e.offsetY);
  notify("cursor-changed");

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

// --- Sticker buttons ---

function makeStickerButton(emoji: string) {
  const b = document.createElement("button");
  b.textContent = emoji;
  b.addEventListener("click", () => {
    currentTool = emoji;
    toolPreview = null;
    selectButton(b);
    notify("tool-moved");
  });
  document.body.append(b);
  return b;
}

makeStickerButton("🌟");
makeStickerButton("🔥");
makeStickerButton("🎯");

// --- Clear, Undo, Redo buttons ---

const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
document.body.append(clearButton);

clearButton.addEventListener("click", () => {
  commands.splice(0, commands.length);
  redoCommands.length = 0;
  notify("drawing-changed");
});

const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
document.body.append(undoButton);

undoButton.addEventListener("click", () => {
  undo();
});

function undo() {
  if (commands.length === 0) return;
  const popped = commands.pop();
  if (popped) redoCommands.push(popped);
  notify("drawing-changed");
}

const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
document.body.append(redoButton);

redoButton.addEventListener("click", () => {
  redo();
});

function redo() {
  if (redoCommands.length === 0) return;
  const popped = redoCommands.pop();
  if (popped) commands.push(popped);
  notify("drawing-changed");
}

// --- Thickness buttons + Marker select button ---

const markerButton = document.createElement("button");
markerButton.innerHTML = "marker";
document.body.append(markerButton);

markerButton.addEventListener("click", () => {
  currentTool = "marker";
  selectButton(markerButton);
  notify("tool-moved");
});

const thinButton = document.createElement("button");
thinButton.innerHTML = "thin";
document.body.append(thinButton);

thinButton.addEventListener("click", () => {
  currentThickness = 4;
  if (currentTool === "marker") selectButton(thinButton);
  notify("drawing-changed");
});

const thickButton = document.createElement("button");
thickButton.innerHTML = "thick";
document.body.append(thickButton);

thickButton.addEventListener("click", () => {
  currentThickness = 8;
  if (currentTool === "marker") selectButton(thickButton);
  notify("drawing-changed");
});

// --- Default state on load ✅ ---

// Select marker + thin on startup
selectButton(markerButton);
selectButton(thinButton);
currentTool = "marker";
currentThickness = 4;
notify("tool-moved");
