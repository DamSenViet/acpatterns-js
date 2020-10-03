import Hook from "./Hook";
import { paletteIndex } from "./utils";

/**
 *  Hookable pixel grid, unreactive optional.
 */
class PixelsSource extends Array<Array<paletteIndex>> {
  public hook: Hook<[number, number, paletteIndex]>
    = new Hook<[number, number, paletteIndex]>();
  // needs to be set by the api refreshing
  public unreactive: Array<Array<paletteIndex>> = null;
  public constructor(...args) {
    super(...args);
  }
}

export default PixelsSource;