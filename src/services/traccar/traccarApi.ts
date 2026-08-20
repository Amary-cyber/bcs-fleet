import { TraccarDevice, TraccarPosition } from '../../types';

export class TraccarApi {
  private baseUrl: string;
  private token: string;
  private authHeader: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_TRACCAR_URL || 'https://bcsfleet.bcs-groupe.tech';
    const username = import.meta.env.VITE_TRACCAR_USERNAME || '';
    const password = import.meta.env.VITE_TRACCAR_PASSWORD || '';
    this.token = import.meta.env.VITE_TRACCAR_TOKEN || '';

    if (this.token) {
      this.authHeader = `Bearer ${this.token}`;
    } else if (username && password) {
      this.authHeader = `Basic ${btoa(`${username}:${password}`)}`;
    } else {
      this.authHeader = '';
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.baseUrl) {
      throw new Error('TRACCAR LIVE NON CONFIGURÉ');
    }

    const url = `${this.baseUrl}/api${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.authHeader) {
      headers['Authorization'] = this.authHeader;
    }

    const response = await fetch(url, { ...options, headers, credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`Traccar API Error ${response.status}: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  // Check connection status
  async checkConnection(): Promise<boolean> {
    try {
      await this.request('/server');
      return true;
    } catch {
      return false;
    }
  }

  // Get all devices
  async getDevices(): Promise<TraccarDevice[]> {
    return this.request<TraccarDevice[]>('/devices');
  }

  // Get specific device by IMEI / uniqueId
  async getDeviceByImei(imei: string): Promise<TraccarDevice | null> {
    const devices = await this.getDevices();
    return devices.find((d) => d.uniqueId === imei) || null;
  }

  // Get positions for all active devices
  async getPositions(): Promise<TraccarPosition[]> {
    return this.request<TraccarPosition[]>('/positions');
  }

  // Get positions for specific device
  async getDevicePositions(deviceId: number, from: string, to: string): Promise<TraccarPosition[]> {
    const params = new URLSearchParams({
      deviceId: deviceId.toString(),
      from,
      to,
    });
    return this.request<TraccarPosition[]>(`/positions?${params.toString()}`);
  }

  // Send engine command (Immobilization / Resume)
  async sendEngineCommand(deviceId: number, type: 'engineStop' | 'engineResume'): Promise<boolean> {
    try {
      await this.request('/commands/send', {
        method: 'POST',
        body: JSON.stringify({
          deviceId,
          type,
          attributes: {},
        }),
      });
      return true;
    } catch (err) {
      console.error('Traccar command failed:', err);
      return false;
    }
  }


  async sendCommand(deviceId: number, type: 'engineStop' | 'engineResume'): Promise<boolean> {
    return this.sendEngineCommand(deviceId, type);
  }
}



export const traccarApi = new TraccarApi();
