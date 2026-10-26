import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, headers, body } = req;
    this.logger.debug(
      `→ ${method} ${originalUrl} | content-type: ${headers['content-type'] ?? 'none'} | body: ${JSON.stringify(body)}`,
    );
    next();
  }
}
