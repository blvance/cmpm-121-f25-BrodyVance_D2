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

// --- Tools ---
function notify(name: string) {
  bus.dispatchEvent(new Event(name));
}

function redraw() {
  ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);

  commands.forEach((cmd) => cmd.display(ctx)); //

  if (cursor) {
    cursor.display(ctx); //
  }
}

bus.addEventListener("drawing-changed", redraw);
bus.addEventListener("cursor-changed", redraw);

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

  constructor(x: number, y: number) {
    this.points.push({ x, y });
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;
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
    ctx.font = "32px monospace";
    ctx.fillText("*", this.x - 8, this.y + 16);
  }
}

// --- Mouse Handling ---

myCanvas.addEventListener("mouseout", (_e) => {
  cursor = null;
  notify("cursor-changed");
});

myCanvas.addEventListener("mouseenter", (e) => {
  cursor = new CursorCommand(e.offsetX, e.offsetY);
  notify("cursor-changed");
});

myCanvas.addEventListener("mousedown", (e: MouseEvent) => {
  currentLine = new LineCommand(e.offsetX, e.offsetY);
  commands.push(currentLine);
  redoCommands.splice(0, redoCommands.length);
  notify("drawing-changed");
});

myCanvas.addEventListener("mousemove", (e: MouseEvent) => {
  cursor = new CursorCommand(e.offsetX, e.offsetY);
  notify("cursor-changed");

  if (e.buttons == 1 && currentLine) {
    currentLine.drag(e.offsetX, e.offsetY);
    notify("drawing-changed");
  }
});

myCanvas.addEventListener("mouseup", () => {
  currentLine = null;
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
