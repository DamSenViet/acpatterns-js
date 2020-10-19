import Drawable from "./Drawable";
import { color } from "./utils";
import chroma from "chroma-js";


/**
 * Represents a pattern that can have an image projected onto it.
 * Allows use of instanceof keyword.
 */
abstract class ImageProjectable extends Drawable {
  /**
   * Returns the closest color in the color palette of the pattern.
   * @param color - the color to compare against
   */
  public static getClosestColor(inputColor: color): color {
    //  assume full rgb space
    if (typeof inputColor === "string") {
      const message = `Expected a valid color representation.`;
      throw new TypeError(message);
    }
    try { chroma(inputColor); }
    catch (error) {
      const message = `Expected a valid color representation.`;
      throw new TypeError(message);
    }
    return inputColor;
  }

  /**
   * Gets the paleete.
   */
  public abstract get palette(): Array<color>;
};

export default ImageProjectable;