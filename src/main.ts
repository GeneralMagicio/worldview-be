import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const environment = process.env.NODE_ENV || 'development';
  const rawOrigins = process.env.WHITELISTED_ORIGINS || '';
  const rawTunnelDomains = process.env.TUNNEL_DOMAINS || '';

  const whiteListedOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim().replace(/^https?:\/\//, ''))
    .filter((origin) => !!origin);

  const tunnelDomains = rawTunnelDomains
    .split(',')
    .map((domain) => domain.trim())
    .filter((domain) => !!domain);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);

      try {
        const { hostname } = new URL(origin);

        const isWhitelisted = whiteListedOrigins.includes(hostname);

        const isTunnelDomain =
          environment !== 'production' &&
          tunnelDomains.some((testDomain) => hostname.endsWith(testDomain));

        if (isWhitelisted || isTunnelDomain) {
          return callback(null, true);
        }

        console.error(`[CORS ERROR]: Origin ${origin} is not allowed.`);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      } catch (error) {
        console.error(`[CORS ERROR]: Malformed origin`, error);
        return callback(new Error(`Invalid origin: ${origin}`));
      }
    },
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      exceptionFactory: (errors) => {
        const firstError = errors[0];
        if (!firstError?.constraints) {
          return new BadRequestException('Validation failed');
        }
        const message = Object.values(firstError.constraints)[0];
        return new BadRequestException(message);
      },
    }),
  );
  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
