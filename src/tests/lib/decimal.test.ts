import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { decimalToNumber, nullableDecimalToNumber } from "@/lib/decimal";

describe("decimal helpers", () => {
  it("converts Prisma Decimal to a plain number", () => {
    expect(decimalToNumber(new Prisma.Decimal("1280000.50"))).toBe(1280000.5);
  });

  it("keeps number values usable and normalizes empty values to null", () => {
    expect(decimalToNumber(5200000)).toBe(5200000);
    expect(nullableDecimalToNumber(null)).toBeNull();
    expect(nullableDecimalToNumber(undefined)).toBeNull();
  });
});
