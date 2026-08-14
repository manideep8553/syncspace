import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export interface ValidationShape {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validate(shape: ValidationShape) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const body = shape.body?.safeParse(req.body ?? {});
    const params = shape.params?.safeParse(req.params);
    const query = shape.query?.safeParse(req.query);

    const failures: Array<{ where: string; issues: unknown }> = [];
    if (body && !body.success) failures.push({ where: 'body', issues: body.error.issues });
    if (params && !params.success) failures.push({ where: 'params', issues: params.error.issues });
    if (query && !query.success) failures.push({ where: 'query', issues: query.error.issues });

    if (failures.length > 0) {
      next(new ApiError(400, 'Validation failed', failures));
      return;
    }

    req.validated = {
      body: body?.data,
      params: params?.data,
      query: query?.data,
    };
    next();
  };
}
