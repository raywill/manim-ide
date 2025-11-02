# Web-based Visual Manim Code Generator

## Project Goal

You are building a lightweight, static, web-based geometry editor inspired by Manim. Build a browser-based Manim scene editor.
Users visually drag and drop shapes (square, rectangle, arrow, line, curve, coordinate system) to design scenes, then click Export to generate clean Manim Python code reproducing the same layout.

The system must run 100 % client-side, no backend, no Node.js build — directly deployable on any HTTP server.


Your goal: allow users to **visually create, move, and label** geometric shapes such as circles, rectangles, and lines on an infinite canvas — and then **export the layout as JSON** that can later be translated into Manim Python code.

System constraints:
- Must be **fully static**: no build tools, no frameworks, no dynamic script loading, no server-side logic.
- Must work when directly opened via HTTP (for example, deployed with "python3 -m http.server").
- Must not rely on any backend API or dynamic data loading.
- Must be contained in **one single HTML file**.
- Must run purely with HTML, CSS, and vanilla JavaScript.
- Must have no external dependencies (no React, no Vue, no CDN scripts).

## Overall Objective

Build a static web app (no backend, no frameworks) that:
	•	Runs directly when opened in a browser (index.html on an HTTP server).
	•	Lets users drag, move, and configure geometric shapes.
	•	Allows users to click Export → generates clean, minimal Manim code.


## Core Functional Requirements

Interface Layout

Top Toolbar
	•	Contains Export button (and later Undo / Redo).
	•	Export → opens modal window with generated Manim code (copyable).

Left Toolbox
	•	Lists draggable items: Square, Rectangle, Arrow, Line, Curve, Coordinate System.
	•	Drag-and-drop to Canvas to create instances.

Canvas (Center)
	•	Infinite or scrollable 2D editing area.
	•	Supports:
	•	Selecting, moving, deleting elements.
	•	Crosshair guide lines during dragging (center = (0, 0)).
	•	Simple zoom / pan via mouse wheel & drag (optional Phase 2).
	•	Uses coordinate system matching Manim’s (origin center, Y up).

Right Property Panel
	•	Hidden by default, slides in when double-clicking an element.
	•	Displays editable fields for that element type:
	•	live-updates the canvas immediately.
	•	Closes when clicking outside or pressing ESC.

Supported Element Types

Element
Editable Properties
Default Values
Square
x, y, size, color, opacity
size = 1
Rectangle
x, y, width, height, color, opacity
2×1 blue
Arrow
start(x, y), end(x, y), color, stroke_width
red
Line
start(x, y), end(x, y), color, stroke_width
black
Curve
list of (x, y) points, color, smoothness
3 points
CoordinateSystem
x_range, y_range, axis_color, grid_color
default


Common attributes for all: draggable, selectable, deletable, hide(if selected, don't export this element).


## Export Function

Generate fully valid Manim CE Python code, e.g.:

```
from manim import *

class GeneratedScene(Scene):
    def construct(self):
        square = Square(side_length=2, color=BLUE).move_to([1, 2, 0])
        arrow = Arrow(start=[-2, 0, 0], end=[2, 0, 0], color=RED)
        self.add(square, arrow)
```

	•	Export output must exactly match the visual scene.
	•	No unnecessary imports or variables.

## Technical & Architectural Constraints
1.	Zero-build / zero-backend
	•	Only plain HTML + CSS + JavaScript (ES6).
	•	Must run by opening index.html locally or on static server.
	•	Allowed small helper libs: interact.js (drag/drop), jscolor, or tiny utilities.

2.	File Structure

```
/index.html
/css/style.css
/js/
    core.js          # canvas management
    ui.js            # toolbox, panels
    export.js        # code generation
    plugins/
        square.js
        rectangle.js
        arrow.js
```

3.	Extensible Plugin System
	•	Each shape type = one plugin module defining:
```
registerShape({
  type: "square",
  icon: "🟦",
  createDefault(),
  render(ctx, props),
  toManim(props)
});
```

	•	Adding new types requires only adding a file in /plugins/.

4.	Data Model

{
  "type": "square",
  "name": "my_square_1",
  "props": { "x":0, "y":0, "size":2, "color":"#00FF00" }
}

## Advanced Features

Scene Editing
	•	Undo / Redo stack for all actions.
	•	Copy / Paste / Duplicate elements.
	•	Snap-to-grid and alignment guides (e.g., edge snapping).
	•	Multi-select and grouping (move or export as a group).


Custom Plugin API
	•	Developers can create new object types by adding a JS module in /plugins/.
	•	Each plugin defines:
	•	Preview icon.
	•	Default props.
	•	Render function (HTML canvas)
	•	Python export logic

Quality-of-Life
	•	Auto-save to localStorage.
	•	Import / Export JSON scene files.
	•	Code preview panel with syntax highlighting.




Functional requirements explained:
1. Display a clean top toolbar with buttons for:
   - Select
   - Circle
   - Rectangle
   - Line
   - Label
   - Export JSON
2. When the user clicks one of the shape tools, the canvas should enter "draw mode".
   - Clicking and dragging draws the chosen shape.
   - For a label, clicking prompts for text input.
3. Shapes must render directly on the SVG canvas.
4. Each shape’s coordinates and properties (x, y, radius, width, height, etc.) are recorded in an internal list.
5. The "Export JSON" button must generate and download a JSON file describing all drawn elements.

UI guidelines:
- Toolbar stays fixed at the top, black or dark gray background, white text.
- The main drawing area is a white SVG canvas occupying the rest of the screen.
- Cursor changes to a crosshair when drawing shapes.
- The interface should feel minimal and clean, similar to GeoGebra or Desmos simplicity.

Output format:
- Exported JSON should have an array of element objects like:
  [
    { "type": "circle", "name": "a", "cx": 100, "cy": 120, "r": 40 },
    { "type": "rect", "name": "b", "x": 10, "y": 10, "w": 60, "h": 40 },
    { "type": "label", "name": "c", "x": 120, "y": 80, "text": "a + b" }
  ]

Deliverable:
- A single HTML file implementing the above behavior.
- It should run standalone when opened in any browser.
- Use only inline CSS and vanilla JavaScript.
- All shape creation and manipulation logic should be self-contained in this one file.

Bonus (optional):
- Support selecting and moving shapes after creation.
- Allow renaming labels via double-click.
- Consider simple bounding box highlight when a shape is selected.
