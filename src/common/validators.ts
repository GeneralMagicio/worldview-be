import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'

@ValidatorConstraint({ name: 'isNonNegativeInteger', async: false })
export class IsPositiveInteger implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'number' && typeof value !== 'string') {
      return false
    }
    const num = Number(value)
    return Number.isInteger(num) && num > 0
  }
  defaultMessage(): string {
    return '$property must be a positive integer'
  }
}

@ValidatorConstraint({ name: 'IsRecordStringNumber', async: false })
export class IsRecordStringNumber implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false
    }
    return Object.entries(value as Record<string, unknown>).every(
      ([key, val]) => typeof key === 'string' && typeof val === 'number',
    )
  }
  defaultMessage(): string {
    return 'weightDistribution must be a record with string keys and number values'
  }
}
