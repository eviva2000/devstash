type QueryLimitOptions = {
  readonly max: number;
  readonly name: string;
};

export function validateQueryLimit(
  limit: number,
  { max, name }: QueryLimitOptions
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    throw new RangeError(`${name} must be an integer between 1 and ${max}.`);
  }

  return limit;
}
