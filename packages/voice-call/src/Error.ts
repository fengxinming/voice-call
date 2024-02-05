export class SenderError extends Error {
  [key: string]: any;

  constructor(message: string, extra?: {[key: string]: any}) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    else {
      this.stack = (new Error()).stack;
    }

    Object.assign(this, extra);
    this.name = 'SenderError';
  }
}

export class ClientError extends SenderError {
  constructor(message: string, extra?: {[key: string]: any}) {
    super(message, extra);

    this.name = 'ClientError';
  }
}

export class RecorderError extends SenderError {
  constructor(message: string, extra?: {[key: string]: any}) {
    super(message, extra);

    this.name = 'Recorder';
  }
}
