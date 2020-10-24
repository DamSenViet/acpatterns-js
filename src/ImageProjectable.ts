import PixelsSource from "./PixelsSource";
import HookSystem from "./HookSystem";
import { color } from "./utils";
import chroma from "chroma-js";


/**
 * Represents a pattern that can have an image projected onto it.
 * Allows use of instanceof keyword.
 */
interface ImageProjectable {
  /**
   * Gets the pattern palette.
   */
  palette: Array<color>;

  /**
   * Gets the pattern hooks.
   */
  hooks: HookSystem;

  /**
   * Gets the pattern pixels.
   */
  pixels: PixelsSource;

  /**
   * Gets the pattern sections.
   */
  sections: {
    texture: PixelsSource;
    [key: string]: PixelsSource;
  };

  /**
   * Returns the closest color in the color space of the pattern.
   * @param color - the color to match
   */
  nearestInColorSpace(inputColor: color): color;
};

export const ImageProjectables: Array<Function> = [];

export const isInstanceofImageProjectable = (object: any): boolean => {
  for (const ImageProjectable of ImageProjectables) {
    if (!(object instanceof ImageProjectable)) continue;
    return true;
  }
  return false;
};

export default ImageProjectable;