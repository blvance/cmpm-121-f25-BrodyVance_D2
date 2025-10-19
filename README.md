# CMPM 121 D2 Project

Step 1 complete. Created app title with header and created a canvas. Made canvas have a 2px border, 10px rounded corners and a 7px drop shadow using style.css.

Step 2 complete by registering observers for mouse events, adding a clear button by using clearRect to the canvas when the button is clicked.

Step 3 complete. Move drawing to an event-driven model and add explicit types for points/lines: instead of drawing directly on the canvas at every mouse event, user mouse positions are now stored as an array of lines (Line[] where Line = Point[]), and the code dispatches a "drawing-changed" event on the canvas after each mutation (new point, mousedown, mouseup, clear, undo, redo). A single drawing-changed observer on the canvas clears and redraws all lines, eliminating unnecessary redraws and centralizing rendering logic. Added TypeScript types (Point, Line) and annotated lines, redoLines, and currentLine to remove implicit any[] usage, and made undo/redo handling safe by checking popped values before pushing. Removed the unused redraw() helper, applied formatting, and fixed linter/typecheck issues. Accidentally read over Step 4 on the instructions and added the redo and undo buttons on this step.

Step 4 Complete. Refractored my undo and redo events into more readable functions.
