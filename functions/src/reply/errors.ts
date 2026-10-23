export type StructuringErrorCode =
  | "network"
  | "timeout"
  | "empty_response"
  | `http_${number}`;

export class StructuringError extends Error {
  constructor(readonly code: StructuringErrorCode) {
    super(`structuring:${code}`);
    this.name = "StructuringError";
  }
}
