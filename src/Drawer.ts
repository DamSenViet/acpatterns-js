import HookableArray from "./HookableArray";
import { Tool, Brush } from "./tools";
import {
  color,
  pixel,
  Drawable,
  PatternType,
  debounce,
} from "./utils";

export interface DrawerOptions {
  drawingCanvas: HTMLCanvasElement,
  previewCanvas?: HTMLElement,
  pattern: Drawable;
};

// must be more than 100x100
const assigned: Set<HTMLCanvasElement> = new Set();
class Drawer {
  private _drawingCanvas: HTMLCanvasElement = null;
  private _drawingContext: CanvasRenderingContext2D = null;
  private _previewCanvas: HTMLCanvasElement = null;
  private _previewContext: CanvasRenderingContext2D = null;
  private _pattern: Drawable = null;
  private _source: HookableArray<Array<pixel>, [number, number, pixel]> = null;
  // measurements for drawing
  private _size: number = null;
  private _pixelSize: number = null;
  private _offsetPixelY: number = null;
  private _offsetPixelX: number = null;
  private _tool: Tool = new Brush({ size: 1 });
  // private this._windowResizeDelay: number = 100;

  // optimize previewCanvas
  private _lastSourceY: number = null;
  private _lastSourceX: number = null;

  // CENTERS NON SQUARE SOURCES INSIDE GRID
  // CANVAS SIZE MUST BE SQUARE AND WIDTH/HEIGHT MUST BE A MULTIPLE OF 128
  public constructor({ drawingCanvas, previewCanvas, pattern }: DrawerOptions) {
    if (pattern == null) throw new Error();
    if (
      drawingCanvas == null ||
      !(drawingCanvas instanceof HTMLCanvasElement)
    ) throw new TypeError();
    if (previewCanvas != null) {
      if (!(previewCanvas instanceof HTMLCanvasElement)) throw new TypeError();
      this._previewCanvas = previewCanvas;
      this._previewContext = previewCanvas.getContext("2d");
      assigned.add(this._previewCanvas);
    }
    this._pattern = pattern;
    this._drawingCanvas = drawingCanvas;
    assigned.add(this._drawingCanvas);
    // validate canvas after-css size, must be square and 128xy
    this._source = pattern.sections.texture;
    this._drawingContext = drawingCanvas.getContext("2d");
    this._updateMeasurements();

    this._redrawGrid();
    this.refresh(); // draw first round
    // initialize all hooks
    this._pattern.hooks.palette.tap(this._onPaletteUpdate);
    this._pattern.hooks.type.tap(this._onTypeUpdate);
    this._source.hook.tap(this._onPixelUpdate);

    this._drawingCanvas.addEventListener("mousemove", this._onMouse);
    this._drawingCanvas.addEventListener("mousedown", this._onMouse);
  }

  private _updateMeasurements() {
    if (
      this._drawingCanvas.offsetHeight !== this._drawingCanvas.offsetWidth ||
      this._drawingCanvas.offsetHeight % 128 !== 0
    ) throw new TypeError();
    this._size = this._drawingCanvas.offsetHeight;
    // determine pixel size based on source
    // if pattern is <= 64, scale up size is scaled up, double pixel size

    let sourceHeight: number = this._source.length;
    let sourceWidth: number = this._source[0].length;
    let pixelGridSize: number = 1;
    while (pixelGridSize < sourceHeight || pixelGridSize < sourceWidth)
      pixelGridSize = pixelGridSize * 2;
    this._pixelSize = this._drawingCanvas.offsetHeight / pixelGridSize;

    const top: number = Math.floor(pixelGridSize / 2);
    const left: number = Math.floor(pixelGridSize / 2);
    const translateY: number = -(Math.floor(this._source.length / 2));
    const translateX: number = -(Math.floor(this._source[0].length / 2));
    this._offsetPixelY = top + translateY;
    this._offsetPixelX = left + translateX;
  }

  private _onWindowResize = debounce(() => {
    this._updateMeasurements();
    this.refresh();
  }, 200);

  private _onMouse = (event: MouseEvent) => {
    // need - 1 to use zero indexed values
    const pixelY = Math.floor(event.clientY / this._pixelSize) - 1;
    const pixelX = Math.floor(event.clientX / this._pixelSize) - 1;
    if (pixelY < this._offsetPixelY) return;
    if (pixelX < this._offsetPixelX) return;
    // console.log(pixelX, pixelY);
    const sourceY = pixelY - this._offsetPixelY;
    const sourceX = pixelX - this._offsetPixelX;
    // draw on main canvas
    if (event.buttons === 1) {
      this._tool.draw(
        this._source,
        sourceY,
        sourceX,
      );
    }
    // draw on preview
    if (
      this._lastSourceY === sourceY &&
      this._lastSourceX === sourceX
    ) return;
    this._lastSourceY = sourceY;
    this._lastSourceX = sourceX;
    if (this.previewCanvas != null) {
      // redraw preview
      this._previewContext.clearRect(0, 0, this._size, this._size);
      this._redrawGrid();

      // draw preview of tool
      this._tool.preview(
        this._source,
        sourceY,
        sourceX,
        this._previewContext,
        this._pixelSize,
        this._offsetPixelY,
        this._offsetPixelX,
      );
    }

  }


  private _onPaletteUpdate = (i: pixel, color: color) => {
    // loop through entire source for i, replace all i values with new color
    for (let sourceY: number = 0; sourceY < this._source.length; ++sourceY) {
      for (let sourceX: number = 0; sourceX < this._source[sourceY].length; ++sourceX) {
        if (this._source[sourceY][sourceX] !== i) continue;
        this._drawingContext.fillStyle = color;
        this._drawingContext.fillRect(
          (this._offsetPixelX + sourceX) * this._pixelSize,
          (this._offsetPixelY + sourceY) * this._pixelSize,
          this._pixelSize,
          this._pixelSize,
        );
      }
    }
  }

  private _onTypeUpdate = (type: PatternType) => {
    this._source.hook.untap(this._onPixelUpdate);
    this._source = this._pattern.pixels; // reset to default
    this.refresh();
    this._source.hook.tap(this._onPixelUpdate);
  }

  private _onPixelUpdate = (sourceY: number, sourceX: number, pixel: pixel) => {
    this._drawingContext.clearRect(
      (this._offsetPixelX + sourceX) * this._pixelSize,
      (this._offsetPixelY + sourceY) * this._pixelSize,
      this._pixelSize,
      this._pixelSize,
    );
    if (pixel === 15) return;
    this._drawingContext.fillStyle = this._pattern.palette[pixel];
    this._drawingContext.fillRect(
      (this._offsetPixelX + sourceX) * this._pixelSize,
      (this._offsetPixelY + sourceY) * this._pixelSize,
      this._pixelSize,
      this._pixelSize,
    );
  }

  private _redrawGrid() {
    if (this._previewCanvas == null) return;
    this._previewContext.strokeStyle = "#cbc8c8";
    this._previewContext.lineWidth = 1;
    for (let i = this._pixelSize; i < this._size; i += this._pixelSize) {
      this._previewContext.beginPath();
      this._previewContext.moveTo(i, 0);
      this._previewContext.lineTo(i, this._size);
      this._previewContext.stroke();

      this._previewContext.beginPath();
      this._previewContext.moveTo(0, i);
      this._previewContext.lineTo(this._size, i);
      this._previewContext.stroke();
    }
  }


  // public api
  public set drawingCanvas(drawingCanvas: HTMLCanvasElement) {
    if (!(drawingCanvas instanceof HTMLCanvasElement))
      throw new TypeError();
    assigned.delete(this._drawingCanvas);
    this._drawingCanvas = drawingCanvas;
    assigned.add(this._drawingCanvas);
    this._drawingContext = drawingCanvas.getContext("2d");
    this._updateMeasurements();
    this.refresh();
  }

  public get drawingCanvas(): HTMLCanvasElement {
    return this._drawingCanvas;
  }

  public get previewCanvas(): HTMLElement {
    return this._previewCanvas;
  }

  public set previewCanvas(previewCanvas: HTMLElement) {
    if (!(previewCanvas instanceof HTMLCanvasElement))
      throw new TypeError();
    assigned.delete(this._previewCanvas);
    this._previewCanvas = previewCanvas;
    assigned.add(this._previewCanvas);
    this._drawingContext = previewCanvas.getContext("2d");
    // this._updateMeasurements();
    // this.refresh();
  }

  public set source(source: HookableArray<Array<pixel>, [number, number, pixel]>) {
    if (!(source instanceof HookableArray)) throw new TypeError();
    let isFromPattern = false;
    for (const sectionName in this._pattern.sections)
      if (source === this._pattern.sections[sectionName])
        isFromPattern = true;
    if (source === this._pattern.pixels) isFromPattern = true;
    if (!isFromPattern) throw new TypeError();
    // change sources and redraw
    this._source.hook.untap(this._onPixelUpdate);
    this._source = source;
    this.refresh();
    this._source.hook.tap(this._onPixelUpdate);
  }

  public get source(): HookableArray<Array<pixel>, [number, number, pixel]> {
    return this._source;
  }

  // public methods
  public refresh() {
    this._drawingContext.clearRect(0, 0, this._size, this._size);
    for (let sourceY: number = 0; sourceY < this._source.length; ++sourceY) {
      for (let sourceX: number = 0; sourceX < this._source[sourceY].length; ++sourceX) {
        if (this._source[sourceY][sourceX] === 15) continue;
        this._drawingContext.fillStyle = this._pattern.palette[this._source[sourceY][sourceX]];
        this._drawingContext.fillRect(
          (this._offsetPixelX + sourceX) * this._pixelSize,
          (this._offsetPixelY + sourceY) * this._pixelSize,
          this._pixelSize,
          this._pixelSize,
        );
      }
    }
  }

  public dispose() {
    this._source.hook.untap(this._onPixelUpdate);
    assigned.delete(this._drawingCanvas);
  }
}

export default Drawer;