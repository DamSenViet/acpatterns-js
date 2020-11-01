# Acnl

A `class` representing an Animal Crossing New Leaf in-game pattern.

* Extends: [`AcPattern`](./../AcPattern.md)

## Constructor

Instantiates an Acnl.

* Arguments
  + `acnl`
    - Type: `Acnl`

## Instance Accessors

### title

The title of the Acnl.

* `get`
  + Type: `string`
  + Default: `""`
* `set`
  + Type: `string`
  + Note: limited to 20 characters

### villagerId

The id of the villager. Needs to be equal to in-game `villagerId` for pattern to be editable.

* `get`
  + Type: `number`
  + Default: `0`
* `set`
  + Type: `number`
  + Note: limited to unsigned 16 bit values

### villagerName

The name of the villager.

* `get`
  + Type: `string`
  + Default: `""`
* `set`
  + Type: `string`
  + Note: limited to 8 characters

### villagerIsFemale

The gender flag of the villager.

* `get`
  + Type: `boolean`
  + Default: `false`
* `set`
  + Type: `boolean`

### townId

The id of the town. Needs to be equal to in-game `townId` for pattern to be editable.

* `get`
  + Type: `number`
  + Default: `0`
* `set`
  + Type: `number`
  + Note: limited to unsigned 16 bit values

### townName

The name of the town.

* `get`
  + Type: `string`
  + Default: `""`
* `set`
  + Type: `string`
  + Note: limited to 8 characters

### type

The type of the pattern (e.g. Standard, Shirt, Dress, etc.)

* `get`
  + Type: `PatternType`
  + Default: `Acnl.types.Standard`
* `set`
  + Type: `PatternType`

### palette

A mapping for rendering colors.

* `get`
  + Type: `Array<`[`color`](./../color.md)`>`
  + Default: `new Array<color>(15).fill("#FFFFFF")` .
* `set`
  + Type: `Array<`[`color`](./../color.md)`>`

### pixels

The arrangement of the pixels as a pixel grid, includes unused pixels.

* `get`
  + Type: [`PixelsSource`](./../PixelsSource.md)
  + Default: `new PixelsSource(32, 128)`

### sections

The different possible access mappings of the pattern.

* `get`
  + Type: `Object`
  + Properties:
    - `texture`
      * Type: [`PixelsSource`](./../PixelsSource.md)
    - `[key: string]`
      * Type: [`PixelsSource`](./../PixelsSource.md)

### hooks

The hook system for subscribing to and triggering events.

* `get`
  + Type: `Object`
  + Properties:
    - `type`:
      + Type: [`Hook<[PatternType]>`](./../Hook.md);
    - `palette`
      + Type: [`Hook<[number, `](./../Hook.md)[`color`](./color.md)[`]>`](./../Hook.md);
    - `load`
      + Type: [`Hook<[]>`](./../Hook.md);
    - `refresh`
      + Type: [`Hook<[]>`](./../Hook.md);


## Instance Methods

### toBinaryString

Creates a formatted binary string from an Acnl.

* Returns
  + Type: `string`

### fromBinaryString

Loads data into the Acnl from a formatted binary string.

* Arguments
  + `binaryString`<Badge text="required" type="tip" />
    - Type: `string`
* Returns
  + Type: [`Acnl`](#Acnl)

### toQRCodes

Creates QR Code images for the Acnl.

It creates the most minimal qr code images possible. If you need to scale up
the image to create downloads for it, use a canvas and make sure to do `context.imageSmoothingEnabled=false`;


If you plan on scaling it for display via CSS, use `image-rendering: pixelated`
to tell the browser to keep the sharpness of the original image.

* Returns
  + Type: `Promise<Array<HTMLImageElement>>`

### fromQRCodes

Decodes 1 whole or 4 multipart QR codes to construct an Acnl from the images.
If there are multiple Acnls encoded in the images, loads the first it can
decode.

* Arguments
  + `images`
    - Type: `Array<HTMLImageElement>`
* Returns
  + Type: `Promise<`[`Acnl`](#Acnl)`>`

## Static Properties

### types

The pattern type this format instance is using e.g. Standard, Shirt, Hat, etc.

* Type: `Object`
* Properties:
  + `LongSleevedDress`
    - Type: [`PixelsSource`](./../PixelsSource.md)
  + `ShortSleevedDress`
    - Type: [`PixelsSource`](./../PixelsSource.md)
  + `NoSleevedDress`
    - Type: [`PixelsSource`](./../PixelsSource.md)
  + `LongSleevedShirt`
    - Type: [`PixelsSource`](./../PixelsSource.md)
  + `ShortSleevedShirt`
    - Type: [`PixelsSource`](./../PixelsSource.md)
  + `NoSleevedShirt`
    - Type: [`PixelsSource`](./../PixelsSource.md)
  + `HornedHat`
    - Type: [`PixelsSource`](./../PixelsSource.md)
  + `KnittedHat`
    - Type: [`PixelsSource`](./../PixelsSource.md)
  + `Standee`
    - Type: [`PixelsSource`](./../PixelsSource.md)
  + `Standard`
    - Type: [`PixelsSource`](./../PixelsSource.md)

### colors

The set of colors in the Acnl colorspace.

* Type: `Set<`[`color`](./../color.md)`>`

### colorToByte

The color to byte mappings, used to convert colors to byte values.

* Type: `Map<`[`color`](./../color.md)`, byte>`

### byteToColor

The byte to color mappings, used to convert bytes to colors.

* Type: `Map<byte, `[`color`](./../color.md)`>`

## Static Methods

### nearestColorInColorSpace

Translates the inputColor to the closest available hex color in the space.

* Arguments
  + `color`<Badge text="required" type="tip" />
    - Type: [`color`](./../color.md)
* Returns
  * Type: [`color`](./../color.md)

### toBinaryString

Creates a formatted binary string from an Acnl.

* Arguments
  + `acnl`<Badge text="required" type="tip" />
    - Type: [`Acnl`](#Acnl)
* Returns
  + Type: `string`

### fromBinaryString

Creates an Acnl from a formatted binary string.

* Arguments
  + `binaryString`<Badge text="required" type="tip" />
    - Type: `string`
* Returns
  + Type: [`Acnl`](#Acnl)

### toQRCodes

Creates QR Code images for the Acnl.

* Arguments
  + `acnl`<Badge text="required" type="tip" />
    - Type: [`Acnl`](#Acnl)
* Returns 
  + Type: `Promise<Array<HTMLImageElement>>`

### fromQRCodes

Constructs an acnl from QR Codes.

* Arguments
  + `images`<Badge text="required" type="tip" />
    - Type: `Array<HTMLImageElement>`
* Returns 
  + Type: `Promise<`[`Acnl`](#Acnl)`>`

### readQRCodes

Decodes QR Codes to construct Acnls from the QR Codes in the images.

The image must be sufficiently sharp enough to read the QR codes. Compressed
image formats (like jpeg) are more likely to fail because they introduce noise.

* Arguments
  + `images`<Badge text="required" type="tip" />
    - Type: `Array<HTMLImageElement>`
* Returns 
  + Type: `Promise<Array<`[`Acnl`](#Acnl)`>>`