import PixelsSource from "./PixelsSource";
import PatternType from "./PatternType";
import Drawable from "./Drawable";
import { Tool, Brush } from "./tools";
import {
  color,
  pixel,
  debounce,
} from "./utils";
import { IllegalStateError } from "./errors";

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


enum DrawerStates {
  PLAYING,
  PAUSED,
  DISPOSED,
};


/**
 * Renders a Drawable Pattern on a canvas.
 * Reacts to changes to the pattern by default.
 */
class Drawer {

  /**
   * The possible states the Drawer can be in.
   */
  public static states = DrawerStates;

  /**
   * The final canvas to render the pattern on.
   */
  private _canvas: HTMLCanvasElement = null;

  /**
   * Cached context of the _canvas.
   */
  private _context: CanvasRenderingContext2D = null;

  /**
   * The pattern to draw.
   */
  private _pattern: Drawable = null;

  /**
   * The source of the pattern to be drawn.
   */
  private _source: PixelsSource = null;


  /**
   * The canvas responsible for drawing just the pixels of the pattern.
   * Muxed onto _canvas in the drawing process.
   */
  private _pixelsCanvas: HTMLCanvasElement = document.createElement("canvas");

  /**
   * Cached context of _pixelsCanvas.
   */
  private _pixelsContext: CanvasRenderingContext2D = this._pixelsCanvas.getContext("2d");

  /**
   * The canvas responsible for drawing just the grid.
   * Muxed onto _canvas in the drawing process.
   */
  private _gridCanvas: HTMLCanvasElement = document.createElement("canvas");

  /**
   * Cached context of _gridCanvas.
   */
  private _gridContext: CanvasRenderingContext2D = this._gridCanvas.getContext("2d");

  /**
   * The canvas responsible for drawing just the preview created by the preview.
   * Muxed onto _canvas in the drawing process.
   */
  private _previewCanvas: HTMLCanvasElement = document.createElement("canvas");

  /**
   * Cached context of the _previewCanvas.
   */
  private _previewContext: CanvasRenderingContext2D = this._previewCanvas.getContext("2d");

  /**
   * Cached measurements needed to speed up rendering and calculations for _pixelsCanvas.
   */
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

  /**
   * The last sourceY drawn on.
   */
  private _lastSourceY: number = null;

  /**
   * The last sourceX drawn on.
   */
  private _lastSourceX: number = null;

  /**
   * Flag to reduce drawing operations.
   */
  private _didDrawOnLastSource: boolean = false;

  /**
   * The drawing tool to interact with the canvas.
   */
  private _tool: Tool = new Brush({ size: 1, });

  /**
   * Tool uses this callback to force refresh everything.
   * This callback propogates to any other connected Drawers
   * or Modelers that are still in their reactive state.
   */
  private _forceRefresh: () => void = null;

  /**
   * Drawer reactive state.
   */
  private _state: DrawerStates = DrawerStates.PLAYING;

  // CENTERS NON SQUARE SOURCES INSIDE GRID
  // CANVAS SIZE MUST BE SQUARE AND WIDTH/HEIGHT MUST BE A MULTIPLE OF 128
  /**
   * Instantiates a Drawer.
   * @param options - A configuration Object with a 'canvas' and 'pattern'
   */
  public constructor(options: DrawerOptions) {
    if (options == null) throw new TypeError();
    const { canvas, pattern } = options;
    if (pattern == null) throw new TypeError();
    if (
      canvas == null ||
      !(canvas instanceof HTMLCanvasElement)
    ) throw new TypeError();
    this._pattern = pattern;
    this._forceRefresh = this._pattern.hooks.refresh.trigger.bind(this._pattern.hooks.refresh);
    this._canvas = canvas;
    // validate canvas after-css size, must be square and 128xy
    this._source = pattern.pixels;
    this._context = canvas.getContext("2d");

    // configure canvases
    this._context.imageSmoothingEnabled = false;
    this._pixelsContext.imageSmoothingEnabled = false;
    this._gridContext.imageSmoothingEnabled = false;
    this._previewContext.imageSmoothingEnabled = false;

    this._refresh(); // draw first round
    // initialize all hooks
    this._pattern.hooks.palette.tap(this._onPaletteUpdate);
    this._pattern.hooks.type.tap(this._onTypeUpdate);
    this._pattern.hooks.refresh.tap(this._onRefresh);
    this._pattern.hooks.load.tap(this._onLoad);
    this._source.hook.tap(this._onPixelUpdate);

    this._canvas.addEventListener("mousemove", this._onMouse);
    this._canvas.addEventListener("mousedown", this._onMouse);
  }


  /**
   * Updates the measurements for the _pixelsCanvas to render the pattern.
   */
  private _updateMeasurements(): void {
    if (
      this._canvas.offsetHeight !== this._canvas.offsetWidth ||
      this._canvas.offsetHeight % 128 !== 0
    ) throw new TypeError();

    const size = this._canvas.offsetHeight;
    // sync all sizes together
    this._pixelsCanvas.height = size;
    this._pixelsCanvas.width = size;
    this._pixelsContext.imageSmoothingEnabled = false;
    this._gridCanvas.height = size;
    this._gridCanvas.width = size;
    this._gridContext.imageSmoothingEnabled = false;
    this._previewCanvas.height = size;
    this._previewCanvas.width = size;
    this._previewContext.imageSmoothingEnabled = false;


    // determine pixel size based on source
    const sourceHeight: number = this._source.length;
    const sourceHalfHeight: number = Math.floor(sourceHeight / 2);
    const sourceWidth: number = this._source[0].length;
    const sourceHalfWidth: number = Math.floor(sourceWidth / 2);

    // the number of pixels the canvas can fit
    // expand to fit
    let pixelGridSize: number = sourceHeight > sourceWidth ? sourceHeight : sourceWidth;
    // figure out how many css pixels each pixel will be
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

  /**
   * Redraws the _canvas.
   */
  private _redraw = (): void => {
    this._context.clearRect(
      0, 0,
      this._measurements.size, this._measurements.size
    );
    this._context.drawImage(this._pixelsCanvas, 0, 0);
    this._context.drawImage(this._gridCanvas, 0, 0);
    this._context.drawImage(this._previewCanvas, 0, 0);
  };


  /**
   * Refreshes the _pixelsCanvas.
   */
  private _refreshPixels(): void {
    this._pixelsContext.clearRect(0, 0, this._measurements.size, this._measurements.size);
    for (let sourceY: number = 0; sourceY < this._measurements.sourceHeight; ++sourceY) {
      for (let sourceX: number = 0; sourceX < this._measurements.sourceWidth; ++sourceX) {
        const paletteIdx = this._source[sourceY][sourceX];
        if (paletteIdx === 15) continue;
        this._pixelsContext.fillStyle = this._pattern.palette[paletteIdx];
        this._pixelsContext.fillRect(
          (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
          (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
          this._measurements.pixelSize,
          this._measurements.pixelSize,
        );
      }
    }
  }

  /**
   * Refreshes the _gridCanvas.
   */
  private _refreshGrid(): void {
    this._gridContext.clearRect(
      0,
      0,
      this._measurements.size,
      this._measurements.size
    );

    this._gridContext.strokeStyle = "rgba(226, 226, 226, 1)";
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
    this._gridContext.strokeStyle = "rgba(0, 0, 0, 1)";
    this._gridContext.lineWidth = 1;
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


  /**
   * Refreshes the _previewsCanvas.
   */
  private _refreshPreview(): void {
    this._previewContext.clearRect(
      0,
      0,
      this._measurements.size,
      this._measurements.size,
    );
  }

  // private _onWindowResize = debounce(() => {
  //   this._refresh();
  // }, 200);


  /**
   * Callback for the mouse interaction with the canvas.
   * @param event - the passed event
   */
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

    if (
      this._lastSourceY === sourceY &&
      this._lastSourceX === sourceX
    ) return;
    
    this._lastSourceY = sourceY;
    this._lastSourceX = sourceX;
    this._didDrawOnLastSource = false;
    
    // draw on main canvas
    // redraw preview
    this._refreshPreview();
    this._tool.preview(
      this._source,
      this._lastSourceY,
      this._lastSourceX,
      this._previewContext,
      this._measurements,
    );
    
    // this will automatically trigger redraw if it fires
    if (event.buttons === 1 && this._didDrawOnLastSource === false) {
      this._tool.draw(
        this._source,
        sourceY,
        sourceX,
        this._previewContext,
        this._measurements,
        this._forceRefresh,
      );
      this._didDrawOnLastSource = true;
    }
    // otherwise make sure to request it!!!
    else requestAnimationFrame(this._redraw);
  }


  /**
   * Callback for when the _pixelCanvas source changes.
   * Updates the pixel that changed.
   * @param sourceY - the y coordinate of the changed pixel
   * @param sourceX - the x coordinate of the changed pixel
   * @param pixel - the pixel value, pointing to the idx of its palette
   */
  private _onPixelUpdate = (sourceY: number, sourceX: number, pixel: pixel): void => {
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
    requestAnimationFrame(this._redraw);
  };


  /**
   * Callback for when the palette of the pattern changes.
   * Updates pixels that have had their color mapping changed.
   * @param i - the idx of the palette that changed
   * @param color - the hex color that it changed to
   */
  private _onPaletteUpdate = (i: pixel, color: color): void => {
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
    requestAnimationFrame(this._redraw);
  };


  /**
   * Callback for when the type of the pattern changes.
   * Updates the source, measurements.
   * @param type - the pattern type that it's changed to
   */
  private _onTypeUpdate = (type: PatternType): void => {
    this._source.hook.untap(this._onPixelUpdate);
    this._source = this._pattern.pixels; // reset to default
    this._refresh();
    this._source.hook.tap(this._onPixelUpdate);
  };


  /**
   * Callback for when the pattern's pixels need to be updated forcefully.
   * Updates the pixels and the model.
   */
  private _onRefresh = (): void => {
    this._refreshPixels();
    requestAnimationFrame(this._redraw);
  };


  /**
   * Callback for when the pattern loads in new data.
   * Updates measurements, pixels, and model.
   */
  private _onLoad = (): void => {
    this._onTypeUpdate(null);
  };


  /**
   * Gets the canvas the pattern is rendered on.
   */
  public get canvas(): HTMLCanvasElement {
    return this._canvas;
  }


  /**
   * Gets the source from the pattern.
   */
  public get source(): PixelsSource {
    return this._source;
  }


  /**
   * Sets the source from the pattern to draw.
   */
  public set source(source: PixelsSource) {
    if (this._state === DrawerStates.DISPOSED) {
      const message = `Drawer has been disposed. Cannot set source.`;
      throw new IllegalStateError(message);
    }
    if (this._source === source) return;
    if (!(source instanceof PixelsSource)) {
      const message = `Expected an instance of PixelsSource from the loaded pattern.`;
      throw new TypeError(message);
    }
    let isFromPattern = false;
    for (const sectionName in this._pattern.sections) {
      if (source == this._pattern.sections[sectionName]) {
        isFromPattern = true;
        break;
      }
    }
    if (source === this._pattern.pixels) isFromPattern = true;
    if (!isFromPattern) {
      const message = `Expected an instance of PixelsSource from the loaded pattern.`;
      throw new TypeError(message);
    }
    if (this._state !== DrawerStates.PLAYING) return;
    // change sources and redraw
    this._source.hook.untap(this._onPixelUpdate);
    this._source = source;
    this._refresh();
    this._source.hook.tap(this._onPixelUpdate);
  }


  /**
   * Gets the current tool used for interactive drawing.
   */
  public get tool(): Tool {
    return this._tool;
  }


  /**
   * Sets the current tool used for interactive drawing.
   */
  public set tool(tool: Tool) {
    if (this._state === DrawerStates.DISPOSED) {
      const message = `Drawer has been disposed. Cannot set tool.`;
      throw new IllegalStateError(message);
    }
    if (!(tool instanceof Tool)) {
      const message = `Expected an instance of Tool.`;
      throw new TypeError(message);
    }
    if (this._tool === tool) return;
    this._tool = tool;
  }


  /**
   * Does the refreshes the canvas with all changes.
   */
  private _refresh(): void {
    this._updateMeasurements();
    this._refreshPixels();
    this._refreshGrid();
    this._refreshPreview();
    // now drawImage in order to target canvas
    requestAnimationFrame(this._redraw);
  }


  /**
   * Puts the drawing into reactive state.
   */
  public play(): void {
    if (this._state !== DrawerStates.PAUSED) return;
    this._pattern.hooks.palette.tap(this._onPaletteUpdate);
    this._pattern.hooks.type.tap(this._onTypeUpdate);
    this._pattern.hooks.refresh.tap(this._onRefresh);
    this._pattern.hooks.load.tap(this._onLoad);
    this._source.hook.tap(this._onPixelUpdate);

    this._canvas.addEventListener("mousemove", this._onMouse);
    this._canvas.addEventListener("mousedown", this._onMouse);

    // assume everything changed
    this._onLoad();
  }


  /**
   * Puts the drawer into the unreactive state.
   */
  public pause(): void {
    if (this._state !== DrawerStates.PLAYING) return;
    this._pattern.hooks.palette.untap(this._onPaletteUpdate);
    this._pattern.hooks.type.untap(this._onTypeUpdate);
    this._pattern.hooks.refresh.untap(this._onRefresh);
    this._pattern.hooks.load.untap(this._onLoad);
    this._source.hook.untap(this._onPixelUpdate);

    this._canvas.removeEventListener("mousemove", this._onMouse);
    this._canvas.removeEventListener("mousedown", this._onMouse);
    this._state = DrawerStates.PAUSED;
  }


  /**
   * Puts the drawer into stopped state and cleans up all resources expendded.
   * Drawer cannot be used beyond this function call.
   */
  public dispose(): void {
    if (this._state === DrawerStates.DISPOSED) return;
    this.pause();
    this._canvas = null;
    this._context = null;
    this._pattern = null;
    this._source = null;
    this._pixelsCanvas = null;
    this._pixelsContext = null;
    this._gridCanvas = null;
    this._gridContext = null;
    this._previewCanvas = null;
    this._previewContext = null;
    this._measurements = null;
    this._tool = null;
    this._state = DrawerStates.DISPOSED;
  }
}

export default Drawer;