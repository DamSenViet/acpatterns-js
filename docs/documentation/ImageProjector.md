# ImageProjector

## Constructor

Instantiates an ImageProjector.

## Instance Methods

### project

Projects an image onto a pattern.

* Arguments
  + `image`
    - Type: `HTMLImageElement`
    - Required: `true`
  + `imageOffsetX`
    - Type: `number`
    - Default: `0`
    - Required: `false`
  + `imageOffsetY`
    - Type: `number`
    - Default: `0`
    - Required: `false`
  + `imageOffsetWidth`
    - Type: `number`
    - Default: `image.width`
    - Required: `false`
  + `imageOffsetHeight`
    - Type: `number`
    - Default: `image.height`
    - Required: `false`
  + `pattern`
    - Type: `AcPattern`
    - Required: `true`
  + `paletteOffset`
    - Type: `number`
    - Default: `0`
    - Required: `false`
  + `paletteSize`
    - Type: `number`
    - Default: `pattern.palette.length`
    - Required: `false`
  + `section`
    - Type: `PixelsSource`
    - Default: `pattern.sections.texture`
    - Required: `false`
  + `sectionOffsetX`
    - Type: `number`
    - Default: `0`
    - Required: `false`
  + `sectionOffsetY`
    - Type: `number`
    - Default: `0`
    - Required: `false`
  + `sectionOffsetWidth`
    - Type: `number`
    - Default: `section.width`
    - Required: `false`
  + `sectionOffsetHeight`
    - Type: `number`
    - Default: `section.height`
    - Required: `false`
  + `opacityThreshold`
    - Type: `number`
    - Default: `1`
    - Required: `false`
  + `imageSmoothingQuality`
    - Type: `ImageProjector.ImageSmoothingQualities`
    - Default: `ImageProjector.ImageSmoothingQualities.None`
    - Required: `false`
  + `colorMatchingMethod`
    - Type: `ImageProjector.ColorMatchingMethods`
    - Default: `ImageProjector.ColorMatchingMethods.RGB`
    - Required: `false`
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
        const imageProjector = new acpatterns.ImageProjector();
        await imageProjector.project({
            image,
            pattern,
            imageSmoothingQuality,
            colorMatchingMethod,
        });

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
