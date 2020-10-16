import AcPattern from "./AcPattern";
import PatternType from "./PatternType";
import HookSystem from "./HookSystem";
import PixelsSource from "./PixelsSource";
import { color } from "./utils";

/**
 * Represents a drawable pattern class.
 * Allows use of instanceof keyword.
 */
abstract class Drawable extends AcPattern {
  
  /**
   * Gets the pattern type.
   */
  public abstract get type(): PatternType;
  
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
};

export default Drawable;