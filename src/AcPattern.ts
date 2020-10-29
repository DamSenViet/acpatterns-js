import PatternType from "./PatternType";
import HookSystem from "./HookSystem";
import PixelsSource from "./PixelsSource";
import { color } from "./utils";
import chroma from "chroma-js";

abstract class AcPattern {
  /**
   * Gets the pattern type.
   */
  public abstract get type(): PatternType;

  /**
   * Sets the pattern type.
   */
  public abstract set type(type: PatternType);

  /**
   * Gets the pattern palette.
   */
  public abstract get palette(): Array<color>;

  /**
   * Gets the pattern hooks.
   */
  public abstract get hooks(): HookSystem;

  /**
   * Gets the pattern pixels.
   */
  public abstract get pixels(): PixelsSource;

  /**
   * Gets the pattern sections.
   */
  public abstract get sections(): {
    texture: PixelsSource;
    [key: string]: PixelsSource;
  };

  /**
   * Translates the inputColor to the closest available hex color in the space.
   * @param inputColor - the color to translate into the color space
   */
  public static nearestColorInColorSpace(inputColor: color): color {
    if (typeof inputColor !== "string") {
      const message = `Expected a valid color representation.`;
      throw new TypeError(message);
    }
    try { chroma(inputColor); }
    catch (error) {
      const message = `Expected a valid color representation.`;
      throw new TypeError(message);
    }
    return chroma(inputColor).hex("rgb");
  }
};

export default AcPattern;