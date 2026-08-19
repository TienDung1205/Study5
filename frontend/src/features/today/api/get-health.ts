import { getJson } from '../../../services/api-client';

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export function getHealth(): Promise<HealthResponse> {
  return getJson<HealthResponse>('/health');
}

