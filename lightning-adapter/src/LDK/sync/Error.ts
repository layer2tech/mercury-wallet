export class TxSyncError extends Error {
  static from(err: unknown): string | undefined {
    throw new Error("Error occured" + err);
  }
  constructor(message: string) {
    super(message);
  }
}

export class InternalError extends Error {
  static Inconsistency: InternalError;
  constructor(message: string) {
    super(message);
  }
}

export const enum TxSyncErrorType {
  Failed = "Failed to conduct transaction sync.",
}

export const enum InternalErrorType {
  Failed = "Failed to conduct transaction sync.",
  Inconsistency = "Encountered an inconsistency during transaction sync.",
}

export function createTxSyncError(type: TxSyncErrorType): TxSyncError {
  return new TxSyncError(type);
}

export function createInternalError(type: InternalErrorType): InternalError {
  return new InternalError(type);
}
