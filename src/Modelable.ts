import AcPattern from "./AcPattern";
import PatternType from "./PatternType";
import HookSystem from "./HookSystem";
import PixelsSource from "./PixelsSource";
import { color } from "./utils";

/**
 * Represents a drawable pattern class.
 * Allows use of instanceof keyword.
 */
interface Modelable extends AcPattern {

  /**
   * Gets the pattern type.
   */
  type: PatternType;

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
};

export const Modelables: Array<Function> = [];

export const isInstanceofModelable = (object: any): boolean => {
  for (const Modelable of Modelables) {
    if (!(object instanceof Modelable)) continue;
    return true;
  }
  return false;
};

export default Modelable;