import { ApiError } from '../utils/ApiError.js';

// Validates req[source] against a zod schema and replaces it with the parsed value.
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const first = result.error.issues[0];
    const msg = first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Invalid input.';
    return next(ApiError.badRequest(msg, result.error.issues));
  }
  req[source] = result.data;
  next();
};
