# Drawer

A `class` that renders the pattern's pixels or specific sections in 2d. It is also
responsible for mounting and unmounting interactive UI drawing tools.

## Constructor

Instantiates a Drawer.

* Arguments
  + `options`
    - Type: `Object`
    - Properties:
      * `canvas`
        * Type: `HTMLCanvasElement`
        * Required: `true`
      * `pattern`
        * Type: [`AcPattern`](./AcPattern)
        * Required: `true`

## Instance Accessors

### canvas

The canvas that the drawer draws the pattern on.

* `get`
  + Type: `HTMLCanvasElement`

### pattern

The pattern that the drawer draws.

* `get`
  + Type: [`AcPattern`](./AcPattern.md)

### source

The source from the pattern to draw. The source can be either the pixels or a section from the pattern.

* `get`
  + Type: [`PixelsSource`](./PixelsSource.md)
  + Default: `pattern.pixels`
* `set`
  + Type: [`PixelsSource`](./PixelsSource.md)
  

### tool

The tool that drawer has mounted on the canvas.

* `get`
  + Type: `Tool`
  + Default: `null`
* `set`
  + Type: `Tool`

### pixelFilter

Whether or not to apply pixel filtering. If turned on, will incur a slight
performance cost.

* `get`
  + Type: `boolean`
  + Default: `false`
* `set`
  + Type: `boolean`

### grid

Whether to render the grid.

* `get`
  + Type: `boolean`
  + Default: `false`
* `set`
  + Type: `boolean`

### indicator

Whether to render the tool's indicators.

* `get`
  + Type: `boolean`
  + Default: `false`
* `set`
  + Type: `boolean`

## Instance Methods

### play

Puts the drawer into a reactive state.

* Returns
  + Type: `void`

### pause

Puts the drawer into an unreactive state.

* Returns
  + Type: `void`

### dispose

Puts the drawer into a stopped state and cleans up all resources expended.
The drawer cannot be used beyond this function call.

* Returns
  + Type: `void`
