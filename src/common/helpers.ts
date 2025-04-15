import { InternalServerErrorException } from '@nestjs/common';

export function handleError(error: unknown): never {
  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred';
  throw new InternalServerErrorException(errorMessage);
}
