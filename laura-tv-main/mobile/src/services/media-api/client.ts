import { config } from '../../config/env';

export async function fetchFromAPI<T = any>(endpoint: string): Promise<T> {
  const url = `${config.apiBaseUrl}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} from ${endpoint}`);
  }

  return response.json();
}
