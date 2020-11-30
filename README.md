# acpatterns-js

A JavaScript programming library to edit and preview Animal Crossing pattern files.

Based on our internal library at https://github.com/Thulinma/ACNLPatternTool/.

## Table of Contents

* [Documentation](#documentation)
* [Installation](#installation)
* [Quick Start](#quick-start)
* [Contributors](#contributors)

## Documentation

To view documentation, examples, or a playground demo, visit the [documentation site](https://damsenviet.github.io/acpatterns-js/).

## Installation

To install and use the library, choose one of the installation methods listed
below. Please note that [babylonjs](https://www.babylonjs.com/), the rendering
engine is required to use the modeler.

1. **NPM**

``` bash
# core library
npm install @damsenviet/acpatterns
# if you need the modeler
npm install babylonjs@">=4.1.0" babylonjs-loaders@">=4.1.0"
```

2. **YARN**

``` bash
# core library
yarn add @damsenviet/acpatterns
# if you need the modeler
yarn add babylonjs@">=4.1.0" babylonjs-loaders@">=4.1.0"
```

3. **CDN**

``` html
<!-- if you need the modeler -->
<script src="https://unpkg.com/babylonjs@^4.1.0/babylon.js"></script>
<script src="https://unpkg.com/babylonjs-loaders@^4.1.0/babylonjs.loaders.min.js"></script>
<!-- core library -->
<script src="https://unpkg.com/@damsenviet/acpatterns"></script>
```

## Quick Start

To manipulate the pattern via UI, initiate a pattern instance and link it to
a `Drawer` . Make the drawer draw the tool indicators and the grid, and then set the
drawer's tool. The following will render the content of the patterns
as their texture representation and allow you to draw on the canvas.

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

**ES Modules**

``` js
import {
    formats,
    Drawer,
    tools,
} from "@damsenviet/acpatterns";

// need reference to the canvas
const drawerCanvas = document.querySelector(".drawer");

// make last color in palette black
const acnl = new formats.Acnl();
acnl.palette[acnl.palette.length - 1] = acnl.constructor.nearestColorInColorSpace("black");

// make pen use last color in the palette
const pen = new tools.Pen({
    size: 1
});
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

**Script**

``` html
<script>
    const drawerCanvas = document.querySelector(".drawer");

    // make last color in palette black
    const acnl = new acpatterns.formats.Acnl();
    acnl.palette[acnl.palette.length - 1] = acnl.constructor.nearestColorInColorSpace("black");

    // make pen use last color in the palette
    const pen = new acpatterns.tools.Pen({
        size: 1
    });
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

## Contributors

Thanks goes out to my [acpatterns](https://acpatterns.com/) team for contributing solutions to this library.

* [MelonSpeedruns](https://twitter.com/MelonSpeedruns) - datamining the files
* [Thulinma](https://github.com/Thulinma) - reverse engineering the file formats
* [Myumi](https://github.com/myumi) - modifying the the qr-code library
* [Tero](https://tero.space/) - designing our graphical assets
* [daelsepara](https://github.com/daelsepara) - porting the pixel filter
