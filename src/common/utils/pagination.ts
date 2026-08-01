import { BadRequestException } from '@nestjs/common';

export function parsePaginationValue(value: string | undefined, fallback: number, maximum: number): number {
  if (value === undefined) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException('Pagination values must be positive integers');
  }
  return Math.min(parsed, maximum);
}
