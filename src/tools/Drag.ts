import Tool from "./Tool";
import { paletteIndex } from "../utils";

export interface DragOptions {
}


/**
 * A fill tool.
 */
class Drag extends Tool {
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
   * The X component of source anchor point for drawing the Line.
   */
  protected _startingSourceX: number = null;

  /**
   * The Y component of source anchor point for drawing the Line.
   */
  protected _startingSourceY: number = null;


  /**
   * Instantiates a Drag tool.
   * @param options - a config object
   */
  public constructor(options?: DragOptions) {
    super();
    if (arguments.length <= 0) return;
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
   * Draws the cursor preview/indicator of the drag (wrapping).
   * https://stackoverflow.com/a/58110328/8625882
   * @param sourceXChange - the amount of change in X, can be negative
   * @param sourceYChange - the amount of change in Y, can be negative
   */
  protected _indicateDrag(
    sourceXChange: number,
    sourceYChange: number,
  ): void {
    sourceXChange = (sourceXChange + this._measurements.sourceWidth) % this._measurements.sourceWidth;
    sourceYChange = (sourceYChange + this._measurements.sourceHeight) % this._measurements.sourceHeight;
    // assumes no pixel filter
    let sourceCanvas: HTMLCanvasElement = null;
    let scale: number = null;
    if (!this._pixelFilter) {
      sourceCanvas = this._pixelsCanvas;
      scale = 1;
    }
    else {
      sourceCanvas = this._textureCanvas;
      scale = 4;
    }

    this._indicatorContext.drawImage(
      sourceCanvas,
      sourceXChange * scale,
      sourceYChange * scale,
      (this._measurements.sourceWidth - sourceXChange) * scale,
      (this._measurements.sourceHeight - sourceYChange) * scale,
      this._measurements.xStart,
      this._measurements.yStart,
      this._measurements.xSize - (sourceXChange * this._measurements.pixelSize),
      this._measurements.ySize - (sourceYChange * this._measurements.pixelSize),
    );
    this._indicatorContext.drawImage(
      sourceCanvas,
      0 * scale,
      sourceYChange * scale,
      sourceXChange * scale,
      (this._measurements.sourceHeight - sourceYChange) * scale,

      this._measurements.xStop - (sourceXChange * this._measurements.pixelSize),
      this._measurements.yStart,
      sourceXChange * this._measurements.pixelSize,
      this._measurements.ySize - (sourceYChange * this._measurements.pixelSize),
    );
    this._indicatorContext.drawImage(
      sourceCanvas,
      sourceXChange * scale,
      0 * scale,
      (this._measurements.sourceWidth - sourceXChange) * scale,
      sourceYChange * scale,
      this._measurements.xStart,
      this._measurements.yStop - (sourceYChange * this._measurements.pixelSize),
      this._measurements.xSize - (sourceXChange * this._measurements.pixelSize),
      sourceYChange * this._measurements.pixelSize,
    );
    this._indicatorContext.drawImage(
      sourceCanvas,
      0 * scale,
      0 * scale,
      sourceXChange * scale,
      sourceYChange * scale,
      this._measurements.xStop - (sourceXChange * this._measurements.pixelSize),
      this._measurements.yStop - (sourceYChange * this._measurements.pixelSize),
      sourceXChange * this._measurements.pixelSize,
      sourceYChange * this._measurements.pixelSize,
    );
    if (this._grid)
      this._indicatorContext.drawImage(
        this._gridCanvas,
        0, 0,
        this._measurements.size,
        this._measurements.size,
        0, 0,
        this._measurements.size,
        this._measurements.size,
      );
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
      const sourceXChange = targetSourceX - this._startingSourceX;
      const sourceYChange = targetSourceY - this._startingSourceY;
      this._indicateDrag(
        sourceXChange,
        sourceYChange,
      );
      this._indicateDefaultCursor(this._startingSourceX, this._startingSourceY, 1);
    }
    this._indicateDefaultCursor(targetSourceX, targetSourceY, 1);
  }


  /**
   * Commits pixels from the and triggers a redraws when fininished.
   * @param sourceXChange - the amount of change in X, can be negative
   * @param sourceYChange - the amount of change in Y, can be negative
   */
  protected _pixels(
    sourceXChange: number,
    sourceYChange: number,
  ): void {
    // need copy to alter
    const sourceCopy = new Array(this._measurements.sourceWidth)
      .fill(0)
      .map(v => new Array(this._measurements.sourceHeight).fill(0));

    // fill the copy
    for (let sourceY = 0; sourceY < this._measurements.sourceHeight; ++sourceY) {
      for (let sourceX = 0; sourceX < this._measurements.sourceWidth; ++sourceX) {
        sourceCopy[sourceX][sourceY] = this._source.unreactive[sourceX][sourceY];
      }
    }


    for (let sourceY = 0; sourceY < this._measurements.sourceHeight; ++sourceY) {
      for (let sourceX = 0; sourceX < this._measurements.sourceWidth; ++sourceX) {
        const shiftedSourceX = (sourceX + sourceXChange + this._measurements.sourceWidth) % this._measurements.sourceWidth;
        const shiftedSourceY = (sourceY + sourceYChange + this._measurements.sourceHeight) % this._measurements.sourceHeight;
        const paletteIndex = sourceCopy[shiftedSourceX][shiftedSourceY];
        this._source.unreactive[sourceX][sourceY] = paletteIndex;
      }
    }

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
      this._refreshIndicator();
      const sourceXChange = targetSourceX - this._startingSourceX;
      const sourceYChange = targetSourceY - this._startingSourceY;
      this._pixels(sourceXChange, sourceYChange);
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

export default Drag;