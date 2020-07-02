class Hook<T extends any[]> {
  private callbacks: Function[] = [];

  public constructor() { }

  public tap(callback: Function): void {
    this.callbacks.push(callback);
  }

  public untap(callback: Function): void {
    for (let i = 0; i < this.callbacks.length; ++i) {
      if (callback === this.callbacks[i]) this.callbacks.splice(i, 1);
      break;
    }
  }

  public clear(): void {
    for (let i = 0; i < this.callbacks.length; ++i) {
      this.callbacks[i] = null;
    }
    while (this.callbacks.length !== 0) {
      this.callbacks.pop();
    }
  }

  public trigger(...args: T): void {
    for (let i = 0; i < this.callbacks.length; ++i)
      this.callbacks[i](...args);
  }
}

export default Hook;