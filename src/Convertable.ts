import Drawable from "./Drawable";
import { color } from "./utils";


/**
 * Represents an image convertable pattern class.
 * Allows use of instanceof keyword.
 */
abstract class Convertable extends Drawable {
  /**
   * Returns the closest color in the color palette of the pattern.
   * @param color - the color to compare against
   */
  public static getClosestColor(color: color): color {
    //  assume full rgb space
    return color;
  }

  /**
   * 
   */
  public abstract set palette(colors: Array<color>);
};

export default Convertable;