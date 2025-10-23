import "./style.css";

document.body.innerHTML = `
  <h1> D2 Assigment </h1>
  <canvas id= "myCanvas" width="256" height="256" > </canvas>
`;

const myCanvas = document.getElementById("myCanvas") as HTMLCanvasElement;
const ctx = myCanvas.getContext("2d")!;

// Drawing State
const commands: LineCommand[] = [];
const redoCommands: LineCommand[] = [];

let currentLine: LineCommand | null = null; //
let cursor: CursorCommand | null = null; //

const bus = new EventTarget();

let currentThickness = 4; // default

// Tool preview (nullable) - shows the tool the user will draw with when mouse is over canvas and not down
let toolPreview: ToolPreview | null = null;

// --- Tools ---
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

  commands.forEach((cmd) => cmd.display(ctx)); //

  if (cursor) {
    cursor.display(ctx); //
  }

  // Draw the tool preview if available and the user isn't currently drawing
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
    // Cursor star removed — keep this method intentionally blank so nothing
    // is drawn for the cursor itself. Tool preview handles the visible cue.
    void ctx; // keep ctx referenced to satisfy linters
  }
}

// --- Tool Preview Command ---
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
    // draw a circle representing the marker tip; radius based on thickness
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
  // clear preview when leaving canvas
  toolPreview = null;
  notify("cursor-changed");
  notify("tool-moved");
});

myCanvas.addEventListener("mouseenter", (e) => {
  cursor = new CursorCommand(e.offsetX, e.offsetY);
  // create initial tool preview when entering
  toolPreview = new ToolPreview(e.offsetX, e.offsetY, currentThickness);
  notify("cursor-changed");
  notify("tool-moved");
});

myCanvas.addEventListener("mousedown", (e: MouseEvent) => {
  currentLine = new LineCommand(e.offsetX, e.offsetY, currentThickness);
  commands.push(currentLine);
  redoCommands.splice(0, redoCommands.length);
  notify("drawing-changed");
});

myCanvas.addEventListener("mousemove", (e: MouseEvent) => {
  cursor = new CursorCommand(e.offsetX, e.offsetY);
  notify("cursor-changed");

  // update or create the tool preview when moving the mouse; only visible when not drawing
  if (!currentLine) {
    if (toolPreview) {
      toolPreview.update(e.offsetX, e.offsetY, currentThickness);
    } else {
      toolPreview = new ToolPreview(e.offsetX, e.offsetY, currentThickness);
    }
    notify("tool-moved");
  }

  if (e.buttons == 1 && currentLine) {
    currentLine.drag(e.offsetX, e.offsetY);
    notify("drawing-changed");
  }
});

myCanvas.addEventListener("mouseup", () => {
  currentLine = null;
  // restore preview after finishing a stroke at last mouse position
  // keep existing toolPreview (it will be drawn since currentLine is null)
  notify("drawing-changed");
});

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

const thinButton = document.createElement("button");
thinButton.innerHTML = "thin";
document.body.append(thinButton);

thinButton.addEventListener("click", () => {
  currentThickness = 4;
  selectButton(thinButton);
  notify("drawing-changed");
});

const thickButton = document.createElement("button");
thickButton.innerHTML = "thick";
document.body.append(thickButton);

thickButton.addEventListener("click", () => {
  currentThickness = 8;
  selectButton(thickButton);
  notify("drawing-changed");
});
