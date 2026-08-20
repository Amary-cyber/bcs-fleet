import { TraccarDevice, TraccarPosition } from '../../types';

export class TraccarApi {
  private baseUrl: string;
  private token: string;
  private authHeader: string;
  private username: string;
  private password: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_TRACCAR_URL || 'https://bcsfleet.bcs-groupe.tech';
    this.username = import.meta.env.VITE_TRACCAR_USERNAME || 'admin@bcs-groupe.tech';
    this.password = import.meta.env.VITE_TRACCAR_PASSWORD || 'Amary_BCS_2026!';
    this.token = import.meta.env.VITE_TRACCAR_TOKEN || '';

    if (this.token) {
      this.authHeader = `Bearer ${this.token}`;
    } else if (this.username && this.password) {
      this.authHeader = `Basic ${btoa(`${this.username}:${this.password}`)}`;
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

    const response = await fetch(url, { ...options, headers, credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Traccar API Error ${response.status}: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  // Check connection status & initialize session
  async checkConnection(): Promise<boolean> {
    try {
      await this.request('/server');
      // Authenticate session if needed
      try {
        if (this.username && this.password) {
          const body = `email=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`;
          await fetch(`${this.baseUrl}/api/session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
            },
            body,
            credentials: 'include',
          });
        }
      } catch (authErr) {
        console.warn('Traccar session initialization note:', authErr);
      }
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
