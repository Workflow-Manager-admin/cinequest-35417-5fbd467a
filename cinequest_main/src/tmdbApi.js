//
// tmdbApi.js - Reusable utility for TMDB API calls in CineQuest
//

// TMDB API constants
const TMDB_API_KEY = '5bc67d3b06aecbd18121a3cbbc16eb59';
const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';

//
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

//
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

//
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

//
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

//
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

//
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

//
// PUBLIC_INTERFACE
// getPersonDetails - Get person (actor/director) details by ID
//
export async function getPersonDetails(personId, options = {}) {
  /**
   * Fetches person details (useful for director guess game)
   */
  return fetchFromTMDB(`/person/${personId}`, options);
}

//
// PUBLIC_INTERFACE
// getPersonMovieCredits - Get all movies for a person (actor/director)
//
export async function getPersonMovieCredits(personId, options = {}) {
  /**
   * Fetches movies for a person (acting, directing, etc.)
   */
  return fetchFromTMDB(`/person/${personId}/movie_credits`, options);
}

//
// Future expansion: add more utility methods as needed for each game type.
//

// Export TMDB config if needed elsewhere
export const TMDB_CONFIG = {
  api_key: TMDB_API_KEY,
  api_base_url: TMDB_API_BASE_URL
};
