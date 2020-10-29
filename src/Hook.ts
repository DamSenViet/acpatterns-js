class Hook<T extends any[]> {
  private _callbacks: Array<(...args: T) => any> = [];

  public constructor() { }

  public tap(callback: (...args: T) => any): void {
    this._callbacks.push(callback);
  }

  public untap(callback: (...args: T) => any): void {
    for (let i = 0; i < this._callbacks.length; ++i) {
      if (callback !== this._callbacks[i]) continue;
      this._callbacks.splice(i, 1);
    }
  }

  public clear(): void {
    while (this._callbacks.length > 0) {
      this._callbacks.pop();
    }
  }

  public trigger(...args: T): void {
    for (let i = 0; i < this._callbacks.length; ++i)
      this._callbacks[i](...args);
  }
}

export default Hook;