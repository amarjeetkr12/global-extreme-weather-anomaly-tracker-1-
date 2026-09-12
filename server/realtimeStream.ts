import { Response } from 'express';
import { EventEmitter } from 'events';

export interface SseClient {
  id: string;
  res: Response;
  connectedAt: string;
}

export class RealtimeStreamServer extends EventEmitter {
  private clients: Map<string, SseClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast('ping', { timestamp: new Date().toISOString() });
    }, 15000);
  }

  public registerClient(res: Response): string {
    const clientId = `CLIENT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
    res.flushHeaders?.();

    const client: SseClient = {
      id: clientId,
      res,
      connectedAt: new Date().toISOString(),
    };

    this.clients.set(clientId, client);

    // Initial handshake
    this.sendToClient(client, 'connected', {
      clientId,
      timestamp: new Date().toISOString(),
      message: 'Real-time Extreme Weather Stream Online',
    });

    res.on('close', () => {
      this.clients.delete(clientId);
    });

    return clientId;
  }

  public sendToClient(client: SseClient, event: string, payload: any) {
    try {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      this.clients.delete(client.id);
    }
  }

  public broadcast(event: string, payload: any) {
    for (const client of this.clients.values()) {
      this.sendToClient(client, event, payload);
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const realtimeStream = new RealtimeStreamServer();
