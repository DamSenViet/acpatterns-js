class Hook {
  private callbacks: Function[] = [];

  public constructor () {}

  public tap(callback: Function) {
    this.callbacks.push(callback);
  }

  public untap(callback: Function) {
    for (let i = 0; i < this.callbacks.length; ++i) {
      if (callback === this.callbacks[i]) this.callbacks.splice(i, 1);
    }
  }

  public trigger(...args: any[]) {
    for (let i = 0; i < this.callbacks.length; ++i)
      this.callbacks[i](...args);
  }
}

export default Hook;