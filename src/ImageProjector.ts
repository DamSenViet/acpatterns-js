import AcPattern from "./AcPattern";
import PixelsSource from "./PixelsSource";
import { color, paletteIndex, } from "./utils";
import chroma from "chroma-js";
import { ImageProjectingError } from "./errors";
import PnnQuant from "pnnquant";


enum ImageSmoothingQualities {
  None = "none",
  Low = "low",
  Medium = "medium",
  High = "high",
};

enum ColorMatchingMethods {
  RGB = "rgb",
  LAB = "lab",
  CMYK = "cmyk",
  GL = "gl",
};

/**
 * Converts an image onto a pattern.
 */
class ImageProjector {
  /**
   * All possible image smoothing quliaties.
   */
  public static ImageSmoothingQualities: typeof ImageSmoothingQualities = ImageSmoothingQualities;

  /**
   * All possible color selection methods.
   */
  public static ColorMatchingMethods: typeof ColorMatchingMethods = ColorMatchingMethods;

  /**
   * The image to project.
   */
  protected _image: HTMLImageElement = null;


  /**
   * Instantiates a Converter.
   * @param image - the image to project
   */
  public constructor(image) {
    if (!(image instanceof HTMLImageElement)) {
      const message = `Expected an HTMLImageElement.`;
      throw new TypeError(message);
    }
    this._image = image;
  }
  
  
  /**
   * Gets the image.
   */
  public get image(): HTMLImageElement {
    return this._image;
  }
  
  
  /**
   * Projects an image onto a pattern.
   * @param pattern - the pattern that will be modified
   * @param imageOffsetX -the x of the top left corner of the sub-rectangle in the image
   * @param imageOffsetY - the y  of the top left corner of the sub-rectangle in the image
   * @param imageOffsetWidth - the width of the sub-rectangle in the image
   * @param imageOffsetHeight - the height of the sub-rectangle in the image
   * @param section - the section to project the image onto
   * @param sectionOffsetX - the x of the top left corner of the sub-rectangle in the section
   * @param sectionOffsetY - the y of the top right corner of the sub-rectangle in the section
   * @param sectionOffsetWidth - the width of the sub-rectangle in the section
   * @param sectionOffsetHeight - the height of the sub-rectangle in the section
   * @param paletteOffset - the starting index in the palette that will be overwritten
   * @param paletteSize - the number of palette indexes that will be used to convert the image
   * @param opacityThreshold - a number from 0 to 1, opacity values below this threshold are transparent
   * @param imageSmoothingQuality - the image smoothing quality performed during downscaling
   * @param colorMatchingMethod - the color matching method from pixel to palette
   * @returns - a Promise resolving to void
   */
  public async project(
    pattern: AcPattern,
    imageOffsetX: number = 0,
    imageOffsetY: number = 0,
    // do not need to check aspect ratios, auto stretching to match
    imageOffsetWidth: number = this._image.width,
    imageOffsetHeight: number = this._image.height,
    section: PixelsSource = pattern.sections.texture,
    sectionOffsetX: number = 0,
    sectionOffsetY: number = 0,
    sectionOffsetWidth: number = section.width,
    sectionOffsetHeight: number = section.height,
    paletteOffset: number = 0,
    paletteSize: number = pattern.palette.length - paletteOffset,
    opacityThreshold: number = 1,
    imageSmoothingQuality: ImageSmoothingQualities = ImageSmoothingQualities.None,
    colorMatchingMethod: ColorMatchingMethods = ColorMatchingMethods.RGB,
  ): Promise<void> /* throws TypeError, RangeError, ImageProjectingError */ {
    const { _image: image } = this;

    // verify image dimensions and subsection size valid
    if (
      typeof imageOffsetX !== "number" ||
      !Number.isInteger(imageOffsetX) ||
      typeof imageOffsetY !== "number" ||
      !Number.isInteger(imageOffsetY) ||
      typeof imageOffsetWidth !== "number" ||
      !Number.isInteger(imageOffsetWidth) ||
      typeof imageOffsetHeight !== "number" ||
      !Number.isInteger(imageOffsetHeight)
    ) {
      const message = `Expected image measurements to be integers.`;
      throw new TypeError(message);
    }

    if (
      imageOffsetX < 0 || imageOffsetX >= image.width ||
      imageOffsetY < 0 || imageOffsetY >= image.height ||
      imageOffsetWidth < 0 || imageOffsetWidth > image.width - imageOffsetX ||
      imageOffsetHeight < 0 || imageOffsetHeight > image.height - imageOffsetY
    ) {
      const message = `Sub-image must be located inside the image.`;
      throw new RangeError(message);
    }

    // verify pattern
    if (!(pattern instanceof AcPattern)) {
      const message = `Expected an instance of a pattern.`;
      throw new TypeError(message);
    }

    // verify palette measurement types
    if (
      typeof paletteOffset !== "number" ||
      !Number.isInteger(paletteOffset) ||
      typeof paletteSize !== "number" ||
      !Number.isInteger(paletteSize)
    ) {
      const message = `Expected palette measurements to be integers.`;
      throw new TypeError(message);
    }

    // verify palette sizes are correct
    if (
      paletteOffset < 0 ||
      paletteOffset >= pattern.palette.length
    ) {
      const message = `Palette offset be an index from the palette.`;
      throw new RangeError(message);
    }

    if (
      paletteSize < 0 ||
      paletteSize > pattern.palette.length - paletteOffset
    ) {
      const message = `Palette size must fit in the palette starting from palette offset.`;
      throw new RangeError(message);
    }

    // verify section belongs to pattern
    let isFromPattern = false;
    for (const sectionName in pattern.sections) {
      if (section === pattern.sections[sectionName]) {
        isFromPattern = true;
        break;
      }
    }
    if (section === pattern.pixels) isFromPattern = true;
    if (!isFromPattern) {
      const message = `Section must directly belong to the pattern.`;
      throw new TypeError(message);
    }

    // verify section types
    if (
      typeof sectionOffsetX !== "number" ||
      !Number.isInteger(sectionOffsetX) ||
      typeof sectionOffsetY !== "number" ||
      !Number.isInteger(sectionOffsetY) ||
      typeof sectionOffsetWidth !== "number" ||
      !Number.isInteger(sectionOffsetWidth) ||
      typeof sectionOffsetHeight !== "number" ||
      !Number.isInteger(sectionOffsetHeight)
    ) {
      const message = `Expected section measurements to be integers.`;
      throw new TypeError(message);
    }

    // verify section measurements
    if (
      sectionOffsetX < 0 || sectionOffsetX >= section.width ||
      sectionOffsetY < 0 || sectionOffsetY >= section.height ||
      sectionOffsetWidth < 0 || sectionOffsetWidth > section.width - sectionOffsetX ||
      sectionOffsetHeight < 0 || sectionOffsetHeight > section.height - sectionOffsetY
    ) {
      const message = `Sub-section must be located inside the section.`;
      throw new RangeError(message);
    }

    // validate options
    if (
      typeof opacityThreshold !== "number" ||
      opacityThreshold < 0 ||
      opacityThreshold > 1
    ) {
      const message = `Expected opacity threshold to be a value from 0 to 1.`;
      throw new RangeError(message);
    }

    if (
      !Object.values(ImageSmoothingQualities)
        .includes(imageSmoothingQuality)
    ) {
      const message = `Expected a valid image smoothing quality.`;
      throw new TypeError(message);
    }

    if (
      !Object.values(ColorMatchingMethods)
        .includes(colorMatchingMethod)
    ) {
      const message = `Expected a valid color matching method.`;
      throw new TypeError(message);
    }

    const imageCopy: HTMLImageElement = document.createElement("img");
    await new Promise((resolve, reject) => {
      imageCopy.addEventListener("load", () => {
        resolve();
      });
      const onImageError = () => {
        imageCopy.removeEventListener("error", onImageError);
        const message = `The image at ${imageCopy.src} could not be loaded.`;
        reject(new ImageProjectingError(message));
      };
      imageCopy.addEventListener("error", onImageError);
      imageCopy.src = image.src;
      imageCopy.width = image.width;
      imageCopy.height = image.height;
    });

    // draw subImage to canvas
    const subImageCanvas: HTMLCanvasElement = document.createElement("canvas");
    subImageCanvas.width = imageOffsetWidth;
    subImageCanvas.height = imageOffsetHeight;
    const subImageContext: CanvasRenderingContext2D = subImageCanvas.getContext("2d");
    subImageContext.imageSmoothingEnabled = false;
    subImageContext.drawImage(
      image,
      imageOffsetX,
      imageOffsetY,
      imageOffsetWidth,
      imageOffsetHeight,
      0,
      0,
      imageOffsetWidth,
      imageOffsetHeight,
    );

    // scale down the image section so it fits into the pattern section
    const subSectionCanvas: HTMLCanvasElement = document.createElement("canvas");
    const subSectionContext: CanvasRenderingContext2D = subSectionCanvas.getContext("2d");
    subSectionCanvas.width = sectionOffsetWidth;
    subSectionCanvas.height = sectionOffsetHeight;

    subSectionContext.imageSmoothingEnabled = false;
    if (imageSmoothingQuality !== ImageSmoothingQualities.None) {
      subSectionContext.imageSmoothingEnabled = true;
      subSectionContext.imageSmoothingQuality = imageSmoothingQuality;
    }

    subSectionContext.clearRect(0, 0, sectionOffsetWidth, sectionOffsetHeight);
    subSectionContext.drawImage(
      subImageCanvas,
      0,
      0,
      sectionOffsetWidth,
      sectionOffsetHeight
    );
    const imageData = subSectionContext.getImageData(
      0,
      0,
      sectionOffsetWidth,
      sectionOffsetHeight
    );

    // choose palette after downscaling for better results
    const pnngquant: PnnQuant = new PnnQuant({
      pixels: new Uint32Array(
        subSectionContext
          .getImageData(0, 0, sectionOffsetWidth, sectionOffsetHeight)
          .data.buffer
      ),
      colors: paletteSize,
      dithering: false,
    });
    pnngquant.quantizeImage();
    const pngquantPaletteBuffer: Uint8Array = new Uint8Array(pnngquant.getPalette());
    const imageChromaColors: Array<chroma.Color> = [];
    for (let i = 0; i < pngquantPaletteBuffer.length; i += 4) {
      const r: number = pngquantPaletteBuffer[i + 0];
      const g: number = pngquantPaletteBuffer[i + 1];
      const b: number = pngquantPaletteBuffer[i + 2];
      // const a: number = pngquantPaletteBuffer[i + 3];
      imageChromaColors.push(chroma(r, g, b));
    }

    // get unique colors closest to the one in the colorspace
    const uniqueColors = new Set<color>();
    for (let i: number = 0; i < imageChromaColors.length; ++i) {
      const chromaColor: chroma.Color = imageChromaColors[i];
      uniqueColors.add(
        (pattern.constructor as typeof AcPattern)
          .nearestColorInColorSpace(chromaColor.hex("rgb"))
          .toUpperCase());
    }
    const colors: Array<color> = [...uniqueColors];

    // assign colors to the palette
    for (let i: number = 0; i < colors.length; ++i) {
      pattern.palette[i + paletteOffset] = colors[i];
    }

    // select paletteIndex closest to the one in the palette for every pixel
    for (let x = 0; x < imageData.width; ++x) {
      for (let y = 0; y < imageData.height; ++y) {
        const sectionY: number = y + sectionOffsetY;
        const sectionX: number = x + sectionOffsetX;
        // imageData is a linear array
        const imageDataOffset = (x + (y * imageData.width)) * 4;
        const r: number = imageData.data[imageDataOffset + 0];
        const g: number = imageData.data[imageDataOffset + 1];
        const b: number = imageData.data[imageDataOffset + 2];
        // 0 means transparent and 255 means opaque
        const a: number = imageData.data[imageDataOffset + 3];
        const opacity: number = a / 255;
        // if a is not above or equal to alpha threshold, make that pixel transparent
        if (opacity < opacityThreshold) {
          section.unreactive[sectionX][sectionY] = pattern.palette.length;
          continue;
        }

        // find closest color in palette set pixel to that color
        let closestColorPaletteIndex: paletteIndex = null;
        let closestColorDistance: number = null;
        for (let i = paletteOffset; i < paletteOffset + colors.length; ++i) {
          const chromaColor: chroma.Color = chroma(r, g, b).alpha(a / 255);
          const distance: number = chroma.distance(
            chromaColor,
            pattern.palette[i],
            colorMatchingMethod,
          );
          if (
            closestColorPaletteIndex != null &&
            distance >= closestColorDistance
          ) continue;
          closestColorPaletteIndex = i;
          closestColorDistance = distance;
          section.unreactive[sectionX][sectionY] = closestColorPaletteIndex;
        }
      }
    }
    pattern.hooks.refresh.trigger();
  }
}

export default ImageProjector;