import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getPopularMovies, getMovieDetails, getRomanizedTitle } from "./tmdbApi";

// Max questions per session
const MAX_QUESTIONS = 15;

// PUBLIC_INTERFACE
export default function GameFourImageConnection({ section }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); // index of current question (0-based)
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [userGuess, setUserGuess] = useState("");
  const [msg, setMsg] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [error, setError] = useState("");
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const navigate = useNavigate();
  const timeoutRef = useRef();

  // Helper: Get clue image objects for a movie from TMDB (actors, props, posters)
  async function getClueImagesForMovie(movie) {
    // Fetch movie details (for stills, posters)
    let images = [];
    let clues = [];
    let movieDetails = null;
    try {
      movieDetails = await getMovieDetails(movie.id, { append_to_response: "images,credits" });
    } catch {
      // fallback: minimal clues
      return { images: [], clues: [] };
    }
    // 1. Poster
    if (movieDetails.poster_path) {
      images.push({
        url: `https://image.tmdb.org/t/p/w342${movieDetails.poster_path}`,
        type: "Poster",
        name: movieDetails.title
      });
      clues.push("Poster");
    }
    // 2. Backdrop
    if (movieDetails.backdrop_path) {
      images.push({
        url: `https://image.tmdb.org/t/p/w500${movieDetails.backdrop_path}`,
        type: "Backdrop",
        name: movieDetails.title
      });
      clues.push("Backdrop");
    }
    // 3. Most prominent actor (if any)
    if (
      movieDetails.credits &&
      movieDetails.credits.cast &&
      movieDetails.credits.cast.length
    ) {
      const leadActor = movieDetails.credits.cast[0];
      if (leadActor.profile_path) {
        images.push({
          url: `https://image.tmdb.org/t/p/w185${leadActor.profile_path}`,
          type: "Actor",
          name: leadActor.name
        });
        clues.push(leadActor.name);
      }
    }
    // 4. 2nd actor, if present, or additional image
    if (
      movieDetails.credits &&
      movieDetails.credits.cast &&
      movieDetails.credits.cast.length > 1
    ) {
      const actor2 = movieDetails.credits.cast[1];
      if (actor2.profile_path) {
        images.push({
          url: `https://image.tmdb.org/t/p/w185${actor2.profile_path}`,
          type: "Actor",
          name: actor2.name
        });
        clues.push(actor2.name);
      }
    }
    // 5. Still images/scenes (TMDB images collection)
    if (
      movieDetails.images &&
      movieDetails.images.backdrops &&
      movieDetails.images.backdrops.length > 0
    ) {
      const still = movieDetails.images.backdrops[0];
      if (still.file_path) {
        images.push({
          url: `https://image.tmdb.org/t/p/w342${still.file_path}`,
          type: "Scene",
          name: "Scene"
        });
        clues.push("Scene");
      }
    }
    // Only keep up to 4 clues/images
    let imgClues = [];
    for (let i = 0; i < images.length; ++i) {
      imgClues.push(images[i]);
      if (imgClues.length === 4) break;
    }
    // If less than 4, supplement with available posters/backdrops within details
    // Ensuring 4 clues
    if (imgClues.length < 4) {
      if (
        movieDetails.images &&
        movieDetails.images.posters &&
        movieDetails.images.posters.length > 0
      ) {
        for (let i = 0; i < movieDetails.images.posters.length && imgClues.length < 4; ++i) {
          const poster = movieDetails.images.posters[i];
          imgClues.push({
            url: `https://image.tmdb.org/t/p/w342${poster.file_path}`,
            type: "Poster",
            name: movieDetails.title
          });
        }
      }
    }
    // Further supplement with cast images
    if (
      movieDetails.credits &&
      movieDetails.credits.cast &&
      movieDetails.credits.cast.length > 2
    ) {
      for (let i = 2; i < movieDetails.credits.cast.length && imgClues.length < 4; ++i) {
        const member = movieDetails.credits.cast[i];
        if (member && member.profile_path) {
          imgClues.push({
            url: `https://image.tmdb.org/t/p/w185${member.profile_path}`,
            type: "Actor",
            name: member.name
          });
        }
      }
    }
    // Deduplicate by url
    const seen = new Set();
    imgClues = imgClues.filter(c => {
      if (!c.url || seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    });
    // If STILL not enough, use what we have (may be <4 for rare incomplete cases)
    return { images: imgClues, clues: clues };
  }

  // Helper: Shuffle array
  function shuffleArray(arr) {
    const clone = arr.slice();
    for (let i = clone.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [clone[i], clone[j]] = [clone[j], clone[i]];
    }
    return clone;
  }

  // On section change/mount: fetch and prepare 15 unique connection questions
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setSessionCompleted(false);
    setScore(0);
    setCurrentIndex(0);
    setUserGuess("");
    setMsg("");
    setRevealed(false);

    async function buildQuestions() {
      let movies = [];
      // Use only popular movies with posters, no adults, matching section
      try {
        movies = await getPopularMovies({
          region: section === "kollywood" ? "IN" : "US",
          language: section === "hollywood" ? "en" : "ta",
          include_adult: false,
          page: 1
        });
        // Filter for unique, with poster_path, etc.
        movies = (movies.results || []).filter(
          m => m.poster_path && m.title && !m.adult
        );
        // Shuffle and select up to MAX_QUESTIONS unique movies
        movies = shuffleArray(movies).slice(0, MAX_QUESTIONS * 2);
        // There could be duplicates by title or id, further deduplicate
        const seenIds = new Set();
        movies = movies.filter(m => {
          if (seenIds.has(m.id)) return false;
          seenIds.add(m.id);
          return true;
        });
      } catch {
        if (isMounted) {
          setError("Failed to load movies from TMDB. Try again later.");
          setLoading(false);
        }
        return;
      }
      // For each movie, build image clues (async in parallel)
      let qList = [];
      for (let i = 0; i < movies.length && qList.length < MAX_QUESTIONS; ++i) {
        const clues = await getClueImagesForMovie(movies[i]);
        // Only include if at least 2+ images available (prefer 4)
        if (clues.images.length >= 2) {
          qList.push({
            movie: movies[i],
            images: clues.images,
            answer:
              section === "kollywood"
                ? getRomanizedTitle(movies[i])
                : movies[i].title
          });
        }
      }
      // Shuffle questions and keep first MAX_QUESTIONS
      qList = shuffleArray(qList).slice(0, MAX_QUESTIONS);
      if (isMounted) {
        setQuestions(qList);
        setLoading(false);
      }
    }
    buildQuestions();
    // Cleanup
    return () => {
      isMounted = false;
      clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line
  }, [section]);

  // After guess/reveal, auto move to next after pause
  function triggerNextQuestion(delay = 1600) {
    setShowNext(true);
    timeoutRef.current = setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
        setUserGuess("");
        setMsg("");
        setRevealed(false);
        setShowNext(false);
      } else {
        setSessionCompleted(true);
        setShowNext(false);
      }
    }, delay);
  }

  // PUBLIC_INTERFACE: handle answer submission
  function handleSubmit(e) {
    e.preventDefault();
    if (!questions.length || sessionCompleted) return;
    const q = questions[currentIndex];
    if (!q) return;

    const correct =
      userGuess.trim().toLowerCase().replace(/[^a-z0-9]/g, "") ===
      q.answer.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (correct) {
      setMsg("🎉 Correct! " + q.answer);
      setScore(s => s + 1);
      setRevealed(true);
      triggerNextQuestion();
    } else {
      setMsg("❌ Oops! This was: " + q.answer);
      setRevealed(true);
      triggerNextQuestion();
    }
  }

  function handleRestart() {
    // Reset everything (effect will trigger by section unchanged)
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setUserGuess("");
    setMsg("");
    setRevealed(false);
    setShowNext(false);
    setLoading(true);
    setSessionCompleted(false);
    // useEffect will fetch new set
  }

  // Main render
  const q = questions[currentIndex];

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
        onClick={() => navigate(-1)}
        disabled={loading}
      >
        ← Back
      </button>
      <h2 style={{ color: "#d505ff" }}>4-Image Connection Game</h2>
      {/* Show score and progress */}
      <div
        style={{
          margin: "10px 0 26px 0",
          color: "#101",
          fontSize: 18,
          textAlign: "center",
          fontWeight: 500,
        }}
      >
        Score: {score} &nbsp; | &nbsp; Question:{" "}
        {questions.length ? Math.min(currentIndex + 1, questions.length) : 1} / {questions.length || MAX_QUESTIONS}
      </div>
      {!questions.length || loading ? (
        <div>{error ? error : "Loading questions from TMDB..."}</div>
      ) : sessionCompleted ? (
        <div style={{
          background: "#fff",
          color: "#0d0d0d",
          borderRadius: 14,
          textAlign: "center",
          padding: "30px 16px"
        }}>
          <div style={{
            fontWeight: 700,
            fontSize: 20,
            color: "#d505ff",
            marginBottom: 12
          }}>
            Game Complete!
          </div>
          <div style={{
            fontWeight: 600,
            fontSize: 16,
            marginBottom: 6
          }}>
            Final Score: {score} / {questions.length}
          </div>
          <button
            className="btn"
            style={{
              background: "#f3e7fa",
              color: "#d505ff",
              fontWeight: 600,
              border: "1px solid #d505ff69",
              marginTop: 15
            }}
            onClick={handleRestart}
          >
            Play Again
          </button>
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            background: "#fff",
            padding: "18px 12px",
            borderRadius: 14,
            color: "#0d0d0d",
            minHeight: 270,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 17,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 10
            }}
          >
            {(q.images || []).map((img, idx) => (
              <div key={idx}
                style={{
                  minWidth: 76,
                  minHeight: 84,
                  borderRadius: 9,
                  overflow: "hidden",
                  padding: 0,
                  background: "#eee",
                  boxShadow: "0 2px 14px #d505ff1c"
                }}>
                <img
                  src={img.url}
                  alt={img.name || img.type}
                  style={{
                    width: 76,
                    height: 98,
                    objectFit: "cover"
                  }}
                />
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
            <input
              type="text"
              value={userGuess}
              placeholder="Movie name"
              style={inputStyle}
              onChange={e => setUserGuess(e.target.value)}
              disabled={revealed || showNext}
              autoFocus
            />
            <button
              className="btn"
              style={{
                background: "#d505ff",
                color: "#fff",
                opacity: revealed || showNext ? 0.7 : 1
              }}
              type="submit"
              disabled={revealed || showNext}
            >Submit</button>
          </form>
          <div style={{ marginTop: 13, minHeight: 32 }}>
            {msg}
          </div>
          {showNext && (
            <div style={{ color: "#999", marginTop: 6 }}>Next coming…</div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  border: "1px solid #d505ff99",
  borderRadius: 6,
  fontSize: 17,
  padding: "12px 14px",
  width: 210,
  outline: "none",
  textAlign: "center",
};
