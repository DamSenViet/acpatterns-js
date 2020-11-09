import Tool, { defaultFillStyle } from "./Tool";
import { paletteIndex } from "../utils";

export interface LineOptions {
  paletteIndex?: paletteIndex;
}


/**
 * A fill tool.
 */
class Line extends Tool {
  /**
   * The last pixelX passed over.
   */
  protected _lastPixelX: number = null;

  /**
   * The last pixelY pased over.
   */
  protected _lastPixelY: number = null;

  /**
   * The last sourceX passed over.
   */
  protected _lastSourceX: number = null;

  /**
   * The last sourceY passed over.
   */
  protected _lastSourceY: number = null;

  /**
   * Flag to reduce drawing operations.
   */
  protected _didDrawOnLastSource: boolean = false;

  /**
   * The value to overwrite pixels with.
   * A pointer to a color in the palette palette.
   */
  protected _paletteIndex: paletteIndex = 0;

  /**
   * The X component of source anchor point for drawing the Line.
   */
  protected _startingSourceX: number = null;

  /**
   * The Y component of source anchor point for drawing the Line.
   */
  protected _startingSourceY: number = null;


  /**
   * Instantiates a Line tool.
   * @param options - a config object
   */
  public constructor(options?: LineOptions) {
    super();
    if (arguments.length <= 0) return;
    const { paletteIndex } = options;
    if (paletteIndex != null) this.paletteIndex = paletteIndex;
  }


  /**
   * Gets the palette pointer of the bucket.
   */
  public get paletteIndex(): number {
    return this._paletteIndex;
  }


  /**
   * Sets the palette pointer of the bucket.
   */
  public set paletteIndex(paletteIndex: number) {
    if (typeof paletteIndex !== "number") {
      throw new TypeError();
    }
    this._paletteIndex = paletteIndex;
  };


  /**
   * Runs callback on a line between two points.
   * https://stackoverflow.com/a/11683720/8625882
   * @param x - the x component of the first point
   * @param y - the y component of the first point
   * @param x2 - the x component of the second point
   * @param y2 - the y component of the second point
   * @param callback - the callback to call on points on the line
   */
  protected _onBresenhamsLine(
    x: number,
    y: number,
    x2: number,
    y2: number,
    callback: (x: number, y: number) => void,
  ): void {

    let w: number = x2 - x;
    let h: number = y2 - y;
    let dx1: number = 0;
    let dy1: number = 0;
    let dx2: number = 0;
    let dy2: number = 0;
    if (w < 0) dx1 = -1; else if (w > 0) dx1 = 1;
    if (h < 0) dy1 = -1; else if (h > 0) dy1 = 1;
    if (w < 0) dx2 = -1; else if (w > 0) dx2 = 1;
    let longest: number = Math.abs(w);
    let shortest: number = Math.abs(h);
    if (longest <= shortest) {
      longest = Math.abs(h);
      shortest = Math.abs(w);
      if (h < 0) dy2 = -1; else if (h > 0) dy2 = 1;
      dx2 = 0;
    }
    let numerator: number = longest >> 1;
    for (let i = 0; i <= longest; ++i) {
      callback(x, y);
      numerator += shortest;
      if (numerator >= longest) {
        numerator -= longest;
        x += dx1;
        y += dy1;
      }
      else {
        x += dx2;
        y += dy2;
      }
    }
  }


  /**
   * Draws the default cursor preview/indicator.
   * @param sourceX - the x coordinate of the source
   * @param sourceY - the y coordinate of the source
   */
  protected _indicateDefaultCursor(
    targetSourceX: number,
    targetSourceY: number,
    size: number,
  ): void {
    this._indicatorContext.strokeStyle = "#00d2c2";
    this._indicatorContext.lineWidth = Math.ceil(this._measurements.pixelSize / 4);
    // top left of the square
    let topLeftSourceX: number;
    let topLeftSourceY: number;
    if (size % 2 === 0) {
      topLeftSourceX = targetSourceX - (size / 2);
      topLeftSourceY = targetSourceY - (size / 2) + 1;
    }
    else {
      topLeftSourceX = targetSourceX - Math.floor(size / 2);
      topLeftSourceY = targetSourceY - Math.floor(size / 2);
    }
    this._indicatorContext.beginPath();
    // top left
    this._indicatorContext.moveTo(
      Math.max((this._measurements.pixelXStart + topLeftSourceX) * this._measurements.pixelSize, this._measurements.xStart),
      Math.max((this._measurements.pixelYStart + topLeftSourceY) * this._measurements.pixelSize, this._measurements.yStart),
    );
    // top right
    this._indicatorContext.lineTo(
      Math.min((this._measurements.pixelXStart + topLeftSourceX + size) * this._measurements.pixelSize, this._measurements.xStop),
      Math.max((this._measurements.pixelYStart + topLeftSourceY) * this._measurements.pixelSize, this._measurements.yStart),
    );
    // bottom right
    this._indicatorContext.lineTo(
      Math.min((this._measurements.pixelXStart + topLeftSourceX + size) * this._measurements.pixelSize, this._measurements.xStop),
      Math.min((this._measurements.pixelYStart + topLeftSourceY + size) * this._measurements.pixelSize, this._measurements.yStop),
    );
    // bottom left
    this._indicatorContext.lineTo(
      Math.max((this._measurements.pixelXStart + topLeftSourceX) * this._measurements.pixelSize, this._measurements.xStart),
      Math.min((this._measurements.pixelYStart + topLeftSourceY + size) * this._measurements.pixelSize, this._measurements.yStop),
    );
    // back to top left
    this._indicatorContext.lineTo(
      Math.max((this._measurements.pixelXStart + topLeftSourceX) * this._measurements.pixelSize, this._measurements.xStart),
      Math.max((this._measurements.pixelYStart + topLeftSourceY) * this._measurements.pixelSize, this._measurements.yStart),
    );
    this._indicatorContext.stroke();
  }


  /**
   * Draws the cursor preview/indicator.
   * @param targetSourceX - the x coordinate of the source
   * @param targetSourceY - the y coordinate of the source
   */
  protected _indicateFillArea(
    targetSourceX: number,
    targetSourceY: number,
  ): void {
    // if not one space, draw the two anchors, then everything in between
    if (this._paletteIndex !== this._pattern.palette.length)
      this._indicatorContext.fillStyle = this._pattern.palette[this._paletteIndex];
    else
      this._indicatorContext.fillStyle = defaultFillStyle;
    this._onBresenhamsLine(
      this._startingSourceX,
      this._startingSourceY,
      targetSourceX,
      targetSourceY,
      (sourceX, sourceY) => {
        this._indicatorContext.fillRect(
          (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
          (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
          this._measurements.pixelSize,
          this._measurements.pixelSize,
        );
      }
    )
  }


  /**
   * Draws the cursor preview/indicator.
   * @param targetSourceX - the x coordinate of the source
   * @param targetSourceY - the y coordinate of the source
   */
  protected _indicate(
    targetSourceX: number,
    targetSourceY: number,
  ): void {
    if (this._startingSourceX != null && this._startingSourceY != null) {
      this._indicateFillArea(
        targetSourceX,
        targetSourceY,
      );
      this._indicateDefaultCursor(this._startingSourceX, this._startingSourceY, 1);
    }
    this._indicateDefaultCursor(targetSourceX, targetSourceY, 1);
  }


  /**
   * Commits pixels from the rectangle and triggers a redraws when finished.
   * @param startSourceX - x of the starting point in source
   * @param startSourceY  -  y of the starting point in source
   * @param endSourceX - x of the ending point in source
   * @param endSourceY - y of the ending point in source
   */
  protected _pixels(
    startSourceX: number,
    startSourceY: number,
    endSourceX: number,
    endSourceY: number,
  ): void {
    this._onBresenhamsLine(
      startSourceX,
      startSourceY,
      endSourceX,
      endSourceY,
      (sourceX, sourceY) => {
        this._source.unreactive[sourceX][sourceY] = this._paletteIndex;
      }
    )

    this._pattern.hooks.refresh.trigger();
  }


  /**
   * Mousemove callback.
   * @param mouseEvent -  mouse event passed to the callback
   */
  protected _onMouseMove = (mouseEvent: MouseEvent) => {
    const pixelPoint = this.mouseEventToPixelPoint(mouseEvent);
    const targetPixelX = pixelPoint[0];
    const targetPixelY = pixelPoint[1];
    if (
      this._lastPixelX === targetPixelX &&
      this._lastPixelY === targetPixelY
    ) return;
    this._lastPixelX = targetPixelX;
    this._lastPixelY = targetPixelY;

    const sourcePoint = this.pixelPointToSourcePoint(pixelPoint);
    if (sourcePoint == null) {
      this._onMouseOut();
      return;
    };
    const targetSourceX = sourcePoint[0];
    const targetSourceY = sourcePoint[1];

    if (
      this._lastSourceX === targetSourceX &&
      this._lastSourceY === targetSourceY
    ) return;

    this._lastSourceX = targetSourceX;
    this._lastSourceY = targetSourceY;
    this._didDrawOnLastSource = false;

    if (this._indicator) {
      this._refreshIndicator();
      this._indicate(targetSourceX, targetSourceY);
      requestAnimationFrame(this._redraw);
    }
  };


  /**
   * Mousedown callback.
   * @param mouseEvent - mouse event passed to the callback
   */
  protected _onMouseDown = (mouseEvent: MouseEvent) => {
    const pixelPoint = this.mouseEventToPixelPoint(mouseEvent);
    const sourcePoint = this.pixelPointToSourcePoint(pixelPoint);
    if (sourcePoint == null) return;
    const targetSourceX = sourcePoint[0];
    const targetSourceY = sourcePoint[1];

    this._lastSourceX = targetSourceX;
    this._lastSourceY = targetSourceY;

    if (this._startingSourceX != null && this._startingSourceY != null) {
      this._pixels(
        this._startingSourceX,
        this._startingSourceY,
        targetSourceX,
        targetSourceY,
      );
      this._startingSourceX = null;
      this._startingSourceY = null;
      this._didDrawOnLastSource = true;
    }
    else if (this._startingSourceX == null && this._startingSourceY == null) {
      if (this._indicator) {
        this._refreshIndicator();
        this._indicate(targetSourceX, targetSourceY);
      }
      this._startingSourceX = targetSourceX;
      this._startingSourceY = targetSourceY;
      requestAnimationFrame(this._redraw);
    }
  };


  /**
   * Mouseout callback. Clears the preview.
   * @param mouseEvent - mouse event passed to the callback
   */
  public _onMouseOut = (mouseEvent?: MouseEvent): void => {
    this._lastPixelX = null;
    this._lastPixelY = null;
    this._lastSourceX = null;
    this._lastSourceY = null;
    this._startingSourceX = null;
    this._startingSourceY = null;
    this._refreshIndicator();
    requestAnimationFrame(this._redraw);
  };


  /**
   * Mount all event listeners onto the canvas.
   */
  public mount(): void {
    super.mount();
    this._canvas.addEventListener("mousemove", this._onMouseMove);
    this._canvas.addEventListener("mousedown", this._onMouseDown);
    this._canvas.addEventListener("mouseout", this._onMouseOut);
  }


  /**
   * Unmount all mounted event listeners on canvas.
   */
  public unmount(): void {
    super.unmount();
    this._canvas.removeEventListener("mousemove", this._onMouseMove);
    this._canvas.removeEventListener("mousedown", this._onMouseDown);
    this._canvas.removeEventListener("mouseout", this._onMouseOut);
  }
}

export default Line;