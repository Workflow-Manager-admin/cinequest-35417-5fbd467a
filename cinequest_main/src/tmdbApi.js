//
// tmdbApi.js - Reusable utility for TMDB API calls in CineQuest
//

// TMDB API constants
const TMDB_API_KEY = '5bc67d3b06aecbd18121a3cbbc16eb59';
const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Checks whether a movie object from TMDB is a true Kollywood (Tamil-original) movie (not dubbed).
 * @param {object} movie - Movie object from TMDB
 * @returns {boolean} - true if movie is original Tamil (Kollywood) production
 */
export function isKollywoodOriginalMovie(movie) {
  return movie &&
    movie.original_language === "ta" &&
    (!movie.spoken_languages || movie.spoken_languages.some(lang => lang.iso_639_1 === "ta")) &&
    (!movie.title || !/dub(?:bed)?/i.test(movie.title));
}

/**
 * Extracts the "romanized" (English) title for Kollywood movies.
 * Returns movie.original_title if present (usually Romanized for Tamil originals), falls back to title, or tries transliteration if only Tamil script present.
 * If provided, prefers an 'en_title' field used by TMDB sometimes.
 * @param {object} movie - Movie object from TMDB
 * @returns {string}
 */
export function getRomanizedTitle(movie) {
  // If original_title exists and is not in Tamil script, use it. Else fallback.
  if (movie && movie.original_title && !/[\u0B80-\u0BFF]/.test(movie.original_title)) {
    return movie.original_title;
  }
  // Sometimes TMDB may provide an 'en_title' in translations or extras (not standard, but try if present)
  if (movie && movie.en_title) return movie.en_title;
  // Fallback to title (if Roman or not obviously Tamil script)
  if (movie && movie.title && !/[\u0B80-\u0BFF]/.test(movie.title)) {
    return movie.title;
  }
  // If only Tamil script, add a simple transliteration (rough)
  // This is a placeholder. For a real app, use a Tamil-to-Latin transliteration library.
  if (movie && movie.title && /[\u0B80-\u0BFF]/.test(movie.title)) {
    return "[Tamil Title: romanized unavailable]";
  }
  return "";
}

// PUBLIC_INTERFACE
// fetchFromTMDB - Generic fetch method for any TMDB API endpoint
//
export async function fetchFromTMDB(endpoint, params = {}) {
  /**
   * Makes a GET request to the TMDB API using the provided endpoint and parameters.
   * @param {string} endpoint - TMDB API endpoint (e.g. '/movie/popular')
   * @param {object} params - Query parameters as key:value pairs
   * @returns {Promise<object>} - Decoded JSON response from TMDB
   * Throws error on failure.
   */
  const url = new URL(`${TMDB_API_BASE_URL}${endpoint}`);
  // Add API key and params
  url.searchParams.append('api_key', TMDB_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }

  const response = await fetch(url.href);
  if (!response.ok) {
    throw new Error(`TMDB API request failed (${response.status}): ${response.statusText}`);
  }
  return response.json();
}

// PUBLIC_INTERFACE
// getMovieDetails - Fetch movie details by ID
//
export async function getMovieDetails(movieId, options = {}) {
  /**
   * Fetches detailed information for a movie by its TMDB ID.
   * @param {number|string} movieId - The TMDB movie ID
   * @param {object} options - Additional TMDB params (language, append_to_response, etc.)
   * @returns {Promise<object>} - Movie details object from TMDB
   */
  return fetchFromTMDB(`/movie/${movieId}`, options);
}

// PUBLIC_INTERFACE
// searchMovies - Search for movies by title/keyword
//
export async function searchMovies(query, options = {}) {
  /**
   * Performs a movie search by query string.
   * @param {string} query - User-provided search string
   * @param {object} options - Additional TMDB params (language, include_adult, etc.)
   */
  const merged = { query, ...options };
  return fetchFromTMDB('/search/movie', merged);
}

// PUBLIC_INTERFACE
// getPopularMovies - Get popular movies by region/category
//
export async function getPopularMovies(options = {}) {
  /**
   * Fetches a list of popular movies.
   * @param {object} options - TMDB parameters (region, page, etc.)
   */
  return fetchFromTMDB('/movie/popular', options);
}

// PUBLIC_INTERFACE
// getMoviesByGenre - Get movies by genre ID
//
export async function getMoviesByGenre(genreId, options = {}) {
  /**
   * Fetches movies for a specific genre.
   * @param {number|string} genreId - TMDB genre ID
   * @param {object} options - Additional TMDB params
   */
  const merged = { with_genres: genreId, ...options };
  return fetchFromTMDB('/discover/movie', merged);
}

// PUBLIC_INTERFACE
// getMoviesByYearAndRegion - Discover movies by year and country/region
//
export async function getMoviesByYearAndRegion(year, region, options = {}) {
  /**
   * Fetches movies for a specific year and region.
   */
  const merged = { year, region, ...options };
  return fetchFromTMDB('/discover/movie', merged);
}

// PUBLIC_INTERFACE
// getPersonDetails - Get person (actor/director) details by ID
//
export async function getPersonDetails(personId, options = {}) {
  /**
   * Fetches person details (useful for director guess game)
   */
  return fetchFromTMDB(`/person/${personId}`, options);
}

// PUBLIC_INTERFACE
// getPersonMovieCredits - Get all movies for a person (actor/director)
//
export async function getPersonMovieCredits(personId, options = {}) {
  /**
   * Fetches movies for a person (acting, directing, etc.)
   */
  return fetchFromTMDB(`/person/${personId}/movie_credits`, options);
}

// Future expansion: add more utility methods as needed for each game type.
//

// Export TMDB config if needed elsewhere
export const TMDB_CONFIG = {
  api_key: TMDB_API_KEY,
  api_base_url: TMDB_API_BASE_URL
};
