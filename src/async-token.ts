export class AsyncTokenFactory {
  private counter: number;
  constructor() {
    this.counter = 0;
  }
  public issue(): AsyncToken {
    return new AsyncToken(this, ++this.counter);
  }
  public isTokenValid(token: AsyncToken): boolean {
    return token.token === this.counter;
  }
}

export class AsyncToken {
  private factory: AsyncTokenFactory;
  readonly token: number;
  constructor(factory: AsyncTokenFactory, token: number) {
    this.factory = factory;
    this.token = token;
  }

  public isValid(): boolean {
    return this.factory.isTokenValid(this);
  }

  public onValid(cb : () => void): void {
    if (this.isValid()) cb();
  }
}
