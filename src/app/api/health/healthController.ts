import { Route, Get } from 'tsoa';

@Route('health')
export class HealthController {
  @Get('/')
  public async getHealth(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}