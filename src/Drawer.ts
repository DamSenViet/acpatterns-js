import HookableArray from "./HookableArray";
import {
  color,
  pixel,
  Drawable,
  PatternType,
} from "./utils";

export interface DrawerOptions {
  canvas: HTMLCanvasElement,
  pattern: Drawable;
};

// must be more than 100x100
const assigned: Set<HTMLCanvasElement> = new Set();
class Drawer {
  private _canvas: HTMLCanvasElement = null;
  private _context: CanvasRenderingContext2D = null;
  private _pattern: Drawable = null;
  private _source: HookableArray<Array<pixel>, [number, number, pixel]> = null;
  // measurements for drawing
  private _size: number = null;
  private _pixelSize: number = null;
  private _offsetPixelY: number = null;
  private _offsetPixelX: number = null;

  // ALWAYS USES A GRID OF 128 x 128 ARBITRARY (NOT CSS) PIXELS
  // CENTERS NON SQUARE SOURCES INSIDE GRID
  // CANVAS SIZE MUST BE SQUARE AND WIDTH/HEIGHT MUST BE A MULTIPLE OF 128
  public constructor({ canvas, pattern }: DrawerOptions) {
    if (pattern == null) throw new Error();
    if (canvas == null) throw new Error();
    this._pattern = pattern;
    this._canvas = canvas;
    assigned.add(this._canvas);
    // validate canvas after-css size, must be square and 128xy
    this._source = pattern.sections.texture ;
    this._context = canvas.getContext("2d");
    this._updateMeasurements();

    this.refresh(); // draw first round
    // initialize all hooks
    this._source.hook.tap(this.onPixelUpdate);
  }

  private _updateMeasurements() {
    if (
      this._canvas.offsetHeight !== this._canvas.offsetWidth ||
      this._canvas.offsetHeight % 128 !== 0
    ) throw new TypeError();
    this._size = this._canvas.offsetHeight;
    // determine pixel size based on source
    // if pattern is <= 64, scale up size is scaled up, double pixel size

    // grid size can be any multiple of 2 up to 128
    let sourceHeight: number = this._source.length;
    let sourceWidth: number = this._source[0].length;
    let pixelGridSize: number = 1;
    while(pixelGridSize < sourceHeight || pixelGridSize < sourceWidth)
      pixelGridSize = pixelGridSize * 2;
    this._pixelSize = this._canvas.offsetHeight / pixelGridSize;

    const top: number = pixelGridSize / 2;
    const left: number = pixelGridSize / 2;
    const translateY: number = -(Math.floor(this._source.length / 2));
    const translateX: number = -(Math.floor(this._source[0].length / 2));
    this._offsetPixelY = top + translateY;
    this._offsetPixelX = left + translateX;
  }

  private _rehook() {

  }

  public dispose() {
    assigned.delete(this._canvas);
  }

  private onPaletteUpdate = (i: pixel, color: color) => {
    // loop through entire source for i, replace all i values with new color
    for (let y: number = 0; y < this._source.length; ++y) {
      for (let x: number = 0; x < this._source[y].length; ++x) {
        if (this._source[y][x] !== i) continue;
        this._context.fillStyle = color;
        this._context.fillRect(
          (this._offsetPixelX + x) * this._pixelSize,
          (this._offsetPixelY + y) * this._pixelSize,
          this._pixelSize,
          this._pixelSize,
        );
      }
    }
  }

  private onTypeUpdate = (type: PatternType) => {
    this._source = this._pattern.pixels; // reset to default
    this.refresh();
  }

  private onPixelUpdate = (y: number, x: number, pixel: pixel) => {
    this._context.fillStyle = this._pattern.palette[pixel];
    this._context.fillRect(
      (this._offsetPixelX + x) * this._pixelSize,
      (this._offsetPixelY + y) * this._pixelSize,
      this._pixelSize,
      this._pixelSize,
    );
  }


  public refresh() {
    this._context.clearRect(0, 0, this._size, this._size);
    for (let y: number = 0; y < this._source.length; ++y) {
      for (let x: number = 0; x < this._source[y].length; ++x) {
        this._context.fillStyle = this._pattern.palette[this._source[y][x]];
        this._context.fillRect(
          (this._offsetPixelX + x) * this._pixelSize,
          (this._offsetPixelY + y) * this._pixelSize,
          this._pixelSize,
          this._pixelSize,
        );
      }
    }
  }



}

export default Drawer;