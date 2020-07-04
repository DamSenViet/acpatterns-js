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
  overlayCanvas?: HTMLElement,
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
  private _drawingCanvas: HTMLCanvasElement = null;
  private _drawingContext: CanvasRenderingContext2D = null;
  private _overlayCanvas: HTMLCanvasElement = null;
  private _overlayContext: CanvasRenderingContext2D = null;
  private _pattern: Drawable = null;
  private _source: HookableArray<Array<pixel>, [number, number, pixel]> = null;
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

  private _tool: Tool = new Brush({ size: 10 });
  // private this._windowResizeDelay: number = 100;

  // CENTERS NON SQUARE SOURCES INSIDE GRID
  // CANVAS SIZE MUST BE SQUARE AND WIDTH/HEIGHT MUST BE A MULTIPLE OF 128
  public constructor({ drawingCanvas, overlayCanvas, pattern }: DrawerOptions) {
    if (pattern == null) throw new Error();
    if (
      drawingCanvas == null ||
      !(drawingCanvas instanceof HTMLCanvasElement)
    ) throw new TypeError();
    if (overlayCanvas != null) {
      if (!(overlayCanvas instanceof HTMLCanvasElement)) throw new TypeError();
      this._overlayCanvas = overlayCanvas;
      this._overlayContext = overlayCanvas.getContext("2d");
      assigned.add(this._overlayCanvas);
    }
    this._pattern = pattern;
    this._drawingCanvas = drawingCanvas;
    assigned.add(this._drawingCanvas);
    // validate canvas after-css size, must be square and 128xy
    this._source = pattern.pixels;
    this._drawingContext = drawingCanvas.getContext("2d");
    this._updateMeasurements();

    this.refreshOverlay();
    this.refreshDrawing(); // draw first round
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

    const size = this._drawingCanvas.offsetHeight;
    // determine pixel size based on source
    // if pattern is <= 64, scale up size is scaled up, double pixel size
    const sourceHeight: number = this._source.length;
    const sourceHalfHeight: number = Math.floor(sourceHeight / 2);
    const sourceWidth: number = this._source[0].length;
    const sourceHalfWidth: number = Math.floor(sourceWidth / 2);
    let pixelGridSize: number = 1;
    while (pixelGridSize < sourceHeight || pixelGridSize < sourceWidth)
      pixelGridSize = pixelGridSize * 2;
    const pixelSize = this._drawingCanvas.offsetHeight / pixelGridSize;

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

  private _onWindowResize = debounce(() => {
    this._updateMeasurements();
    this.refreshDrawing();
  }, 200);

  private _onMouse = (event: MouseEvent) => {
    // need - 1 to use zero indexed values
    const pixelY = Math.floor(event.clientY / this._measurements.pixelSize) - 1;
    const pixelX = Math.floor(event.clientX / this._measurements.pixelSize) - 1;

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
      );
    }
    // draw on overlay
    if (
      this._lastSourceY === sourceY &&
      this._lastSourceX === sourceX
    ) return;
    this._lastSourceY = sourceY;
    this._lastSourceX = sourceX;
    if (this.overlayCanvas != null) {
      // redraw preview
      this.refreshOverlay();

      // draw preview of tool
      this._tool.preview(
        this._source,
        sourceY,
        sourceX,
        this._overlayContext,
        this._measurements,
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
          (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
          (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
          this._measurements.pixelSize,
          this._measurements.pixelSize,
        );
      }
    }
  }

  private _onTypeUpdate = (type: PatternType) => {
    this._source.hook.untap(this._onPixelUpdate);
    this._source = this._pattern.pixels; // reset to default
    this._updateMeasurements();
    this.refreshOverlay();
    this.refreshDrawing();
    this._source.hook.tap(this._onPixelUpdate);
  }

  private _onPixelUpdate = (sourceY: number, sourceX: number, pixel: pixel) => {
    this._drawingContext.clearRect(
      (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
      (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
      this._measurements.pixelSize,
      this._measurements.pixelSize,
    );
    if (pixel === 15) return;
    this._drawingContext.fillStyle = this._pattern.palette[pixel];
    this._drawingContext.fillRect(
      (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
      (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
      this._measurements.pixelSize,
      this._measurements.pixelSize,
    );
  }

  public refreshOverlay(): void {
    if (this._overlayCanvas == null) return;
    this._overlayContext.clearRect(
      0,
      0,
      this._measurements.size,
      this._measurements.size
    );

    this._overlayContext.strokeStyle = "#E2E2E2";
    this._overlayContext.lineWidth = 1;


    // vertical pixel grid lines
    for (
      let x = this._measurements.xStart;
      x < this._measurements.xStop;
      x += this._measurements.pixelSize
    ) {
      this._overlayContext.beginPath();
      this._overlayContext.moveTo(x, this._measurements.yStart);
      this._overlayContext.lineTo(x, this._measurements.yStop);
      this._overlayContext.stroke();
    }
    // horizontal pixel grid lines
    for (
      let y = this._measurements.yStart;
      y < this._measurements.yStop;
      y += this._measurements.pixelSize
    ) {
      this._overlayContext.beginPath();
      this._overlayContext.moveTo(this._measurements.xStart, y);
      this._overlayContext.lineTo(this._measurements.xStop, y);
      this._overlayContext.stroke();
    }
    // guide lines
    this._overlayContext.strokeStyle = "#624C37";
    this._overlayContext.lineWidth = 3;
    // vertical guide
    this._overlayContext.beginPath();
    this._overlayContext.moveTo(
      this._measurements.xCenter,
      this._measurements.yStart,
    );
    this._overlayContext.lineTo(
      this._measurements.xCenter,
      this._measurements.yStop,
    );
    this._overlayContext.stroke();
    // horizontal divider
    this._overlayContext.beginPath();
    this._overlayContext.moveTo(
      this._measurements.xStart,
      this._measurements.yCenter,
    );
    this._overlayContext.lineTo(
      this._measurements.xStop,
      this._measurements.yCenter,
    );
    this._overlayContext.stroke();
  }

  // public api
  public get drawingCanvas(): HTMLCanvasElement {
    return this._drawingCanvas;
  }

  public set drawingCanvas(drawingCanvas: HTMLCanvasElement) {
    if (!(drawingCanvas instanceof HTMLCanvasElement))
      throw new TypeError();
    assigned.delete(this._drawingCanvas);
    this._drawingCanvas = drawingCanvas;
    assigned.add(this._drawingCanvas);
    this._drawingContext = drawingCanvas.getContext("2d");
    this._updateMeasurements();
    this.refreshDrawing();
  }

  public get overlayCanvas(): HTMLCanvasElement {
    return this._overlayCanvas;
  }

  public set overlayCanvas(overlayCanvas: HTMLCanvasElement) {
    if (!(overlayCanvas instanceof HTMLCanvasElement))
      throw new TypeError();
    assigned.delete(this._overlayCanvas);
    this._overlayCanvas = overlayCanvas;
    assigned.add(this._overlayCanvas);
    this._overlayContext = overlayCanvas.getContext("2d");
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
    this._updateMeasurements();
    this.refreshOverlay();
    this.refreshDrawing();
    this._source.hook.tap(this._onPixelUpdate);
  }

  public get source(): HookableArray<Array<pixel>, [number, number, pixel]> {
    return this._source;
  }

  // public methods
  public refreshDrawing(): void {
    this._drawingContext.clearRect(0, 0, this._measurements.size, this._measurements.size);
    for (let sourceY: number = 0; sourceY < this._source.length; ++sourceY) {
      for (let sourceX: number = 0; sourceX < this._source[sourceY].length; ++sourceX) {
        if (this._source[sourceY][sourceX] === 15) continue;
        this._drawingContext.fillStyle = this._pattern.palette[this._source[sourceY][sourceX]];
        this._drawingContext.fillRect(
          (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
          (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
          this._measurements.pixelSize,
          this._measurements.pixelSize,
        );
      }
    }
  }

  public dispose(): void {
    this._source.hook.untap(this._onPixelUpdate);
    assigned.delete(this._drawingCanvas);
  }
}

export default Drawer;