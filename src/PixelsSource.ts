import Hook from "./Hook";
import { pixel } from "./utils";

class PixelsSource extends Array<Array<pixel>> {
  public hook: Hook<[number, number, pixel]>
    = new Hook<[number, number, pixel]>();
  // needs to be set by the api refreshing
  public unreactive: Array<Array<pixel>> = null;
  public constructor(...args) {
    super(...args);
  }
}

export default PixelsSource;