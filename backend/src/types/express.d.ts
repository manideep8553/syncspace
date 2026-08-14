import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Id of the authenticated user, populated by the `authenticate` middleware. */
      userId: string;
      /** Validated request data, populated by the `validate` middleware. */
      validated: Record<string, unknown>;
    }
  }
}

export {};
