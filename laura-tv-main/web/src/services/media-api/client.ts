import { config } from '../../config/env'

export async function fetchFromAPI(endpoint: string) {
  const response = await fetch(`${config.apiBaseUrl}${endpoint}`)
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  
  return response.json()
}
