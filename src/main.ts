import "./style.css";

document.body.innerHTML = `
  <h1> D2 Assigment </h1>
  <canvas id= "myCanvas" width="256" height="256" > </canvas>
`;

const myCanvas = document.getElementById("myCanvas") as HTMLCanvasElement;
const ctx = myCanvas.getContext("2d")!;

type Point = { x: number; y: number };
type Line = Point[];

const lines: Line[] = [];
const redoLines: Line[] = [];

let currentLine: Line | null = null;

const mouse: { active: boolean; x: number; y: number } = {
  active: false,
  x: 0,
  y: 0,
};

myCanvas.addEventListener("mousedown", (e: MouseEvent) => {
  mouse.active = true;
  mouse.x = e.offsetX;
  mouse.y = e.offsetY;

  currentLine = [];
  lines.push(currentLine);
  redoLines.splice(0, redoLines.length);
  currentLine.push({ x: mouse.x, y: mouse.y });
  myCanvas.dispatchEvent(new Event("drawing-changed"));
});

myCanvas.addEventListener("mousemove", (e: MouseEvent) => {
  if (mouse.active && currentLine) {
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
    currentLine.push({ x: mouse.x, y: mouse.y });
    myCanvas.dispatchEvent(new Event("drawing-changed"));
  }
});

myCanvas.addEventListener("mouseup", (_e: MouseEvent) => {
  mouse.active = false;
  currentLine = null;
  myCanvas.dispatchEvent(new Event("drawing-changed"));
});

document.body.append(document.createElement("br"));

// Clear, Undo, Redo buttons
const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
document.body.append(clearButton);

clearButton.addEventListener("click", () => {
  lines.splice(0, lines.length);
  myCanvas.dispatchEvent(new Event("drawing-changed"));
});

const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
document.body.append(undoButton);

undoButton.addEventListener("click", () => {
  undo();
});

const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
document.body.append(redoButton);

redoButton.addEventListener("click", () => {
  redo();
});

function undo() {
  if (lines.length === 0) return;
  const popped = lines.pop();
  if (popped) redoLines.push(popped);
  myCanvas.dispatchEvent(new Event("drawing-changed"));
}

function redo() {
  if (redoLines.length === 0) return;
  const popped = redoLines.pop();
  if (popped) lines.push(popped);
  myCanvas.dispatchEvent(new Event("drawing-changed"));
}

// Observer: when the drawing changes, clear and redraw lines
myCanvas.addEventListener("drawing-changed", () => {
  // clear and redraw only when the canvas needs updating
  ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);
  for (const line of lines) {
    if (line.length > 1) {
      ctx.beginPath();
      const { x, y } = line[0];
      ctx.moveTo(x, y);
      for (const { x, y } of line) {
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
});
