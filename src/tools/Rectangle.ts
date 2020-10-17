import Tool from "./Tool";
import { paletteIndex } from "../utils";

export interface RectangleOptions {
}


/**
 * A fill tool.
 */
class Rectangle extends Tool {
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
   * The X component of source anchor point for drawing the Rectangle.
   */
  protected _startingSourceX: number = null;

  /**
   * The Y component of source anchor point for drawing the Rectangle.
   */
  protected _startingSourceY: number = null;


  /**
   * Instantiates a Bucket tool.
   * @param options - a config object
   */
  public constructor(options?: Rectangle) {
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
    let topLeftSourceX: number = Math.min(this._startingSourceX, targetSourceX);
    let topLeftSourceY: number = Math.min(this._startingSourceY, targetSourceY);
    let width: number = Math.abs(
      Math.max(this._startingSourceX, targetSourceX) -
      Math.min(this._startingSourceX, targetSourceX)
    );
    let height: number = (
      Math.max(this._startingSourceY, targetSourceY) -
      Math.min(this._startingSourceY, targetSourceY)
    );

    this._indicatorContext.fillStyle = this._pattern.palette[this._paletteIndex];

    // top left (exclusive) to top right (inclusive)
    for (let sourceX = topLeftSourceX + 1; sourceX <= topLeftSourceX + width; ++sourceX) {
      this._indicatorContext.fillRect(
        (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
        (this._measurements.pixelYStart + topLeftSourceY) * this._measurements.pixelSize,
        this._measurements.pixelSize,
        this._measurements.pixelSize,
      );
    }

    // top right (exclusive) to bottom right (inclusive)
    for (let sourceY = topLeftSourceY + 1; sourceY <= topLeftSourceY + height; ++sourceY) {
      this._indicatorContext.fillRect(
        (this._measurements.pixelXStart + topLeftSourceX + width) * this._measurements.pixelSize,
        (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
        this._measurements.pixelSize,
        this._measurements.pixelSize,
      );
    }

    // bottom right (exclusive) to bottom left (inclusive)
    for (let sourceX = topLeftSourceX + width - 1; sourceX >= topLeftSourceX; --sourceX) {
      this._indicatorContext.fillRect(
        (this._measurements.pixelXStart + sourceX) * this._measurements.pixelSize,
        (this._measurements.pixelYStart + topLeftSourceY + height) * this._measurements.pixelSize,
        this._measurements.pixelSize,
        this._measurements.pixelSize,
      );
    }

    // bottom left (exlusive) to top left (inclusive)
    for (let sourceY = topLeftSourceY + height - 1; sourceY >= topLeftSourceY; --sourceY) {
      this._indicatorContext.fillRect(
        (this._measurements.pixelXStart + topLeftSourceX) * this._measurements.pixelSize,
        (this._measurements.pixelYStart + sourceY) * this._measurements.pixelSize,
        this._measurements.pixelSize,
        this._measurements.pixelSize,
      );
    }
  }


  /**
   * Draws the cursor preview/indicator.
   * @param targetSourceX - x coordinate in source
   * @param targetSourceY - y coordinate in source
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
   * @param startSourceX - the x of the starting point on the source
   * @param startSourceY  - the y of the starting point on the source
   * @param endSourceX - the x of the ending point on the source
   * @param endSourceY - the y of the ending point on the source
   */
  protected _pixels(
    startSourceX: number,
    startSourceY: number,
    endSourceX: number,
    endSourceY: number,
  ): void {
    let topLeftSourceX: number = Math.min(endSourceX, startSourceX);
    let topLeftSourceY: number = Math.min(endSourceY, startSourceY);
    let width: number = Math.abs(
      Math.max(endSourceX, startSourceX) -
      Math.min(endSourceX, startSourceX)
    );
    let height: number = (
      Math.max(endSourceY, startSourceY) -
      Math.min(endSourceY, startSourceY)
    );

    // top left to top right
    for (
      let sourceX = topLeftSourceX;
      sourceX <= topLeftSourceX + width;
      ++sourceX
    ) this._source.unreactive[sourceX][topLeftSourceY] = this._paletteIndex;

    // top right to bottom right
    for (
      let sourceY = topLeftSourceY;
      sourceY <= topLeftSourceY + height;
      ++sourceY
    ) this._source.unreactive[topLeftSourceX + width][sourceY] = this._paletteIndex;

    // bottom left to bottom right
    for (
      let sourceX = topLeftSourceX;
      sourceX <= topLeftSourceX + width;
      ++sourceX
    ) this._source.unreactive[sourceX][topLeftSourceY + height] = this._paletteIndex;

    // top left to bottom left
    for (
      let sourceY = topLeftSourceY;
      sourceY <= topLeftSourceY + height;
      ++sourceY
    ) this._source.unreactive[topLeftSourceX][sourceY] = this._paletteIndex;

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

export default Rectangle;