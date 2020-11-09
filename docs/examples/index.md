# Examples
These examples are code samples that should help you identify the features of
the library. Primarily, we would like to focus on the built-in reactivity
shared by the pattern between its drawers and modelers.

## Pattern usage

Patterns are automatically responsive, so you can manipulate the data structures
as you would without methods.

``` js
import { formats } from "@damsenviet/acpatterns";

// make an Acnl pattern
const pattern = new formats.Acnl();

// make second color in the palette black
pattern.palette[1] = formats.Acnl.nearestColorInColorSpace("black");

// change the type to a dress
pattern.type = formats.Acnl.types.LongSleevedDress;

// make first pixel in the front section black
// all drawers and modelers will automatically update their renders
pattern.sections.front.reactive[0][0] = 1;

// make second pixel int he front section black
// all drawers and modelers will ignore these renders
pattern.sections.front.unreactive[0][1] = 1;

// if you want the all connected reactive drawers and modelers to update
pattern.hooks.refresh.trigger();
```

## Drawer Usage

``` js
import { formats, Drawer, tools } from "@damsenviet/acpatterns";

// the pattern to draw
const pattern = new formats.Acnl();

// change the type to a dress
pattern.type = formats.Acnl.types.LongSleevedDress;

// drawer canvas must have a coordinate space (width/height) that is a multiple of x128
// css width/heights however can be anything
const drawerCanvas = document.querySelector("canvas.drawer");

const drawer = new Drawer({
  pattern,
  canvas: drawerCanvas,
});

// change the section that the drawer draws,
// drawer always draws patterns.pixels, switch to the front of the dress
drawer.source = pattern.sections.front;

// set the drawer's drawing tool for GUI interactivity
const pen = new tools.Pen();
drawer.tool = pen;

// default settings
drawer.pixelFilter = false;
drawer.indicator = false;
drawer.grid = false;

// stop reactivity
drawer.pause();

// continue reactivity
drawer.play();

// clean up spent resources
drawer.dispose();
```

## Modeler Usage

```js
import { formats, Modeler } from "@damsenviet/acpatterns";

// the pattern to model
const pattern = new formats.Acnl();

// should be using modeler in an async context
(async () => {
  
  // no restrictions on modelerCanvas coordinate space (width/height)
  const modelerCanvas = document.querySelector("canvas.modeler");
  
  const modeler = new Modeler({
    pattern,
    canvas: modelerCanvas,
  });
  
  // default settings
  modeler.pixelFilter = false;
  
  // wait on modeler to load resources
  await modeler.setup();
  
  // modeler will automatically swap out model resources
  pattern.type = formats.Acnl.types.LongSleevedDress;
  
  // stop reactivity
  await modeler.pause();
  
  // continue reactivity
  await modeler.play();
  
  // clean up spent resources
  await modeler.dispose();
})();
```


## Reading QR Codes

``` js
import { formats } from "@damsenviet/acpatterns";

(async () => {
  
  // pretend I have references to image objects/elements
  const images = document.querySelectorAll(".qr-code");
  
  // read as many patterns as possible from the images with QR Codes in them
  // static method, reads in many patterns
  const patterns = await formats.Acnl.readQRCodes(images);
  
  try {
    // expects there to actually be at least one Acnl pattern in the QR codes
    const patterns = await formats.Acnl.fromQRCodes(images);
  }
  catch (error) {
    // do something with the error
  }
  
})();
```


## Writing QR Codes

``` js
import { formats } from "@damsenviet/acpatterns";

// the pattern to generate QR codes for
const pattern = new formats.Acnl();

(async () => {
  
  // results are qrcodes using the smallest image sizes possible
  // results are Image instances with the src set
  const qrCodeImages = await pattern.toQRCodes();
})();
```


## Displaying QR Codes

If you're displaying these qr code images via css without scaling them up
manually, you must at the very least adjust the `image-rendering` to make sure
that the browser does not obscure the qr code.

QR code reading depends highly on contrast, and blurring or antialiasing
effects can make QR codes difficult to scan.

If you plan on distributing these QR Codes via image files, you should scale
them up manually via a `<canvas></canvas>`.

``` css
img.qr-code {
  width: 600px;
  height: 600px;
  /* make sure to keep all the following overrides */
  /* when the browser doesn't support one, it falls back to another */
  -ms-interpolation-mode: nearest-neighbor;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
}
```

## Differences between acpatterns-js and acpatterns.com

If you read in a file and the fields aren't the same between acnl files
generated between acpatterns.com and acpatterns-js, this library uses field
limitations based on in-game limits, whereas the internal library at
acpatterns.com uses file-format based limits.

e.g. ACNL only allows villager names to be 8 characters, but the file-format allows for 9 (not counting null termination). This library obeys the 8 character limit set by the developers of the game for safety.