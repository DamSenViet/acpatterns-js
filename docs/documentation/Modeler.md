# Modeler

A `class` that renders the pattern's preview on the appropriate 3d models and renders the scene.

## Constructor

Instantiates a Modeler.

* Arguments
  + `options`
    - Type: `Object`
    - Properties:
      * `canvas`<Badge text="required" type="tip" />
        * Type: `HTMLCanvasElement`
      * `pattern`<Badge text="required" type="tip" />
        * Type: [`AcPattern`](./AcPattern.md)

## Instance Accessors

### canvas

The canvas that the modeler draws the scene to.

* `get`
  + Type: `HTMLCanvasElement`

### pattern

The pattern that the modeler renders on the model.

* `get`
  + Type: [`AcPattern`](./AcPattern.md)

### source

The source from the pattern to draw. The source can be either the pixels or a section from the pattern.

* `get`
  + Type: [`PixelsSource`](./PixelsSource.md)
  + Default: `pattern.pixels`
* `set`
  + Type: [`PixelsSource`](./PixelsSource.md)

### pixelFilter

Whether or not to apply pixel filtering. If turned on, will incur a slight
performance cost.

* `get`
  + Type: `boolean`
  + Default: `false`
* `set`
  + Type: `boolean`

## Instance Methods

### setup

Sets up the 3d scene. Must be run before the modeler begins reacting to any changes.

* Returns
  + Type: `Promise<void>`

### play

Puts the modeler into a reactive state.

* Returns
  + Type: `Promise<void>`

### pause

Puts the modeler into an unreactive state.

* Returns
  + Type: `Promise<void>`

### dispose

Puts the modeler into a stopped state and cleans up all resources expended.
The modeler cannot be used beyond this function call.

* Returns
  + Type: `Promise<void>`
