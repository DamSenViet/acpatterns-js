import Tool from "./Tool";
import { paletteIndex } from "../utils";

export interface CircleOptions {
}


/**
 * A fill tool.
 */
class Circle extends Tool {
  /**
   * The last pixelY pased over.
   */
  protected _lastPixelY: number = null;

  /**
   * The last pixelX passed over.
   */
  protected _lastPixelX: number = null;

  /**
   * The last sourceY passed over.
   */
  protected _lastSourceY: number = null;

  /**
   * The last sourceX passed over.
   */
  protected _lastSourceX: number = null;

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
   * The Y component of source anchor point for drawing the Line.
   */
  protected _startingSourceY: number = null;

  /**
   * The X component of source anchor point for drawing the Line.
   */
  protected _startingSourceX: number = null;


  /**
   * Creates a Bucket instance.
   * @param options - a config object
   */
  public constructor(options?: CircleOptions) {
    super();
    if (arguments.length <= 0) return;
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
   * Runs callback on a circular outline.
   * https://web.engr.oregonstate.edu/~sllu/bcircle.pdf
   * @param y - the y component of the first point
   * @param x - the x component of the first point
   * @param r - the radius of the circle
   * @param callback - the callback to call on points on the circle
   */
  protected _onBresenhamsCircle(
    cy: number,
    cx: number,
    r: number,
    callback: (y: number, x: number) => void,
  ): void {
    let x: number = r;
    let y: number = 0;
    let xChange: number = 1 - (2 * r);
    let yChange: number = 1;
    let radiusError = 0;
    while (x >= y) {
      // Plot8CirclePoints
      callback(cy + y, cx + x);
      callback(cy + y, cx - x);
      callback(cy - y, cx - x);
      callback(cy - y, cx + x);
      callback(cy + x, cx + y);
      callback(cy + x, cx - y);
      callback(cy - x, cx - y);
      callback(cy - x, cx + y);

      ++y;
      radiusError += yChange;
      yChange += 2;
      if (2 * radiusError + xChange > 0) {
        --x;
        radiusError += xChange;
        xChange += 2;
      }
    }
  }


  /**
   * Draws the default cursor preview/indicator.
   * @param sourceY - the y coordinate of the source
   * @param sourceX - the x coordinate of the source
   */
  protected _previewDefaultCursor(
    targetSourceY: number,
    targetSourceX: number,
    size: number,
  ): void {
    this.previewContext.strokeStyle = "#00d2c2";
    this.previewContext.lineWidth = Math.ceil(this.measurements.pixelSize / 4);
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
    this.previewContext.beginPath();
    // top left
    this.previewContext.moveTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    // top right
    this.previewContext.lineTo(
      Math.min((this.measurements.pixelXStart + topLeftSourceX + size) * this.measurements.pixelSize, this.measurements.xStop),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    // bottom right
    this.previewContext.lineTo(
      Math.min((this.measurements.pixelXStart + topLeftSourceX + size) * this.measurements.pixelSize, this.measurements.xStop),
      Math.min((this.measurements.pixelYStart + topLeftSourceY + size) * this.measurements.pixelSize, this.measurements.yStop),
    );
    // bottom left
    this.previewContext.lineTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.min((this.measurements.pixelYStart + topLeftSourceY + size) * this.measurements.pixelSize, this.measurements.yStop),
    );
    // back to top left
    this.previewContext.lineTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    this.previewContext.stroke();
  }


  /**
   * Draws the cursor preview/indicator.
   * @param targetSourceY - the y coordinate of the source
   * @param targetSourceX - the x coordinate of the source
   */
  protected _previewFillArea(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    // if not one space, draw the two anchors, then everything in between
    this.previewContext.fillStyle = "rgba(50, 250, 234, 0.6)";
    const radius = Math.max(
      Math.abs(this._startingSourceX - targetSourceX),
      Math.abs(this._startingSourceY - targetSourceY),
    );
    this._onBresenhamsCircle(
      this._startingSourceY,
      this._startingSourceX,
      radius,
      (sourceY, sourceX) => {
        if (this.isValidSourceYX(sourceY, sourceX))
          this.previewContext.fillRect(
            (this.measurements.pixelXStart + sourceX) * this.measurements.pixelSize,
            (this.measurements.pixelYStart + sourceY) * this.measurements.pixelSize,
            this.measurements.pixelSize,
            this.measurements.pixelSize,
          );
      }
    )
  }


  /**
   * Draws the cursor preview/indicator.
   * @param targetSourceY - the y coordinate of the source
   * @param targetSourceX - the x coordinate of the source
   */
  protected _preview(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    if (this._startingSourceY != null && this._startingSourceX != null) {
      this._previewFillArea(
        targetSourceY,
        targetSourceX,
      );
      this._previewDefaultCursor(this._startingSourceY, this._startingSourceX, 1);
    }
    this._previewDefaultCursor(targetSourceY, targetSourceX, 1);
  }


  /**
   * Commits pixels from the and triggers a redraws when fininished.
   * @param targetSourceY - the y coordinate of the source target
   * @param targetSourceX - the x coordinate of the source target
   */
  protected _pixels(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    const radius = Math.max(
      Math.abs(this._startingSourceX - targetSourceX),
      Math.abs(this._startingSourceY - targetSourceY),
    );
    this._onBresenhamsCircle(
      this._startingSourceY,
      this._startingSourceX,
      radius,
      (sourceY, sourceX) => {
        if (this.isValidSourceYX(sourceY, sourceX))
          this.source.unreactive[sourceY][sourceX] = this._paletteIndex;
      }
    )

    this.forceRefresh();
  }


  /**
   * Mousemove callback.
   * @param mouseEvent -  mouse event passed to the callback
   */
  protected _onMouseMove = (mouseEvent: MouseEvent) => {
    const pixelPoint = this.mouseEventToPixelPoint(mouseEvent);
    const targetPixelY = pixelPoint[0];
    const targetPixelX = pixelPoint[1];
    if (
      this._lastPixelY === targetPixelY &&
      this._lastPixelX === targetPixelX
    ) return;
    this._lastPixelY = targetPixelY;
    this._lastPixelX = targetPixelX;

    const sourcePoint = this.pixelPointToSourcePoint(pixelPoint);
    if (sourcePoint == null) {
      this._onMouseOut();
      return;
    };
    const targetSourceY = sourcePoint[0];
    const targetSourceX = sourcePoint[1];

    if (
      this._lastSourceY === targetSourceY &&
      this._lastSourceX === targetSourceX
    ) return;

    this._lastSourceY = targetSourceY;
    this._lastSourceX = targetSourceX;
    this._didDrawOnLastSource = false;

    if (this.preview) {
      this.refreshPreview();
      this._preview(targetSourceY, targetSourceX);
      requestAnimationFrame(this.redraw);
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
    const targetSourceY = sourcePoint[0];
    const targetSourceX = sourcePoint[1];

    this._lastSourceY = targetSourceY;
    this._lastSourceX = targetSourceX;

    if (this._startingSourceY != null && this._startingSourceX != null) {
      this._pixels(targetSourceY, targetSourceX);
      this._startingSourceY = null;
      this._startingSourceX = null;
      this._didDrawOnLastSource = true;
    }
    else if (this._startingSourceY == null && this._startingSourceX == null) {
      if (this.preview) {
        this.refreshPreview();
        this._preview(targetSourceY, targetSourceX);
      }
      this._startingSourceY = targetSourceY;
      this._startingSourceX = targetSourceX;
      requestAnimationFrame(this.redraw);
    }
  };


  /**
   * Mouseout callback. Clears the preview.
   * @param mouseEvent - mouse event passed to the callback
   */
  public _onMouseOut = (mouseEvent?: MouseEvent): void => {
    this._startingSourceY = null;
    this._startingSourceX = null;
    this.refreshPreview();
    requestAnimationFrame(this.redraw);
  };


  /**
   * Mount all event listeners onto the canvas.
   */
  public mount(): void {
    super.mount();
    this.canvas.addEventListener("mousemove", this._onMouseMove);
    this.canvas.addEventListener("mousedown", this._onMouseDown);
    this.canvas.addEventListener("mouseout", this._onMouseOut);
  }


  /**
   * Unmount all mounted event listeners on canvas.
   */
  public unmount(): void {
    super.unmount();
    this.canvas.removeEventListener("mousemove", this._onMouseMove);
    this.canvas.removeEventListener("mousedown", this._onMouseDown);
    this.canvas.removeEventListener("mouseout", this._onMouseOut);
  }
}

export default Circle;