# Pen

A `class` that pens in square areas for the [Drawer](./../Drawer.md).

* Extends: [`Tool`](./Tool.md)

## Constructor

Instantiates a Pen tool.

* Arguments
  + `options`
    - Type: `Object`
    - Properties:
      * `size`
        * Type: `number`
      * `paletteIndex`
        * Type: [`paletteIndex`](./../paletteIndex.md)

## Instance Accessors

### size

The size of the square area to draw using the pen.

* `get`
  + Type: `number`
  + Default: `1`
* `set`
  + Type: `number`

### paletteIndex

The index on the palette indicating the color to fill in the pixel.

* `get`
  + Type: `number`
  + Default: `0`
* `set`
  + Type: `number`  