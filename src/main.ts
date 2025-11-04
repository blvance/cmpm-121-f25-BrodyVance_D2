import "./style.css";

//// --- Canvas + DOM setup ---------------------------------------------//
document.body.innerHTML = `
  <h1> D2 Assigment </h1>

  <canvas id="myCanvas" width="256" height="256"></canvas>

  <div id="controls">

    <div class="control-row" id="drawing-tools">
      <fieldset>
        <legend>Tool</legend>
        <button id="markerButton" data-tool-button="1">marker</button>
      </fieldset>

      <fieldset>
        <legend>Thickness</legend>
        <button id="thinButton" data-thickness-button="1">thin</button>
        <button id="thickButton" data-thickness-button="1">thick</button>
      </fieldset>

      <fieldset id="colorControls">
        <legend>Color</legend>
        <input type="range" id="colorSlider" min="0" max="360" value="0">
        <div id="colorSwatch"></div>
      </fieldset>
    </div>

    <div class="control-row" id="sticker-tools">
      <fieldset>
        <legend>Stickers</legend>
        <div id="sticker-buttons">
          </div>
        <button id="customStickerBtn" data-tool-button="1">+</button>
      </fieldset>
    </div>
    
    <div class="control-row" id="action-tools">
      <fieldset>
        <legend>Actions</legend>
        <button id="undoButton">undo</button>
        <button id="redoButton">redo</button>
        <button id="clearButton">clear</button>
        <button id="exportButton">export</button>
      </fieldset>
    </div>

  </div>
`;

// --- Fetch DOM Elements ---------------------------------------------//
const myCanvas = document.getElementById("myCanvas") as HTMLCanvasElement;
const ctx = myCanvas.getContext("2d")!;
// Tool Buttons
const markerButton = document.getElementById(
  "markerButton",
) as HTMLButtonElement;
const customStickerBtn = document.getElementById(
  "customStickerBtn",
) as HTMLButtonElement;
const stickerButtonContainer = document.getElementById(
  "sticker-buttons",
) as HTMLDivElement;
// Thickness Buttons
const thinButton = document.getElementById("thinButton") as HTMLButtonElement;
const thickButton = document.getElementById("thickButton") as HTMLButtonElement;
// Action Buttons
const undoButton = document.getElementById("undoButton") as HTMLButtonElement;
const redoButton = document.getElementById("redoButton") as HTMLButtonElement;
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
const exportButton = document.getElementById(
  "exportButton",
) as HTMLButtonElement;

const colorControls = document.getElementById(
  "colorControls",
) as HTMLFieldSetElement;
const colorSlider = document.getElementById(
  "colorSlider",
) as HTMLInputElement;
const colorSwatch = document.getElementById("colorSwatch") as HTMLDivElement;

//// --- Global state & event bus --------------------------------------//
const bus = new EventTarget();
// Drawing state
const commands: Drawable[] = [];
const redoCommands: Drawable[] = [];
const stickers: string[] = ["⭐", "🔥", "🍀", "💧"];
let currentLine: DraggableDrawable | null = null;
let cursor: CursorCommand | null = null;
let STROKE_WIDTH = 4; // default marker thickness
let lastThickness = 4;
let currentTool: "marker" | string = "marker";
let toolPreview: Drawable | null = null;
let currentColor = "hsl(0, 100%, 50%)"; // Default red

//// --- Utilities & helpers -------------------------------------------//
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

//// --- Rendering -----------------------------------------------------//
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

//// --- Types & Drawable classes -------------------------------------//
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

    ctx.font = `32px serif`;
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
  constructor(
    x: number,
    y: number,
    private thickness: number,
    private color: string, // Stores the color
  ) {
    this.points.push({ x, y });
  }
  drag(x: number, y: number) {
    this.points.push({ x, y });
  }
  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;

    ctx.save(); // Start new state
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";

    ctx.strokeStyle = this.color;

    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.stroke();
    ctx.restore(); // Restore state
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
    public color: string,
  ) {}
  update(x: number, y: number, thickness: number, color: string) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
    this.color = color;
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

//// --- Mouse Handling ------------------------------------------------//
myCanvas.addEventListener("mouseout", () => {
  cursor = null;
  toolPreview = null;
  notify("cursor-changed");
  notify("tool-moved");
});

myCanvas.addEventListener("mouseenter", (e) => {
  cursor = new CursorCommand(e.offsetX, e.offsetY);
  toolPreview = currentTool === "marker"
    ? new ToolPreview(e.offsetX, e.offsetY, STROKE_WIDTH, currentColor) // Pass color
    : new StickerPreview(e.offsetX, e.offsetY, currentTool);
  notify("cursor-changed");
  notify("tool-moved");
});

myCanvas.addEventListener("mousedown", (e) => {
  if (currentTool === "marker") {
    // Pass color to the new LineCommand
    currentLine = new LineCommand(
      e.offsetX,
      e.offsetY,
      STROKE_WIDTH,
      currentColor,
    );
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
      toolPreview ??= new ToolPreview(
        e.offsetX,
        e.offsetY,
        STROKE_WIDTH,
        currentColor, // Pass color
      );
      (toolPreview as ToolPreview).update(
        e.offsetX,
        e.offsetY,
        STROKE_WIDTH,
        currentColor, // Pass color
      );
    } else {
      toolPreview ??= new StickerPreview(e.offsetX, e.offsetY, currentTool);
      (toolPreview as StickerPreview).update(
        e.offsetX,
        e.offsetY,
        STROKE_WIDTH,
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

//// --- Sticker Button Creation Logic --------------------------------------//
function makeStickerButton(emoji: string) {
  const b = document.createElement("button");
  b.innerHTML = emoji;
  b.dataset.toolButton = "1";
  b.onclick = () => {
    currentTool = emoji;
    selectToolButton(b);
    clearThicknessSelections();
    toolPreview = null;
    // HIDE color controls when a sticker is selected
    colorControls.style.display = "none";
    notify("tool-moved");
  };
  stickerButtonContainer.append(b);
  return b;
}
stickers.forEach(makeStickerButton);

//// --- UI Button Event Handlers ------------------------------------//

// NEW: Add event listener for the color slider
colorSlider.oninput = () => {
  // 1. Update the global color using HSL (Hue, Saturation, Lightness)
  currentColor = `hsl(${colorSlider.value}, 100%, 50%)`;

  // 2. Update the visual swatch
  colorSwatch.style.backgroundColor = currentColor;

  // 3. If the tool preview is currently visible (and it's a marker preview), update its color
  if (toolPreview instanceof ToolPreview) {
    toolPreview.color = currentColor;
    notify("tool-moved");
  }
};

markerButton.onclick = () => {
  currentTool = "marker";
  selectToolButton(markerButton);
  STROKE_WIDTH = lastThickness;
  selectThicknessButton(lastThickness === 4 ? thinButton : thickButton);
  // SHOW color controls when the marker is selected
  colorControls.style.display = "flex";
  notify("tool-moved");
};

thinButton.onclick = () => {
  lastThickness = STROKE_WIDTH = 4;
  if (currentTool === "marker") selectThicknessButton(thinButton);
};

thickButton.onclick = () => {
  lastThickness = STROKE_WIDTH = 8;
  if (currentTool === "marker") selectThicknessButton(thickButton);
};

customStickerBtn.onclick = () => {
  const s = prompt("Custom sticker text", "🧽");
  if (!s) return;
  stickers.push(s);
  makeStickerButton(s);
};

// Ensure action buttons are connected
undoButton.onclick = undo;
redoButton.onclick = redo;
clearButton.onclick = () => {
  commands.length = 0;
  redoCommands.length = 0;
  notify("drawing-changed");
};
exportButton.onclick = exportDrawing;

// Implementations for undo/redo (if not already defined elsewhere)
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

//// --- Export Function ----------------------------------------------//
function exportDrawing() {
  const exportCanvas = document.createElement("canvas");
  const EXPORT_SIZE = 1024;
  const SCALE_FACTOR = EXPORT_SIZE / myCanvas.width; // 1024 / 256 = 4

  exportCanvas.width = EXPORT_SIZE;
  exportCanvas.height = EXPORT_SIZE;

  const exportCtx = exportCanvas.getContext("2d")!;

  exportCtx.scale(SCALE_FACTOR, SCALE_FACTOR);

  commands.forEach((cmd) => cmd.display(exportCtx));

  const dataURL = exportCanvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = "drawing-export.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  exportCanvas.remove();
}

//// --- Default startup ----------------------------------------------//
currentTool = "marker";
selectToolButton(markerButton);
selectThicknessButton(thinButton);
// NEW: Set initial UI state for color
colorControls.style.display = "flex";
colorSwatch.style.backgroundColor = currentColor;
notify("tool-moved");
