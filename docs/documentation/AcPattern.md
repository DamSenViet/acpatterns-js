# AcPattern

An `abstract class` for all pattern formats to inherit.

## Instance Accessors

### type

The type of the pattern (e.g. Standard, Shirt, Dress, etc.)

* `get`
  + Type: `PatternType`
* `set`
  + Type: `PatternType`

### palette

The mapping for rendering colors.

* `get`
  + Type: `Array<`[`color`](./color.md)`>`

### pixels

The arrangement of the pixels as a pixel grid, includes unused pixels.

* `get`
  + Type: [`PixelsSource`](./PixelsSource.md)

### sections

The different possible access mappings of the pattern.

* `get`
  + Type: `Object`
  + Properties:
    - `texture`
      * Type: [`PixelsSource`](./PixelsSource.md)
    - `[key: string]`
      * Type: [`PixelsSource`](./PixelsSource.md)

### hooks

The hook system for subscribing to and triggering events.

* `get`
  + Type: [`HookSystem`](./HookSystem.md)

## Static Methods

### nearestColorInColorSpace

Translates the inputColor to the closest available hex color in the space.

* Arguments:
  + `inputColor`<Badge text="required" type="tip" />
    - Type: [`color`](./color.md)
* Returns
  + Type: [`color`](./color.md)
