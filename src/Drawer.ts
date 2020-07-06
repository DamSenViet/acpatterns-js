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
  canvas: HTMLCanvasElement,
  pattern: Drawable;
};

export interface DrawerMeasurements {
  // source meaasurements
  sourceHeight: number;
  sourceHalfHeight: number;
  sourceWidth: number;
  sourceHalfWidth: number;
  // raw canvas measurements
  size: number;
  pixelSize: number,
  yStart: number;
  yCenter: number;
  yStop: number;
  xStart: number;
  xCenter: number;
  xStop: number;
  // canvas pixel measurements
  pixelGridSize: number;
  pixelYStart: number;
  pixelYCenter: number;
  pixelYStop: number;
  pixelXStart: number;
  pixelXCenter: number;
  pixelXStop: number;
};

// must be more than 100x100
const assigned: Set<HTMLCanvasElement> = new Set();
class Drawer {
  private _canvas: HTMLCanvasElement = null;
  private _context: CanvasRenderingContext2D = null;
  private _pattern: Drawable = null;
  private _source: HookableArray<Array<pixel>, [number, number, pixel]> = null;

  // three separate canvases to mux onto the target canvas
  private _pixelsCanvas: HTMLCanvasElement = document.createElement("canvas");
  private _pixelsContext: CanvasRenderingContext2D = this._pixelsCanvas.getContext("2d");
  private _gridCanvas: HTMLCanvasElement = document.createElement("canvas");
  private _gridContext: CanvasRenderingContext2D = this._gridCanvas.getContext("2d");
  private _previewCanvas: HTMLCanvasElement = document.createElement("canvas");
  private _previewContext: CanvasRenderingContext2D = this._previewCanvas.getContext("2d");

  // measurements for drawing
  private _measurements: DrawerMeasurements = {
    // source meaasurements
    sourceHeight: null,
    sourceHalfHeight: null,
    sourceWidth: null,
    sourceHalfWidth: null,
    // raw canvas measurements
    size: null,
    pixelSize: null,
    yStart: null,
    yCenter: null,
    yStop: null,
    xStart: null,
    xCenter: null,
    xStop: null,
    // canvas pixel measurements
    pixelGridSize: null,
    pixelYStart: null,
    pixelYCenter: null,
    pixelYStop: null,
    pixelXStart: null,
    pixelXCenter: null,
    pixelXStop: null,
  };

  private _yStart: number = null;
  private _yCenter: number = null;
  private _yStop: number = null;
  private _xStart: number = null;
  private _xCenter: number = null;
  private _xStop: number = null;

  // optimize overlayCanvas determines when to redraw/draw
  private _lastSourceY: number = null;
  private _lastSourceX: number = null;

  private _tool: Tool = new Brush({ size: 1 });
  // private this._windowResizeDelay: number = 100;

  // CENTERS NON SQUARE SOURCES INSIDE GRID
  // CANVAS SIZE MUST BE SQUARE AND WIDTH/HEIGHT MUST BE A MULTIPLE OF 128
  public constructor({
    canvas,
    pattern,
  }: DrawerOptions) {
    if (pattern == null) throw new Error();
    if (
      canvas == null ||
      !(canvas instanceof HTMLCanvasElement)
    ) throw new TypeError();
    this._pattern = pattern;
    this._canvas = canvas;
    assigned.add(this._canvas);
    // validate canvas after-css size, must be square and 128xy
    this._source = pattern.pixels;
    this._context = canvas.getContext("2d");

    // configure canvases
    this._context.imageSmoothingEnabled = false;
    this._pixelsContext.imageSmoothingEnabled = false;
    this._gridContext.imageSmoothingEnabled = false;
    this._previewContext.imageSmoothingEnabled = false;

    this.refresh(); // draw first round
    // initialize all hooks
    this._pattern.hooks.palette.tap(this._onPaletteUpdate);
    this._pattern.hooks.type.tap(this._onTypeUpdate);
    this._pattern.hooks.load.tap(this._onLoad);
    this._source.hook.tap(this._onPixelUpdate);

    this._canvas.addEventListener("mousemove", this._onMouse);
    this._canvas.addEventListener("mousedown", this._onMouse);
  }

  private _updateMeasurements() {
    if (
      this._canvas.offsetHeight !== this._canvas.offsetWidth ||
      this._canvas.offsetHeight % 128 !== 0
    ) throw new TypeError();

    const size = this._canvas.offsetHeight;
    // sync all sizes together
    this._pixelsCanvas.height = size;
    this._pixelsCanvas.width = size;
    this._gridCanvas.height = size;
    this._gridCanvas.width = size;
    this._previewCanvas.height = size;
    this._previewCanvas.width = size;


    // determine pixel size based on source
    // if pattern is <= 64, scale up size is scaled up, double pixel size
    const sourceHeight: number = this._source.length;
    const sourceHalfHeight: number = Math.floor(sourceHeight / 2);
    const sourceWidth: number = this._source[0].length;
    const sourceHalfWidth: number = Math.floor(sourceWidth / 2);
    let pixelGridSize: number = 1;
    while (pixelGridSize < sourceHeight || pixelGridSize < sourceWidth)
      pixelGridSize = pixelGridSize * 2;
    const pixelSize = this._canvas.offsetHeight / pixelGridSize;

    const top: number = Math.floor(pixelGridSize / 2);
    const left: number = Math.floor(pixelGridSize / 2);
    const translateY: number = -sourceHalfHeight;
    const translateX: number = -sourceHalfWidth;

    const pixelYStart = top + translateY;
    const pixelYCenter = pixelYStart + sourceHalfHeight;
    const pixelYStop = pixelYStart + sourceHeight;
    const pixelXStart = left + translateX;
    const pixelXCenter = pixelXStart + sourceHalfWidth;
    const pixelXStop = pixelXStart + sourceWidth;

    const yStart = pixelYStart * pixelSize;
    const yCenter = pixelYCenter * pixelSize;
    const yStop = pixelYStop * pixelSize;
    const xStart = pixelXStart * pixelSize;
    const xCenter = pixelXCenter * pixelSize;
    const xStop = pixelXStop * pixelSize;

    this._measurements = Object.freeze<DrawerMeasurements>({
      sourceHeight,
      sourceHalfHeight,
      sourceWidth,
      sourceHalfWidth,
      size,
      pixelSize,
      yStart,
      yCenter,
      yStop,
      xStart,
      xCenter,
      xStop,
      pixelGridSize,
      pixelYStart,
      pixelYCenter,
      pixelYStop,
      pixelXStart,
      pixelXCenter,
      pixelXStop,
    });
  }

  private _redraw(): void {
    this._context.clearRect(
      0, 0,
      this._measurements.size, this._measurements.size
    );
    this._context.drawImage(this._pixelsCanvas, 0, 0);
    this._context.drawImage(this._gridCanvas, 0, 0);
    this._context.drawImage(this._previewCanvas, 0, 0);
  }


  // refresh individual
  private _refreshPixels(): void {
    this._pixelsContext.clearRect(0, 0, this._measurements.size, this._measurements.size);
    for (let sourceY: number = 0; sourceY < this._measurements.sourceHeight; ++sourceY) {
      for (let sourceX: number = 0; sourceX < this._measurements.sourceWidth; ++sourceX) {
        if (this._source[sourceY][sourceX] === 15) continue;
        this._pixelsContext.fillStyle = this._pattern.palette[this._source[sourceY][sourceX]];
        this._pixelsContext.fillRect(
          (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
          (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
          this._measurements.pixelSize,
          this._measurements.pixelSize,
        );
      }
    }
  }

  private _refreshGrid(): void {
    this._gridContext.clearRect(
      0,
      0,
      this._measurements.size,
      this._measurements.size
    );

    this._gridContext.strokeStyle = "#E2E2E2";
    this._gridContext.lineWidth = 1;

    // vertical pixel grid lines
    for (
      let x = this._measurements.xStart;
      x < this._measurements.xStop;
      x += this._measurements.pixelSize
    ) {
      this._gridContext.beginPath();
      this._gridContext.moveTo(x, this._measurements.yStart);
      this._gridContext.lineTo(x, this._measurements.yStop);
      this._gridContext.stroke();
    }
    // horizontal pixel grid lines
    for (
      let y = this._measurements.yStart;
      y < this._measurements.yStop;
      y += this._measurements.pixelSize
    ) {
      this._gridContext.beginPath();
      this._gridContext.moveTo(this._measurements.xStart, y);
      this._gridContext.lineTo(this._measurements.xStop, y);
      this._gridContext.stroke();
    }
    // guide lines
    this._gridContext.strokeStyle = "#624C37";
    this._gridContext.lineWidth = 2;
    // vertical guide
    this._gridContext.beginPath();
    this._gridContext.moveTo(
      this._measurements.xCenter,
      this._measurements.yStart,
    );
    this._gridContext.lineTo(
      this._measurements.xCenter,
      this._measurements.yStop,
    );
    this._gridContext.stroke();
    // horizontal divider
    this._gridContext.beginPath();
    this._gridContext.moveTo(
      this._measurements.xStart,
      this._measurements.yCenter,
    );
    this._gridContext.lineTo(
      this._measurements.xStop,
      this._measurements.yCenter,
    );
    this._gridContext.stroke();
  }

  // this job should be done by the tool
  private _refreshPreview(): void {
    this._previewContext.clearRect(
      0,
      0,
      this._measurements.size,
      this._measurements.size
    );
  }

  private _onWindowResize = debounce(() => {
    this.refresh();
  }, 200);

  private _onMouse = (event: MouseEvent) => {
    // need - 1 to use zero indexed values
    const bdr = this._canvas.getBoundingClientRect();
    const pixelY = Math.floor((event.clientY - bdr.top) / this._measurements.pixelSize);
    const pixelX = Math.floor((event.clientX - bdr.left) / this._measurements.pixelSize);

    if (
      pixelY < this._measurements.pixelYStart ||
      pixelY > this._measurements.pixelYStop - 1
    ) return;
    if (
      pixelX < this._measurements.pixelXStart ||
      pixelX > this._measurements.pixelXStop - 1
    ) return;

    const sourceY = pixelY - this._measurements.pixelYStart;
    const sourceX = pixelX - this._measurements.pixelXStart;
    // draw on main canvas
    if (event.buttons === 1) {
      this._tool.draw(
        this._source,
        sourceY,
        sourceX,
        this._previewContext,
        this._measurements,
      );
    }
    // draw on overlay
    if (
      this._lastSourceY === sourceY &&
      this._lastSourceX === sourceX
    ) return;
    this._lastSourceY = sourceY;
    this._lastSourceX = sourceX;

    // redraw preview
    this._refreshPreview();
    this._tool.preview(
      this._source,
      sourceY,
      sourceX,
      this._previewContext,
      this._measurements,
    );
    this._redraw();
  }


  private _onPaletteUpdate = (i: pixel, color: color) => {
    // loop through entire source for i, replace all i values with new color
    for (
      let sourceY: number = 0;
      sourceY < this._measurements.sourceHeight;
      ++sourceY
    ) {
      for (
        let sourceX: number = 0;
        sourceX < this._measurements.sourceWidth;
        ++sourceX
      ) {
        if (this._source[sourceY][sourceX] !== i) continue;
        this._pixelsContext.fillStyle = color;
        this._pixelsContext.fillRect(
          (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
          (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
          this._measurements.pixelSize,
          this._measurements.pixelSize,
        );
      }
    }
    this._redraw();
  };

  private _onTypeUpdate = (type: PatternType) => {
    this._source.hook.untap(this._onPixelUpdate);
    this._source = this._pattern.pixels; // reset to default
    this.refresh();
    this._source.hook.tap(this._onPixelUpdate);
  };

  private _onPixelUpdate = (sourceY: number, sourceX: number, pixel: pixel) => {
    this._pixelsContext.clearRect(
      (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
      (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
      this._measurements.pixelSize,
      this._measurements.pixelSize,
    );
    if (pixel === 15) return;
    this._pixelsContext.fillStyle = this._pattern.palette[pixel];
    this._pixelsContext.fillRect(
      (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
      (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
      this._measurements.pixelSize,
      this._measurements.pixelSize,
    );
    this._redraw();
  };

  private _onLoad = () => {
    this.refresh();
  };

  // public api
  public get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  public set canvas(canvas: HTMLCanvasElement) {
    if (!(canvas instanceof HTMLCanvasElement))
      throw new TypeError();
    assigned.delete(this._canvas);
    this._canvas = canvas;
    assigned.add(this._canvas);
    this._context = canvas.getContext("2d");
    this.refresh();
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

  public get tool(): Tool {
    return this._tool;
  }

  public set tool(tool: Tool) {
    if (!(tool instanceof Tool)) throw new TypeError();
    this._tool = tool;
  }


  // public methods
  public refresh(): void {
    this._updateMeasurements();
    this._refreshPixels();
    this._refreshGrid();
    this._refreshPreview();
    // now drawImage in order to target canvas
    this._redraw();
  }

  public play(): void {
    this.refresh();
    this._pattern.hooks.palette.tap(this._onPaletteUpdate);
    this._pattern.hooks.type.tap(this._onTypeUpdate);
    this._source.hook.tap(this._onPixelUpdate);

    this._canvas.addEventListener("mousemove", this._onMouse);
    this._canvas.addEventListener("mousedown", this._onMouse);
  }

  public pause(): void {
    this._pattern.hooks.palette.untap(this._onPaletteUpdate);
    this._pattern.hooks.type.untap(this._onTypeUpdate);
    this._source.hook.untap(this._onPixelUpdate);

    this._canvas.removeEventListener("mousemove", this._onMouse);
    this._canvas.removeEventListener("mousedown", this._onMouse);
  }

  public stop(): void {
    this.pause();
    assigned.delete(this._canvas);
  }
}

export default Drawer;