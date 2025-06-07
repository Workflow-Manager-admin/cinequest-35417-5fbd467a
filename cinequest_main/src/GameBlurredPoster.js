import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPopularMovies,
  isKollywoodOriginalMovie,
  getRomanizedTitle,
  getKollywoodOriginalMovies,
  getMovieDetails,
} from "./tmdbApi";

function getSectionRegion(section) {
  return section === "kollywood" ? "IN" : "US";
}

// Helper to get initials (for Clue1)
function getInitials(str) {
  if (!str) return "";
  return str
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// PUBLIC_INTERFACE
export default function GameBlurredPoster({ section }) {
  // -- Score and unique movies (session state) --
  const [movie, setMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null); // extra details for clues
  const [guess, setGuess] = useState("");
  const [msg, setMsg] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [clue1, setClue1] = useState("");
  const [clue2, setClue2] = useState("");
  const [showClue1, setShowClue1] = useState(false);
  const [showClue2, setShowClue2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nextPending, setNextPending] = useState(false);
  const [score, setScore] = useState(0);
  const [usedMovies, setUsedMovies] = useState([]); // store TMDB IDs
  const [movieSet, setMovieSet] = useState([]); // 18 unique per session
  const [questionNumber, setQuestionNumber] = useState(1); // 1-based
  const navigate = useNavigate();
  const timeoutRef = useRef();

  // Build an array of 18 unique movies for the session
  async function buildUniqueMovieSet() {
    let filtered = [];
    if (section === "hollywood") {
      const data = await getPopularMovies({
        region: getSectionRegion(section),
        language: "en",
        page: 1,
        include_adult: false,
      });
      filtered = (data.results || []).filter(
        (m) => m.poster_path && !m.adult && m.title
      );
    } else if (section === "kollywood") {
      const data = await getKollywoodOriginalMovies({
        page: 1,
      });
      filtered = (data.results || []).filter(
        (m) => m.poster_path && !m.adult && m.title
      );
    }
    // Shuffle and pick unique 18 movies (fewer if less available)
    // Avoid duplicates by TMDB id or poster_path
    let unique = [];
    const seenIds = new Set();
    for (let m of filtered) {
      if (!seenIds.has(m.id) && (!m.adult) && m.title && m.poster_path) {
        unique.push(m);
        seenIds.add(m.id);
      }
      if (unique.length >= 18) break;
    }
    return unique;
  }

  // Fetch a random unused movie from set for current question
  function pickNextMovie(moviesList, usedIds) {
    // Pick random from those not yet used this session
    const available = moviesList.filter((m) => !usedIds.includes(m.id));
    if (available.length === 0) {
      return null;
    }
    // Randomize pick
    return available[Math.floor(Math.random() * available.length)];
  }

  // PUBLIC_INTERFACE: SESSION GAME INIT & NEXT
  async function fetchNewPoster(isStart = false) {
    setMovie(null);
    setMovieDetails(null);
    setShowClue1(false);
    setShowClue2(false);
    setClue1("");
    setClue2("");
    setMsg("");
    setGuess("");
    setRevealed(false);
    setLoading(true);
    setNextPending(false);

    // -- On first call (or section change), build unique set and use first movie --
    if (isStart || movieSet.length === 0) {
      const uniqueMovies = await buildUniqueMovieSet();
      setMovieSet(uniqueMovies);
      setUsedMovies([]); // reset session
      setScore(0);
      setQuestionNumber(1);
      if (uniqueMovies.length === 0) {
        setMsg("No available movies for this game section!");
        setMovie(null);
        setLoading(false);
        return null;
      }
      // Pick a random first movie and set used
      const firstIdx = Math.floor(Math.random() * uniqueMovies.length);
      setMovie(uniqueMovies[firstIdx]);
      setUsedMovies([uniqueMovies[firstIdx].id]);
      setLoading(false);
      return uniqueMovies[firstIdx];
    }

    // -- For subsequent calls, pick new unused movie, advance quiz --
    const nextMovie = pickNextMovie(movieSet, usedMovies);
    if (nextMovie) {
      setMovie(nextMovie);
      setUsedMovies((prev) => [...prev, nextMovie.id]);
      setQuestionNumber((n) => n + 1);
    } else {
      // All movies used; end session
      setMovie(null);
      setMsg("🎉 Game complete! Final Score: " + score + " / " + usedMovies.length);
    }
    setLoading(false);
    return nextMovie;
  }

  // Fetch more details for clues when movie changes
  useEffect(() => {
    let isMounted = true;
    if (!movie) return;
    getMovieDetails(movie.id)
      .then((det) => {
        if (isMounted) setMovieDetails(det);
      })
      .catch(() => {
        if (isMounted) setMovieDetails(null);
      });
    return () => {
      isMounted = false;
    };
  }, [movie]);

  // Initial fetch on mount or section change
  useEffect(() => {
    fetchNewPoster(true);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line
  }, [section]);

  // After guess/reveal, automatically go next after short pause
  function triggerNextPoster(delay = 1600) {
    setNextPending(true);
    timeoutRef.current = setTimeout(() => {
      // Only move to next if we haven't finished all
      if (usedMovies.length < movieSet.length) {
        fetchNewPoster();
      }
    }, delay);
  }

  // Handle guess submission
  function checkGuess(e) {
    e.preventDefault();
    if (!movie) return;
    let answer =
      section === "kollywood" ? getRomanizedTitle(movie) : movie.title;
    const correct = (answer || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, "");
    const userGuess = guess.toLowerCase().replace(/[^a-z0-9]/gi, "");
    if (correct === userGuess) {
      setMsg(<span style={{ color: "#000", fontWeight: 600 }}>correct</span>);
      setRevealed(true);
      setScore((s) => s + 1);
      triggerNextPoster();
    } else {
      setMsg("❌ Incorrect guess.");
    }
  }

  // Reveal answer and auto-next
  function revealAnswer() {
    setRevealed(true);
    let answer = movie
      ? section === "kollywood"
        ? getRomanizedTitle(movie)
        : movie.title
      : "N/A";
    setMsg("😇 It's: " + answer);
    triggerNextPoster();
  }

  // CLUE1 handler: genre/year/initials
  function handleClue1() {
    if (!movie) return;
    let clueParts = [];
    // Genre
    let genreStr = "";
    if (movieDetails && movieDetails.genres && movieDetails.genres.length) {
      genreStr = movieDetails.genres[0].name;
    }
    if (genreStr) clueParts.push("Genre: " + genreStr);
    // Release Year
    if (movie.release_date) {
      clueParts.push("Year: " + (movie.release_date.slice(0, 4)));
    }
    // Title Initials
    let answer =
      section === "kollywood" ? getRomanizedTitle(movie) : movie.title;
    clueParts.push("Initials: " + getInitials(answer));
    setClue1(clueParts.join(" | "));
    setShowClue1(true);
  }

  // CLUE2 handler: lead actor or plot
  function handleClue2() {
    if (!movieDetails) return;
    // Prefer main actor (if credits present), else overview
    let actor = "";
    if (movieDetails.credits && movieDetails.credits.cast && movieDetails.credits.cast.length) {
      actor = movieDetails.credits.cast[0].name;
    }
    // But TMDB movie details by default do not include credits unless appended
    // If not present, use overview summary
    let overview = movieDetails.overview || "";
    let clue = actor
      ? `Lead Actor: ${actor}`
      : overview
      ? `Plot: ${overview.substring(0, 90)}...`
      : "No further hint!";
    setClue2(clue);
    setShowClue2(true);
  }

  // Whenever a new movie is picked, also fetch credits for clue2 if not present
  useEffect(() => {
    let isMount = true;
    if (!movie) return;
    // If movieDetails are already present but not credits, re-fetch with credits
    // Use append_to_response for credits in TMDB API
    getMovieDetails(movie.id, { append_to_response: "credits" })
      .then((det) => {
        if (isMount) setMovieDetails(det);
      })
      .catch(() => {});
    return () => {
      isMount = false;
    };
  }, [movie]);

  return (
    <div className="container" style={{ marginTop: 100 }}>
      <button
        className="btn"
        style={{
          background: "#f1e4fa",
          color: "#d505ff",
          border: "1px solid #d505ff55",
          marginBottom: 18,
          fontWeight: 600,
        }}
        onClick={() => navigate("/section")}
        disabled={loading}
      >
        ← Back
      </button>
      <h2 style={{ color: "#d505ff" }}>Blurred Poster Guessing</h2>
      {/* Show score / question counter */}
      <div style={{
        margin: "8px 0 22px 0",
        color: "#101",
        fontSize: 18,
        textAlign: "center",
        fontWeight: 500
      }}>
        Score: {score} &nbsp; | &nbsp; Question: {movieSet.length ? Math.min(questionNumber, movieSet.length) : 1} / {movieSet.length || 18}
      </div>
      {(loading || !movie) ? (
        <div>
          {msg ? msg : "Loading..."}
        </div>
      ) : (
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div
            style={{
              margin: "0 auto",
              width: 220,
              minHeight: 314,
              borderRadius: 12,
              overflow: "hidden",
              position: "relative",
              filter: revealed ? "none" : "blur(12px)",
              marginBottom: 16,
              boxShadow: "0 2px 32px #d505ff33",
            }}
          >
            <img
              src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
              alt="Blurred Movie Poster"
              style={{ width: "100%" }}
            />
            {revealed && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(255,255,255,0.85)",
                  color: "#d505ff",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                {section === "kollywood"
                  ? getRomanizedTitle(movie)
                  : movie.title}
              </div>
            )}
          </div>
          <form onSubmit={checkGuess}>
            <input
              type="text"
              placeholder="Your guess..."
              style={inputStyle}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              disabled={revealed || loading || nextPending}
              autoFocus
            />
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                marginTop: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn"
                style={{
                  background: "#d505ff",
                  color: "#fff",
                  opacity: revealed || loading || nextPending ? 0.4 : 1,
                }}
                type="submit"
                disabled={revealed || loading || nextPending}
              >
                Submit Guess
              </button>
              <button
                className="btn"
                style={{
                  background: "#fff",
                  color: "#d505ff",
                  border: "1px solid #d505ff",
                  opacity: revealed || loading || nextPending ? 0.4 : 1,
                }}
                type="button"
                onClick={revealAnswer}
                disabled={revealed || loading || nextPending}
              >
                Reveal Answer
              </button>
              <button
                className="btn"
                style={{
                  background: "#e0cafd",
                  color: "#552e98",
                  border: "1px solid #ccc",
                  opacity: showClue1 || loading ? 0.5 : 1,
                }}
                type="button"
                onClick={handleClue1}
                disabled={showClue1 || revealed || loading}
              >
                Clue1
              </button>
              <button
                className="btn"
                style={{
                  background: "#bdb2ff",
                  color: "#33165b",
                  border: "1px solid #999",
                  opacity: showClue2 || loading ? 0.5 : 1,
                }}
                type="button"
                onClick={handleClue2}
                disabled={showClue2 || revealed || loading}
              >
                Clue2
              </button>
            </div>
          </form>
          <div style={{ marginTop: 15, minHeight: 20 }}>
            {showClue1 && (
              <div style={{ color: "#a00", fontWeight: 500, margin: "5px 0" }}>
                {clue1}
              </div>
            )}
            {showClue2 && (
              <div style={{ color: "#d505ff", fontWeight: 600 }}>
                {clue2}
              </div>
            )}
          </div>
          <div style={{ marginTop: 18, minHeight: 24 }}>
            {/* Show message: support "correct" in black font */}
            {typeof msg === "string"
              ? msg
              : msg}
          </div>
          {nextPending && (
            <div style={{ marginTop: 12, color: "#999" }}>Next poster coming…</div>
          )}
          {/* On game completion, show reset button? */}
          {movie === null && usedMovies.length === movieSet.length && (
              <div>
                <div style={{ color: "#0d0d0d", fontWeight: 700, margin: "16px 0" }}>
                  Quiz Complete! Final Score: {score} / {movieSet.length}
                </div>
                <button
                  className="btn"
                  style={{
                    background: "#f3e7fa",
                    color: "#d505ff",
                    fontWeight: 600,
                    border: "1px solid #d505ff69"
                  }}
                  onClick={() => fetchNewPoster(true)}
                >
                  Play Again
                </button>
              </div>
            )}
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
  textAlign: "center",
};
