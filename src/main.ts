import "./style.css";

document.body.innerHTML = `
  <h1> D2 Assigment </h1>
  <canvas id= "myCanvas" width="256" height="256" > </canvas>
  <button id = "clrButton">clear</button>
`;

const myCanvas = document.getElementById("myCanvas") as HTMLCanvasElement;
const ctx = myCanvas.getContext("2d")!;
const clrButton = document.getElementById("clrButton") as HTMLButtonElement;

let isDrawing = false;
let x = 0;
let y = 0;

clrButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);
});

myCanvas.addEventListener("mousedown", (e) => {
  x = e.offsetX;
  y = e.offsetY;
  isDrawing = true;
});

myCanvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    drawLine(ctx, x, y, e.offsetX, e.offsetY);
    x = e.offsetX;
    y = e.offsetY;
  }
});

myCanvas.addEventListener("mouseup", () => {
  isDrawing = false;
});

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  ctx.beginPath();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}
