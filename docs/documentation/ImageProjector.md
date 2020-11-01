# ImageProjector

## Constructor

Instantiates an ImageProjector.

* Arguments
  + `image`<Badge text="required" type="tip" />
    - Type: `HTMLImageElement`

## Instance Accessors

### image

* `get`
  + Type: `HTMLImageElement`

## Instance Methods

### project

Projects an image onto a pattern.

* Arguments
  + `pattern`<Badge text="required" type="tip" />
    - Type: `AcPattern`
  + `imageOffsetX`
    - Type: `number`
    - Default: `0`
  + `imageOffsetY`
    - Type: `number`
    - Default: `0`
  + `imageOffsetWidth`
    - Type: `number`
    - Default: `this.image.width`
  + `imageOffsetHeight`
    - Type: `number`
    - Default: `this.image.height`
  + `section`
    - Type: `PixelsSource`
    - Default: `pattern.sections.texture`
  + `sectionOffsetX`
    - Type: `number`
    - Default: `0`
  + `sectionOffsetY`
    - Type: `number`
    - Default: `0`
  + `sectionOffsetWidth`
    - Type: `number`
    - Default: `section.width`
  + `sectionOffsetHeight`
    - Type: `number`
    - Default: `section.height`
  + `paletteOffset`
    - Type: `number`
    - Default: `0`
  + `paletteSize`
    - Type: `number`
    - Default: `pattern.palette.length`
  + `opacityThreshold`
    - Type: `number`
    - Default: `1`
  + `imageSmoothingQuality`
    - Type: `ImageProjector.ImageSmoothingQualities`
    - Default: `ImageProjector.ImageSmoothingQualities.None`
  + `colorMatchingMethod`
    - Type: `ImageProjector.ColorMatchingMethods`
    - Default: `ImageProjector.ColorMatchingMethods.RGB`
* Returns
  + Type: `Promise<void>`

``` js
    (async () => {

        /* make the pattern and image */
        const pattern = new acpaterns.formats.Acnl();
        const image = document.createElement("img");
        image.src = "your-image-link or data-url";
        // don't need to wait for the image to load, the imageProjector will wait

        /* options */
        const imageSmoothingQuality = acpatterns.ImageSmotothingQualities.High;
        const colorMatchingMethod = acpatterns.ImageProjector.ColorMatchingMethods.LAB;

        /* project image onto pattern */
        const imageProjector = new acpatterns.ImageProjector(image);
        await imageProjector.project(
            pattern,
        );
    })();
```

## Static Properties

### ImageSmoothingQualities

* Type: `enum`
* Properties:
  + `None`
  + `Low`
  + `Medium`
  + `High`

### ColorMatchingMethods

* Type: `enum`
* Properties:
  + `RGB`
  + `LAB`
  + `CMYK`
  + `GL`
