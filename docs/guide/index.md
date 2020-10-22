# Guide


## Introduction

This library provides data structures for manipulating Animal Crossing
patterns and utility structures like drawers and modelers that handle
rendering the contents of a pattern format. It can also provide the same pixel
filtering effect similar to the one in-game. It gives you the ability to
manipulate the pattern data structures directly or via UI and have those
changes reflect in the 2D and 3D renders immediately.

 <GuideIntroduction />


## Installation

To install and use the library please choose one of the installation methods
listed below. Please note that [babylonjs](https://www.babylonjs.com/), the
rendering engine is required to use the modeler.

1. **NPM**

``` bash
# core library
npm install acpatterns
# if you need the modeler
npm install babylonjs babylonjs-loaders
```

2. **YARN**

``` bash
# core library
yarn add acpatterns
# if you need the modeler
yard add babylonjs babylonjs-loaders
```

3. **CDN**

<code-group>
<code-block title="unpkg">

``` html
<!-- if you need the modeler -->
<script src="https://unpkg.com/babylonjs@^4.1.0/babylon.js"></script>
<script src="https://unpkg.com/babylonjs-loaders@^4.1.0/babylonjs.loaders.min.js"></script>
<!-- core library -->
<script src="https://unpkg.com/acpatterns"></script>
```

</code-block>
</code-group>


## Quick Start

To manipulate the pattern via UI, initiate a pattern instance and link it to
a `Drawer`. Make the drawer draw the tool indicators, the grid and then set the
drawer's tool. The following will render the content of the patterns
as their texture representation and allow you to draw on the canvas.

<GuideQuickStart />

``` html
<!-- canvas width and height must be equal and a multiple of 128 -->
<!-- width and height attribute sets up coordinate space -->
<canvas class="drawer" width="640" height="640"></canvas>
<style>
    /* make the browser scale the canvas width and height instead */
    /* maintain same width/height ratio to prevent stretching */
    .drawer {
        width: 300px;
        height: 300px;
    }
</style>
```

Assuming you have the following HTML content, you can link a pattern to a
`Drawer` in this quick start guide like so:

1. **ES Modules**

If you installed the library via `npm` or `yarn` use the code below.

<code-group>
<code-block title="JavaScript">

``` js
import {
  Acnl,
  Drawer,
  tools,
} from "acpatterns";

// this or maybe a ref to the canvas in a component system
const drawerCanvas = document.querySelector(".drawer");

// make last color in palette black
const acnl = new Acnl();
acnl.palette[acnl.palette.length - 1] = Acnl.getClosestColor("black");

// make pen use last color in the palette
const pen = new tools.Pen({ size: 1 });
pen.paletteIndex = acnl.palette.length - 1;

// make the drawer draw the texture representation of the pattern
const drawer = new Drawer({
  canvas: drawerCanvas,
  pattern: acnl,
});
drawer.source = acnl.sections.texture;
drawer.grid = true;
drawer.indicator = true;
drawer.tool = pen;
```

</code-block>

<code-block title="TypeScript">

``` ts
import {
  Acnl,
  Drawer,
  tools,
} from "acpatterns"; 

// this or maybe a ref to the canvas in a component system
const drawerCanvas: HTMLCanvasElement = document.querySelector(".drawer");

// make last color in palette black
const acnl: Acnl = new Acnl();
acnl.palette[acnl.palette.length - 1] = Acnl.getClosestColor("black");

// make pen use last color in the palette
const pen: Pen = new tools.Pen({ size: 1 });
pen.paletteIndex = acnl.palette.length - 1;

// make the drawer draw the texture representation of the pattern
const drawer: Drawer = new Drawer({
  canvas: drawerCanvas,
  pattern: acnl,
});
drawer.source = acnl.sections.texture;
drawer.grid = true;
drawer.indicator = true;
drawer.tool = pen;
```

</code-block>
</code-group>

2. **Script**

If you installed the library via `<script></script>` , use this code instead.

``` html
<script>
  const drawerCanvas = document.querySelector(".drawer");

  // make last color in palette black
  const acnl = new acpatterns.Acnl();
  acnl.palette[acnl.palette.length - 1] = acnl.constructor.getClosestColor("black");

  // make pen use last color in the palette
  const pen: Pen = new acpatterns.tools.Pen({ size: 1 });
  pen.paletteIndex = acnl.palette.length - 1;

  // make the drawer draw the texture representation of the pattern
  const drawer = new acpatterns.Drawer({
    canvas: drawerCanvas,
    pattern: acnl,
  });
  drawer.source = acnl.sections.texture;
  drawer.grid = true;
  drawer.indicator = true;
  drawer.tool = pen;
</script>
```