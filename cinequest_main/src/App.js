import React, { useEffect, useState } from 'react';
import './App.css';
import { getPopularMovies } from './tmdbApi';

/**
 * Main CineQuest App container
 * Now includes TMDB API integration (see useEffect below for sample/demo usage)
 */
function App() {
  // Example: store demo popular movies (initial)
  const [popularMovies, setPopularMovies] = useState([]);
  const [tmdbError, setTmdbError] = useState(null);

  useEffect(() => {
    // Demo: Fetch popular Hollywood (US) movies on load
    getPopularMovies({ region: 'US', language: 'en', include_adult: false })
      .then(data => {
        // Exclude adult movies just in case (defensive)
        const filtered = (data.results || []).filter(
          m => !m.adult
        );
        setPopularMovies(filtered.slice(0, 4)); // Show top 4 as sample
      })
      .catch(err => {
        setTmdbError(err.message || 'TMDB API error');
      });
  }, []);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div className="logo">
              <span className="logo-symbol">*</span> CineQuest
            </div>
            <button className="btn">Login / Signup</button>
          </div>
        </div>
      </nav>

      <main>
        <div className="container">
          <div className="hero">
            <div className="subtitle">The Movie Game Platform</div>
            <h1 className="title">CineQuest</h1>
            <div className="description">
              Hollywood & Kollywood movie quiz games powered by TMDB.<br />
              <small>
                TMDB Integration active.
              </small>
            </div>
            <button className="btn btn-large">Get Started</button>
            {/* TMDB Demo Section */}
            <div style={{ marginTop: 32 }}>
              <div className="subtitle" style={{ fontSize: '1rem' }}>
                Popular Movies (from TMDB API)
              </div>
              {tmdbError && (
                <div style={{ color: 'red', marginBottom: 8 }}>
                  TMDB Error: {tmdbError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
                {popularMovies.map(m =>
                  <div key={m.id} style={{
                    background: 'rgba(0,0,0,0.25)',
                    padding: 12, borderRadius: 8, width: 120, textAlign: 'center'
                  }}>
                    {/* TMDB poster path: use url if available */}
                    {m.poster_path
                      ? <img
                          src={`https://image.tmdb.org/t/p/w185${m.poster_path}`}
                          alt={m.title}
                          style={{
                            width: '100%',
                            borderRadius: 6,
                            marginBottom: 8,
                          }}
                        />
                      : <div style={{ fontSize: 24, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333', borderRadius: 6, marginBottom: 8 }}>
                          🎬
                        </div>
                    }
                    <div style={{ fontWeight: 500 }}>{m.title}</div>
                    <div style={{ fontSize: '0.9em', color: '#ccc', marginTop: 2 }}>
                      {m.release_date ? m.release_date.substring(0, 4) : ''}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* End TMDB demo */}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;