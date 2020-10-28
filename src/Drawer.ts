import AcPattern from "./AcPattern";
import PixelsSource from "./PixelsSource";
import PatternType from "./PatternType";
import { Tool } from "./tools";
import {
  color,
  paletteIndex,
} from "./utils";
import { IllegalStateError } from "./errors";
import xbrz from "./xbrz";

export interface DrawerOptions {
  canvas: HTMLCanvasElement,
  pattern: AcPattern;
};

export interface DrawerMeasurements {
  /**
   * Pattern source measurements.
   */
  sourceWidth: number;
  sourceHalfWidth: number;
  sourceHeight: number;
  sourceHalfHeight: number;
  textureWidth: number;
  textureHeight: number;

  /**
   * Raw canvas measurements.
   */
  size: number;
  pixelSize: number,
  xStart: number;
  xCenter: number;
  xStop: number;
  xSize: number;
  yStart: number;
  yCenter: number;
  yStop: number;
  ySize: number;

  /**
   * Canvas pixel grid measurements.
   */
  pixelGridSize: number;
  pixelXStart: number;
  pixelXCenter: number;
  pixelXStop: number;
  pixelYStart: number;
  pixelYCenter: number;
  pixelYStop: number;
};


enum DrawerStates {
  PLAYING,
  PAUSED,
  DISPOSED,
};


/**
 * Renders a pattern on a canvas.
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
  private _pattern: AcPattern = null;

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
   * The canvas to render the post-processed pixelsCanvas onto.
   * Muxed onto _canvas in the drawing process.
   */
  private _textureCanvas: HTMLCanvasElement = document.createElement("canvas");

  /**
   * Cached context of the _textureCanvas.
   */
  private _textureContext: CanvasRenderingContext2D = this._textureCanvas.getContext("2d");

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
   * The canvas responsible for drawing just the indicator created by the tool.
   * Muxed onto _canvas in the drawing process.
   */
  private _indicatorCanvas: HTMLCanvasElement = document.createElement("canvas");

  /**
   * Cached context of the _indicatorCanvas.
   */
  private _indicatorContext: CanvasRenderingContext2D = this._indicatorCanvas.getContext("2d");

  /**
   * Cached measurements needed to speed up rendering and calculations for _pixelsCanvas.
   */
  private _measurements: Readonly<DrawerMeasurements> = Object.freeze({
    // source meaasurements
    sourceWidth: null,
    sourceHalfWidth: null,
    sourceHeight: null,
    sourceHalfHeight: null,
    textureWidth: null,
    textureHeight: null,
    // raw canvas measurements
    size: null,
    pixelSize: null,
    xStart: null,
    xCenter: null,
    xStop: null,
    xSize: null,
    yStart: null,
    yCenter: null,
    yStop: null,
    ySize: null,
    // canvas pixel measurements
    pixelGridSize: null,
    pixelXStart: null,
    pixelXCenter: null,
    pixelXStop: null,
    pixelYStart: null,
    pixelYCenter: null,
    pixelYStop: null,
  });

  /**
   * The drawing tool to interact with the canvas.
   */
  private _tool: Tool = null;

  /**
   * Whether or not to render the grid.
   */
  private _grid: boolean = false;

  /**
   * Whether or not to render the tool indicator.
   */
  private _indicator: boolean = false;

  /**
   * Whether or not to apply pixel filtering.
   * If turned on, will incur a large performance cost.
   */
  private _pixelFilter: boolean = false;

  /**
   * Drawer reactive state.
   */
  private _state: DrawerStates = DrawerStates.PLAYING;


  /**
   * Instantiates a Drawer.
   * Centers non-square sources inside the grid.
   * @param options - A configuration Object with a 'canvas' and 'pattern'.
   */
  public constructor(options: DrawerOptions) {
    if (options == null) {
      const message = `Expected a configuration object with required fields.`;
      throw new TypeError(message);
    }
    const { canvas, pattern } = options;
    if (
      pattern == null ||
      !(pattern instanceof AcPattern)
    ) {
      const message = `Expected an instance of a pattern.`;
      throw new TypeError(message);
    }
    if (
      canvas == null ||
      !(canvas instanceof HTMLCanvasElement)
    ) {
      const message = `Expected an instance of an HTMLCanvasElement.`;
      throw new TypeError(message);
    }
    this._pattern = pattern;
    this._canvas = canvas;
    // validate canvas after-css size, must be square and 128xy
    this._source = pattern.pixels;
    this._context = canvas.getContext("2d");

    // configure canvases
    this._context.imageSmoothingEnabled = false;
    this._pixelsContext.imageSmoothingEnabled = false;
    this._gridContext.imageSmoothingEnabled = false;
    this._indicatorContext.imageSmoothingEnabled = false;

    this._refresh(); // draw first round
    // initialize all hooks
    this._pattern.hooks.palette.tap(this._onPaletteUpdate);
    this._pattern.hooks.type.tap(this._onTypeUpdate);
    this._pattern.hooks.refresh.tap(this._onRefresh);
    this._pattern.hooks.load.tap(this._onLoad);
    this._source.hook.tap(this._onPixelUpdate);
  }


  /**
   * Updates the measurements for the _pixelsCanvas to render the pattern.
   */
  private _updateMeasurements(): void {
    // NOTE: USING NON-CSS MEASUREMENTS
    // BASE VALUES OFF OF ATTRIBUTE VALUES WHICH ARE NOT AFFECTED BY CSS
    if (
      this._canvas.width !== this._canvas.height ||
      this._canvas.width % 128 !== 0 &&
      this._canvas.width / 128 !== 0
    ) {
      const message = `Canvas width and height must be equal and at least a multiple of 128.`;
      throw new TypeError(message);
    }

    const size = this.canvas.width;
    this._context.imageSmoothingEnabled = false;

    // sync necessary sizes together
    // imageSmoothingEnabled auto reset to true after size changes, force false
    this._gridCanvas.width = size;
    this._gridCanvas.height = size;
    this._gridContext.imageSmoothingEnabled = false;
    this._indicatorCanvas.width = size;
    this._indicatorCanvas.height = size;
    this._indicatorContext.imageSmoothingEnabled = false;


    // determine pixel size based on source
    const sourceWidth: number = this._source.width;
    const sourceHalfWidth: number = Math.floor(sourceWidth / 2);
    const sourceHeight: number = this._source.height;
    const sourceHalfHeight: number = Math.floor(sourceHeight / 2);
    const textureWidth = sourceWidth * 4;
    const textureHeight = sourceHeight * 4;

    this._pixelsCanvas.width = sourceWidth;
    this._pixelsCanvas.height = sourceHeight;
    this._pixelsContext.imageSmoothingEnabled = false;
    this._textureCanvas.width = textureWidth;
    this._textureCanvas.height = textureHeight;
    this._textureContext.imageSmoothingEnabled = false;

    // the number of pixels the canvas can fit
    // expand to fit
    let pixelGridSize: number = Math.max(sourceHeight, sourceWidth);
    // figure out how many canvas (NOT CSS) pixels each pixel will be
    const pixelSize = this._canvas.height / pixelGridSize;

    const top: number = Math.floor(pixelGridSize / 2);
    const left: number = Math.floor(pixelGridSize / 2);
    const translateX: number = -sourceHalfWidth;
    const translateY: number = -sourceHalfHeight;

    const pixelXStart = left + translateX;
    const pixelXCenter = pixelXStart + sourceHalfWidth;
    const pixelXStop = pixelXStart + sourceWidth;
    const pixelYStart = top + translateY;
    const pixelYCenter = pixelYStart + sourceHalfHeight;
    const pixelYStop = pixelYStart + sourceHeight;

    const xStart = pixelXStart * pixelSize;
    const xCenter = pixelXCenter * pixelSize;
    const xStop = pixelXStop * pixelSize;
    const xSize = xStop - xStart;

    const yStart = pixelYStart * pixelSize;
    const yCenter = pixelYCenter * pixelSize;
    const yStop = pixelYStop * pixelSize;
    const ySize = yStop - yStart;

    // overwrite, don't replace
    this._measurements = Object.freeze<DrawerMeasurements>({
      sourceWidth,
      sourceHalfWidth,
      sourceHeight,
      sourceHalfHeight,
      textureWidth,
      textureHeight,
      size,
      pixelSize,
      xStart,
      xCenter,
      xSize,
      xStop,
      yStart,
      yCenter,
      yStop,
      ySize,
      pixelGridSize,
      pixelXStart,
      pixelXCenter,
      pixelXStop,
      pixelYStart,
      pixelYCenter,
      pixelYStop,
    });
  }


  /**
   * Redraws the _canvas.
   */
  private _redraw = (): void => {
    if (this._state === DrawerStates.DISPOSED) return;
    this._context.clearRect(
      0, 0,
      this._measurements.size, this._measurements.size
    );
    if (this._pixelFilter)
      this._context.drawImage(
        this._textureCanvas,
        0, 0,
        this._measurements.textureWidth,
        this._measurements.textureHeight,
        this._measurements.xStart, this._measurements.yStart,
        this._measurements.xSize,
        this._measurements.ySize,
      );
    else
      this._context.drawImage(
        this._pixelsCanvas,
        0, 0,
        this._measurements.sourceWidth,
        this._measurements.sourceHeight,
        this._measurements.xStart, this._measurements.yStart,
        this._measurements.xSize,
        this._measurements.ySize,
      );
    if (this._grid)
      this._context.drawImage(
        this._gridCanvas,
        0, 0,
        this._measurements.size,
        this._measurements.size,
        0, 0,
        this._measurements.size,
        this._measurements.size,
      );
    if (this._indicator)
      this._context.drawImage(
        this._indicatorCanvas,
        0, 0,
        this._measurements.size,
        this._measurements.size,
        0, 0,
        this._measurements.size,
        this._measurements.size,
      );
  };


  /**
   * Refreshes the _pixelsCanvas.
   */
  private _refreshPixels(): void {
    this._pixelsContext.clearRect(0, 0, this._measurements.sourceWidth, this._measurements.sourceHeight);
    for (let sourceY: number = 0; sourceY < this._measurements.sourceHeight; ++sourceY) {
      for (let sourceX: number = 0; sourceX < this._measurements.sourceWidth; ++sourceX) {
        const paletteIndex = this._source.unreactive[sourceX][sourceY];
        if (paletteIndex === 15) continue;
        this._pixelsContext.fillStyle = this._pattern.palette[paletteIndex];
        this._pixelsContext.fillRect(sourceX, sourceY, 1, 1);
      }
    }
    if (this._pixelFilter)
      xbrz(
        this._pixelsContext,
        this._measurements.sourceWidth,
        this._measurements.sourceHeight,
        this._textureContext,
        4,
      );
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
   * Refreshes the _indicatorCanvas.
   */
  private _refreshIndicator: () => void = (): void => {
    this._indicatorContext.clearRect(
      0,
      0,
      this._measurements.size,
      this._measurements.size,
    );
  };


  /**
   * Callback for when the _pixelCanvas source changes.
   * Updates the pixel that changed.
   * @param sourceX - the x coordinate of the changed pixel
   * @param sourceY - the y coordinate of the changed pixel
   * @param pixel - the pixel value, pointing to the idx of its palette
   */
  private _onPixelUpdate = (sourceX: number, sourceY: number, paletteIndex: paletteIndex): void => {
    if (paletteIndex === 15) {
      this._pixelsContext.clearRect(sourceX, sourceY, 1, 1);
      return;
    }
    this._pixelsContext.fillStyle = this._pattern.palette[paletteIndex];
    this._pixelsContext.fillRect(sourceX, sourceY, 1, 1);


    if (this._pixelFilter)
      xbrz(
        this._pixelsContext,
        this._measurements.sourceWidth,
        this._measurements.sourceHeight,
        this._textureContext,
        4,
      );
    requestAnimationFrame(this._redraw);
  };


  /**
   * Callback for when the palette of the pattern changes.
   * Updates pixels that have had their color mapping changed.
   * @param i - the idx of the palette that changed
   * @param color - the hex color that it changed to
   */
  private _onPaletteUpdate = (i: paletteIndex, color: color): void => {
    // loop through entire source for i, replace all i values with new color
    for (let sourceY: number = 0; sourceY < this._measurements.sourceHeight; ++sourceY) {
      for (let sourceX: number = 0; sourceX < this._measurements.sourceWidth; ++sourceX) {
        if (this._source.unreactive[sourceX][sourceY] !== i) continue;
        this._pixelsContext.fillStyle = color;
        this._pixelsContext.fillRect(sourceX, sourceY, 1, 1);
      }
    }
    if (this._pixelFilter)
      xbrz(
        this._pixelsContext,
        this._measurements.sourceWidth,
        this._measurements.sourceHeight,
        this._textureContext,
        4,
      );
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
   * Does the refreshes the canvas with all changes.
   */
  private _refresh(): void {
    this._updateMeasurements();
    this._refreshPixels();
    this._refreshGrid();
    this._refreshIndicator();
    // now drawImage in order to target canvas
    requestAnimationFrame(this._redraw);
  }


  /**
   * Gets the canvas the pattern is rendered on.
   */
  public get canvas(): HTMLCanvasElement {
    return this._canvas;
  }


  /**
   * Gets the pattern the Drawer is drawing.
   */
  public get pattern(): AcPattern {
    return this._pattern;
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
    for (const section of Object.values(this._pattern.sections)) {
      if (source === section) {
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
    if (!(tool instanceof Tool) && tool != null) {
      const message = `Expected an instance of Tool.`;
      throw new TypeError(message);
    }
    if (this._tool === tool) return;
    if (this._tool != null) this._tool.drawer = null;
    if (tool != null) tool.drawer = this;
    this._tool = tool;
  }


  /**
   * Gets whether or not the pixel filtering is applied.
   */
  public get pixelFilter(): boolean {
    return this._pixelFilter;
  }


  /**
   * Sets whether or not the pixelFilter is applied.
   */
  public set pixelFilter(pixelFilter: boolean) {
    if (typeof pixelFilter !== "boolean") {
      const message = `Expected a boolean value`;
      throw new TypeError(message);
    }
    if (this._pixelFilter === pixelFilter) return;
    this._pixelFilter = pixelFilter;
    if (this._pixelFilter)
      xbrz(
        this._pixelsContext,
        this._measurements.sourceWidth,
        this._measurements.sourceHeight,
        this._textureContext,
        4,
      );
    requestAnimationFrame(this._redraw);
  }


  /**
   * Gets whether or not to render the grid.
   */
  public get grid(): boolean {
    return this._grid;
  }


  /**
   * Sets whether or not to render the grid.
   */
  public set grid(grid: boolean) {
    if (this._state === DrawerStates.DISPOSED) {
      const message = `Drawer has been disposed. Cannot set grid.`;
      throw new IllegalStateError(message);
    }
    if (typeof grid !== "boolean") {
      const message = `Expected a boolean value`;
      throw new TypeError(message);
    }
    if (this._grid === grid) return;
    this._grid = grid;
    requestAnimationFrame(this._redraw);
  }


  /**
   * Gets whether or not to render the tool indicator.
   */
  public get indicator(): boolean {
    return this._indicator;
  }


  /**
   * Sets whether or not to render the tool indicator.
   */
  public set indicator(indicator: boolean) {
    if (this._state === DrawerStates.DISPOSED) {
      const message = `Drawer has been disposed. Cannot set indicator.`;
      throw new IllegalStateError(message);
    }
    if (typeof indicator !== "boolean") {
      const message = `Expected a boolean value`;
      throw new TypeError(message);
    }
    if (this._indicator === indicator) return;
    this._indicator = indicator;
    requestAnimationFrame(this._redraw);
  };


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

    this._tool.mount();
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
    this._state = DrawerStates.PAUSED;
  }


  /**
   * Puts the drawer into a stopped state and cleans up all resources expended.
   * Drawer cannot be used beyond this function call.
   */
  public dispose(): void {
    if (this._state === DrawerStates.DISPOSED) return;
    this.pause();
    this.tool = null;
    this._state = DrawerStates.DISPOSED;
    this._canvas = null;
    this._context = null;
    this._pattern = null;
    this._source = null;
    this._pixelsCanvas = null;
    this._pixelsContext = null;
    this._textureCanvas = null;
    this._textureContext = null;
    this._gridCanvas = null;
    this._gridContext = null;
    this._indicatorCanvas = null;
    this._indicatorContext = null;
    this._measurements = null;
  }
}

export default Drawer;