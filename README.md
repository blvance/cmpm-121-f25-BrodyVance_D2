# CMPM 121 D2 Project

Step 1 complete. Created app title with header and created a canvas. Made canvas have a 2px border, 10px rounded corners and a 7px drop shadow using style.css.

Step 2 complete by registering observers for mouse events, adding a clear button by using clearRect to the canvas when the button is clicked.

Step 3 complete. Move drawing to an event-driven model and add explicit types for points/lines: instead of drawing directly on the canvas at every mouse event, user mouse positions are now stored as an array of lines (Line[] where Line = Point[]), and the code dispatches a "drawing-changed" event on the canvas after each mutation (new point, mousedown, mouseup, clear, undo, redo). A single drawing-changed observer on the canvas clears and redraws all lines, eliminating unnecessary redraws and centralizing rendering logic. Added TypeScript types (Point, Line) and annotated lines, redoLines, and currentLine to remove implicit any[] usage, and made undo/redo handling safe by checking popped values before pushing. Removed the unused redraw() helper, applied formatting, and fixed linter/typecheck issues. Accidentally read over Step 4 on the instructions and added the redo and undo buttons on this step.

Step 4 Complete. Refractored my undo and redo events into more readable functions.

Step 5 Complete. Created a LineCommand class that represents a continuous marker line drawn by the user. Created a CursorCommand class that represent the users' cursor position on the canvas. There are two stacks for managing drawing history. A small event bus (bus) was introduced to manage redraws, Custom events ("drawing-changed", "cursor-changed") trigger canvas updates. This keeps the display logic separate from input handling. Added more mouse events like mouseout and mouseenter for handling the visibility of the cursor on the canvas. Event handlers for buttons refractored after creating command history. Created a redraw() function that clears canvas and re-renders making sure users actions are displayed fast. This refactor organizes the app around command objects that encapsulate their own rendering behavior. The user experience remains identical.

Step 6 Complete. Added more feature to the drawing tool adding a thick and thin button. Added a indicator using CSS styling to give the user feedback about which tool is selected. (e.g. add a "selectedTool" class to the button associated with that tool).

Step 7 complete Implement tool preview system and 'tool-moved' event
-Added a new Drawable class, ToolPreviewCommand, which renders a circular brush preview matching the current line thickness.
-Introduced a new global variable toolPreview to hold a nullable reference to the preview object.
-dded support for a new "tool-moved" event, fired on mouse movement when the user is not drawing.
-Updated the mousemove listener to update or create the tool preview and dispatch "tool-moved" events accordingly.
-Modified redraw() to include the tool preview when the mouse is hovering but not actively drawing.
-Ensured the preview is hidden when the mouse leaves the canvas or during drawing (on mousedown).
This update improves user feedback by providing a visual indicator of the tool’s active size and position before drawing.

Step 8 complete
Implemented Step 8 by adding multiple sticker tools (🚀🐱🌸) with dynamic preview and placement features. Introduced StickerCommand and StickerPreview classes to handle sticker rendering, position tracking, and real-time movement updates during user interaction. Integrated sticker selection into the existing tool system to support seamless switching between stickers and other tools. Updated mouse event handling to enable precise sticker placement and dragging, added visual feedback for hover and tool selection, and refined the display list to ensure stickers render consistently alongside other commands.
Bug fixes for sticker and marker selection, code order refractoring, as well as making the marker tool remember the users last thickness and saves it.

Step 9 complete
Made sure stickers had a data driven design and that the user could have their own custom stickers. User can now create several custom stickers. Updated style.css to change to default look of the buttons because they were annoying me. Also made it so the marker UI interatcion shows that marker is selected and thin/thick so the user knows the thin/thick tools are connected to the marker tool specifically.
Added an "export" button and linked it to exportDrawing.
Created a temporary 1024x1024 canvas and its context.
Used exportCtx.scale(4, 4) to prepare the context for high-res drawing.
Executed commands.forEach((cmd) => cmd.display(exportCtx)) to draw the content.
Used toDataURL and an anchor tag to trigger the file download.
I also made a necessary correction in the StickerCommand class: when the context is scaled up 4x for the export, text/font sizes must be scaled down 4x inside the display method to maintain the intended visual size in the final 1024x1024 image.