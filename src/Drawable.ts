import AcPattern from "./AcPattern";
import PatternType from "./PatternType";
import HookSystem from "./HookSystem";
import PixelsSource from "./PixelsSource";
import { color } from "./utils";

/**
 * Another pure utility class for non-TypeScript users.
 * Allows use of instanceof keyword.
 */
abstract class Drawable extends AcPattern {
  
  public abstract get type(): PatternType;
  
  public abstract set type(type: PatternType);
  
  public abstract get palette(): Array<color>;
  
  public abstract get hooks(): HookSystem;
  
  public abstract get pixels(): PixelsSource;
  
  public abstract get sections(): {
      texture: PixelsSource;
      [key: string]: PixelsSource;
  };
  
};

export default Drawable;