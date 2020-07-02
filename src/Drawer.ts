import HookableArray from "./HookableArray";
import { Drawable } from "./interfaces";
import { pixel } from "./utils";

export interface DrawerOptions {
  canvas: HTMLCanvasElement,
  pattern: Drawable;
};


const assigned: Set<HTMLCanvasElement> = new Set();
class Drawer {
  private _canvas: HTMLCanvasElement = null;
  private _context: CanvasRenderingContext2D = null;
  private _pattern: Drawable = null;
  private _source: HookableArray<Array<pixel>> = null;
  private _pixelSize: number = null;

  public constructor({ canvas, pattern }: DrawerOptions) {
    if (pattern == null) throw new Error();
    if (canvas == null) throw new Error();
    this._pattern = pattern;
    this._canvas = canvas;
    this._context = canvas.getContext("2d");
    this._source = pattern.sections.texture;
    this._pixelSize = 5;

    const { _pattern, _canvas, _context, _pixelSize, _source } = this;
    assigned.add(_canvas);
    const pixels = _pattern.sections.texture;
    _canvas.height = pixels.length * _pixelSize;
    _canvas.width = pixels[0].length * 3;

    for (let y: number = 0; y < pixels.length; ++y) {
      for (let x: number = 0; x < pixels[y].length; ++x){
        _context.fillStyle = _pattern.palette[pixels[y][x]];
        _context.fillRect(x * 3, y * 3, 3, 3);
      }
    }
  }

  private update(y: pixel, x: pixel) {
    this._context.fillStyle = this._pattern.palette[this._source[y][x]];
    this._context.fillRect(
      x * this._pixelSize,
      y * this._pixelSize,
      this._pixelSize,
      this._pixelSize
    );
  }

  private refresh() {
    for (let y: number = 0; y < this._source.length; ++y) {
      for (let x: number = 0; x < this._source[y].length; ++x){
        this._context.fillStyle = this._pattern.palette[this._source[y][x]];
        this._context.fillRect(x * 3, y * 3, x + 3, y + 3);
      }
    }
  }
}

export default Drawer;