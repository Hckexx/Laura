import type { Genre } from './genres';

export type MediaType = 'movie' | 'tv';

export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  media_type?: MediaType;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  overview?: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface MovieDetails {
  id: number;
  title: string;
  tagline?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  runtime: number;
  genres: Genre[];
}

export interface TVSeasonSummary {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  air_date?: string;
  overview?: string;
}

export interface TVDetails {
  id: number;
  name: string;
  tagline?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  first_air_date?: string;
  number_of_seasons: number;
  number_of_episodes: number;
  genres: Genre[];
  seasons: TVSeasonSummary[];
}

export interface TVEpisode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  overview?: string;
  still_path: string | null;
  vote_average: number;
  air_date?: string;
  runtime: number;
}

export interface TVSeasonDetails {
  id: number;
  name: string;
  season_number: number;
  overview?: string;
  poster_path: string | null;
  air_date?: string;
  episodes: TVEpisode[];
}

export interface VideoItem {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
}
