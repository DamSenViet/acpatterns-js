import Tool from "./Tool";
import { paletteIndex } from "../utils";

export interface FillOptions {
}


/**
 * A fill tool.
 */
class Fill extends Tool {
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
   * Flag to determine whether to highlight fill area.
   */
  protected _fillArea: boolean = false;

  /**
   * The value to overwrite pixels with.
   * A pointer to a color in the palette palette.
   */
  protected _paletteIndex: paletteIndex = 0;


  /**
   * Creates a Bucket instance.
   * @param options - a config object
   */
  public constructor(options?: FillOptions) {
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
   * Draws the cursor preview/indicator.
   * @param sourceY - the y coordinate of the source
   * @param sourceX - the x coordinate of the source
   */
  protected _previewCursor(
    sourceY: number,
    sourceX: number,
  ): void {
    this.previewContext.strokeStyle = "#00d2c2";
    this.previewContext.lineWidth = Math.ceil(this.measurements.pixelSize / 4);
    // top left of the square
    let topLeftSourceX: number = sourceX;
    let topLeftSourceY: number = sourceY;

    this.previewContext.beginPath();
    // top left
    this.previewContext.moveTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    // top right
    this.previewContext.lineTo(
      Math.min((this.measurements.pixelXStart + topLeftSourceX + 1) * this.measurements.pixelSize, this.measurements.xStop),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    // bottom right
    this.previewContext.lineTo(
      Math.min((this.measurements.pixelXStart + topLeftSourceX + 1) * this.measurements.pixelSize, this.measurements.xStop),
      Math.min((this.measurements.pixelYStart + topLeftSourceY + 1) * this.measurements.pixelSize, this.measurements.yStop),
    );
    // bottom left
    this.previewContext.lineTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.min((this.measurements.pixelYStart + topLeftSourceY + 1) * this.measurements.pixelSize, this.measurements.yStop),
    );
    // back to top left
    this.previewContext.lineTo(
      Math.max((this.measurements.pixelXStart + topLeftSourceX) * this.measurements.pixelSize, this.measurements.xStart),
      Math.max((this.measurements.pixelYStart + topLeftSourceY) * this.measurements.pixelSize, this.measurements.yStart),
    );
    this.previewContext.stroke();
  }


  /**
   * Draws an overlay on the entire fill area.
   * @param sourceY - the y coordinate of the source
   * @param sourceX  - the x coordinate of the source
   */
  protected _previewFillArea(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    this.previewContext.fillStyle = "rgba(50, 250, 234, 0.6)";
    const paletteIndexToReplace = this.source.unreactive[targetSourceY][targetSourceX];
    if (paletteIndexToReplace === this._paletteIndex) return;
    // jsoned points
    const set = new Set<string>();
    set.add(JSON.stringify([targetSourceY, targetSourceX]));
    const queue = new Array<[number, number]>();
    queue.push([targetSourceY, targetSourceX]);
    while (queue.length > 0) {
      const [nextSourceY, nextSourceX]: [number, number] = queue.shift();

      const westJSON = JSON.stringify([nextSourceY, nextSourceX - 1]);
      if (
        this.isValidSourceYX(nextSourceY, nextSourceX - 1) &&
        this.source.unreactive[nextSourceY][nextSourceX - 1] === paletteIndexToReplace &&
        !set.has(westJSON)
      ) {
        set.add(westJSON);
        queue.push([nextSourceY, nextSourceX - 1]);
      }

      const eastJSON = JSON.stringify([nextSourceY, nextSourceX + 1])
      if (
        this.isValidSourceYX(nextSourceY, nextSourceX + 1) &&
        this.source.unreactive[nextSourceY][nextSourceX + 1] === paletteIndexToReplace &&
        !set.has(eastJSON)
      ) {
        set.add(eastJSON);
        queue.push([nextSourceY, nextSourceX + 1]);
      }

      const southJSON = JSON.stringify([nextSourceY - 1, nextSourceX]);
      if (
        this.isValidSourceYX(nextSourceY - 1, nextSourceX) &&
        this.source.unreactive[nextSourceY - 1][nextSourceX] === paletteIndexToReplace &&
        !set.has(southJSON)
      ) {
        set.add(southJSON);
        queue.push([nextSourceY - 1, nextSourceX]);
      }

      const northJSON = JSON.stringify([nextSourceY + 1, nextSourceX]);
      if (
        this.isValidSourceYX(nextSourceY + 1, nextSourceX) &&
        this.source.unreactive[nextSourceY + 1][nextSourceX] === paletteIndexToReplace &&
        !set.has(northJSON)
      ) {
        set.add(northJSON);
        queue.push([nextSourceY + 1, nextSourceX]);
      }
    }

    for (const [y, x] of [...set.values()].map(v => <[number, number]>JSON.parse(v))) {
      this.previewContext.fillRect(
        (this.measurements.pixelXStart + x) * this.measurements.pixelSize,
        (this.measurements.pixelYStart + y) * this.measurements.pixelSize,
        this.measurements.pixelSize,
        this.measurements.pixelSize,
      );
    }
  }


  /**
   * Commits pixels from the and triggers a redraws when fininished.
   * @param sourceY - the y coordinate of the source target
   * @param sourceX - the x coordinate of the source target
   */
  protected _pixels(
    targetSourceY: number,
    targetSourceX: number,
  ): void {
    // BFS
    const paletteIndexToReplace = this.source.unreactive[targetSourceY][targetSourceX];
    if (paletteIndexToReplace === this._paletteIndex) return;
    this.source.unreactive[targetSourceY][targetSourceX] = this._paletteIndex;
    const queue = new Array<[number, number]>();
    queue.push([targetSourceY, targetSourceX]);
    while (queue.length > 0) {
      const [nextSourceY, nextSourceX]: [number, number] = queue.shift();

      if (
        this.isValidSourceYX(nextSourceY, nextSourceX - 1) &&
        this.source.unreactive[nextSourceY][nextSourceX - 1] === paletteIndexToReplace
      ) {
        this.source.unreactive[nextSourceY][nextSourceX - 1] = this._paletteIndex;
        queue.push([nextSourceY, nextSourceX - 1]);
      }

      if (
        this.isValidSourceYX(nextSourceY, nextSourceX + 1) &&
        this.source.unreactive[nextSourceY][nextSourceX + 1] === paletteIndexToReplace
      ) {
        this.source.unreactive[nextSourceY][nextSourceX + 1] = this._paletteIndex;
        queue.push([nextSourceY, nextSourceX + 1]);
      }

      if (
        this.isValidSourceYX(nextSourceY - 1, nextSourceX) &&
        this.source.unreactive[nextSourceY - 1][nextSourceX] === paletteIndexToReplace
      ) {
        this.source.unreactive[nextSourceY - 1][nextSourceX] = this._paletteIndex;
        queue.push([nextSourceY - 1, nextSourceX]);
      }

      if (
        this.isValidSourceYX(nextSourceY + 1, nextSourceX) &&
        this.source.unreactive[nextSourceY + 1][nextSourceX] === paletteIndexToReplace
      ) {
        this.source.unreactive[nextSourceY + 1][nextSourceX] = this._paletteIndex;
        queue.push([nextSourceY + 1, nextSourceX]);
      }
    }
    this.forceRefresh();
  }


  /**
   * Mousemove callback.
   * @param mouseEvent -  mouse event passed to the callback
   */
  protected _onMouseMove = (mouseEvent: MouseEvent) => {
    const yx = this.mouseEventToSourceYX(mouseEvent);
    if (yx == null) return;
    const [sourceY, sourceX] = yx;

    if (
      this._lastSourceY === sourceY &&
      this._lastSourceX === sourceX
    ) return;

    this._lastSourceY = sourceY;
    this._lastSourceX = sourceX;
    this._didDrawOnLastSource = false;

    if (this.preview) {
      this.refreshPreview();
      if (this._fillArea) this._previewFillArea(sourceY, sourceX);
      this._previewCursor(sourceY, sourceX);
      requestAnimationFrame(this.redraw);
    }
  };


  /**
   * Mousedown callback.
   * @param mouseEvent - mouse event passed to the callback
   */
  protected _onMouseDown = (mouseEvent: MouseEvent) => {
    const yx = this.mouseEventToSourceYX(mouseEvent);
    if (yx == null) return;
    const [sourceY, sourceX] = yx;

    this._lastSourceY = sourceY;
    this._lastSourceX = sourceX;

    if (this.preview) {
      this.refreshPreview();
      this._previewCursor(sourceY, sourceX);
    }

    this._pixels(sourceY, sourceX);
    this._didDrawOnLastSource = true;
  };


  /**
   * Mount all event listeners onto the canvas.
   */
  public mount(): void {
    super.mount();
    this.canvas.addEventListener("mousemove", this._onMouseMove);
    this.canvas.addEventListener("mousedown", this._onMouseDown);
  }


  /**
   * Unmount all mounted event listeners on canvas.
   */
  public unmount(): void {
    super.unmount();
    this.canvas.removeEventListener("mousemove", this._onMouseMove);
    this.canvas.removeEventListener("mousedown", this._onMouseDown);
  }
}

export default Fill;