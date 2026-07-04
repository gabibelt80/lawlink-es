type DecimalLike = { toString(): string };

export function decimalToNumber(value: DecimalLike | number) {
  return typeof value === "number" ? value : Number(value.toString());
}

export function nullableDecimalToNumber(value: DecimalLike | number | null | undefined) {
  return value === null || value === undefined ? null : decimalToNumber(value);
}
