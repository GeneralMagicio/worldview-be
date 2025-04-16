import { HttpException, HttpStatus } from '@nestjs/common';

export class UserNotFoundException extends HttpException {
  constructor(message = 'User not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class UserActionNotFoundException extends HttpException {
  constructor(message = 'User action not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class PollNotFoundException extends HttpException {
  constructor(message = 'Poll not found or not active') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class VoteNotFoundException extends HttpException {
  constructor(message = 'Vote not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateVoteException extends HttpException {
  constructor(message = 'User has already voted in this poll') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class VoteOptionException extends HttpException {
  constructor(message = 'Invalid vote option') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class UnauthorizedActionException extends HttpException {
  constructor(message = 'You are not authorized to perform this action') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class CreateUserException extends HttpException {
  constructor(message = 'User creation failed') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class SignatureVerificationFailureException extends HttpException {
  constructor(message = 'Signature verification failed') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
