export type ProviderId = 'embedmaster' | 'vidzee' | 'vidlink' | 'poseidon' | 'zeus' | 'hades' | 'erebus';

export interface Provider {
  id: ProviderId;
  name: string;
  baseDomain: string;
  getUrl: (mediaId: number, mediaType: string, season?: number, episode?: number) => string;
}
