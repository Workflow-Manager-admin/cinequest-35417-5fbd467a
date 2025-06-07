import React, { useEffect, useState } from "react";
import { getPopularMovies } from "./tmdbApi";

function getSectionRegion(section) {
  return section === "kollywood" ? "IN" : "US";
}

// PUBLIC_INTERFACE
export default function GameBlurredPoster({ section }) {
  // Select a popular movie (not adult, has poster)
  const [movie, setMovie] = useState(null);
  const [guess, setGuess] = useState("");
  const [msg, setMsg] = useState("");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    getPopularMovies({
      region: getSectionRegion(section),
      language: section === "hollywood" ? "en" : "ta",
      page: 1,
      include_adult: false
    })
      .then(data => {
        const filtered = (data.results || []).filter(
          m => m.poster_path && !m.adult && m.title
        );
        // Pick random one
        if (filtered.length) {
          setMovie(filtered[Math.floor(Math.random() * filtered.length)]);
        }
      });
  }, [section]);

  function checkGuess(e) {
    e.preventDefault();
    if (!movie) return;
    const correct = movie.title.toLowerCase().replace(/[^a-z0-9]/gi, "");
    const userGuess = guess.toLowerCase().replace(/[^a-z0-9]/gi, "");
    if (correct === userGuess) {
      setMsg("🎉 Correct! This is " + movie.title);
    } else {
      setMsg("❌ Incorrect guess.");
    }
  }

  function revealAnswer() {
    setRevealed(true);
    setMsg("😇 It's: " + (movie ? movie.title : "N/A"));
  }

  return (
    <div className="container" style={{ marginTop: 100 }}>
      <h2 style={{ color: "#d505ff" }}>Blurred Poster Guessing</h2>
      {!movie ? (
        <div>Loading...</div>
      ) : (
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{
            margin: "0 auto",
            width: 220,
            minHeight: 314,
            borderRadius: 12,
            overflow: "hidden",
            position: "relative",
            filter: revealed ? "none" : "blur(12px)",
            marginBottom: 16,
            boxShadow: "0 2px 32px #d505ff33"
          }}>
            <img
              src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
              alt="Blurred Movie Poster"
              style={{ width: "100%" }}
            />
            {revealed &&
              <div style={{
                position: "absolute",
                left: 0, top: 0, right: 0, bottom: 0,
                background: "rgba(255,255,255,0.85)",
                color: "#d505ff",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22
              }}>
                {movie.title}
              </div>}
          </div>

          <form onSubmit={checkGuess}>
            <input
              type="text"
              placeholder="Your guess..."
              style={inputStyle}
              value={guess}
              onChange={e => setGuess(e.target.value)}
              disabled={revealed}
            />
            <div style={{
              display: "flex",
              gap: 14,
              justifyContent: "center",
              marginTop: 10
            }}>
              <button className="btn"
                style={{
                  background: "#d505ff", color: "#fff"
                }}
                type="submit"
                disabled={revealed}
              >
                Submit Guess
              </button>
              <button className="btn"
                style={{
                  background: "#fff",
                  color: "#d505ff",
                  border: "1px solid #d505ff"
                }}
                type="button"
                onClick={revealAnswer}
                disabled={revealed}
              >Reveal Answer</button>
            </div>
          </form>
          <div style={{ marginTop: 22, minHeight: 24 }}>
            {msg}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  border: "1px solid #d505ff66",
  borderRadius: 6,
  fontSize: 19,
  padding: "13px 18px",
  width: 260,
  outline: "none",
  textAlign: "center"
};
