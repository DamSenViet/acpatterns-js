import Hook from "./Hook";
import { paletteIndex, FixedLengthArray, fixedLengthPropertyConfig } from "./utils";

/**
 *  Hookable pixel grid, provides reactive and unreactive accessors.
 */
class PixelsSource {
  /**
   * The width of the pixel grid.
   */
  private _width: number = null;

  /**
   * The height of the pixel grid.
   */
  private _height: number = null;

  /**
   * The pixel grid that is meant to be reactive, calls hook when items change.
   */
  private _reactive: FixedLengthArray<FixedLengthArray<paletteIndex>> = null;

  /**
   * The pixel grid that is not reactive, does not call hook when items change.
   */
  private _unreactive: FixedLengthArray<FixedLengthArray<paletteIndex>> = null;

  /**
   * The hook structure for the reactive
   */
  public hook: Hook<[number, number, paletteIndex]>
    = new Hook<[number, number, paletteIndex]>();


  /**
   * Instantiates a PixelsSource.
   * @param width - the width of the pixel grid
   * @param height - the height of the pixel grid
   */
  public constructor(width: number, height: number) {
    if (
      typeof width !== "number" ||
      !Number.isInteger(width) ||
      typeof height !== "number" ||
      !Number.isInteger(height)
    ) {
      const message = `Expected width and height to be a positive integer.`;
      throw new TypeError(message);
    }

    if (
      width < 0 ||
      height < 0
    ) {
      const message = `Expected width and height to be a positive integer.`;
      throw new RangeError(message);
    }

    this._width = width;
    this._height = height;

    this._reactive = <FixedLengthArray<FixedLengthArray<paletteIndex>>>
      <unknown>new Array(width).fill(0).map(() => {
        const column = new Array(height).fill(0);
        Object.defineProperty(column, "length", {
          ...fixedLengthPropertyConfig,
        });
        Object.preventExtensions(column);
        return column;
      });
    Object.defineProperty(this._reactive, "length", {
      ...fixedLengthPropertyConfig,
    });
    Object.preventExtensions(this._reactive);

    this._unreactive = <FixedLengthArray<FixedLengthArray<paletteIndex>>>
      <unknown>new Array(width).fill(0).map(() => {
        const column = new Array(height).fill(0);
        Object.defineProperty(column, "length", {
          ...fixedLengthPropertyConfig,
        });
        Object.preventExtensions(column);
        return column;
      });
    Object.defineProperty(this._unreactive, "length", {
      ...fixedLengthPropertyConfig,
    });
    Object.preventExtensions(this._unreactive);
    Object.freeze(this);
  }


  /**
   * Gets the width of the pixel grid.
   */
  public get width(): number {
    return this._width;
  }


  /**
   * Gets the height of the pixel grid.
   */
  public get height(): number {
    return this._height;
  }


  /**
   * Gets the reactive pixel grid.
   */
  public get reactive(): FixedLengthArray<FixedLengthArray<paletteIndex>> {
    return this._reactive;
  }


  /**
   * Gets the unreactive pixel grid.
   */
  public get unreactive(): FixedLengthArray<FixedLengthArray<paletteIndex>> {
    return this._unreactive;
  }
}

export default PixelsSource;