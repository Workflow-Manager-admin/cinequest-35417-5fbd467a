import React, { useEffect, useState } from "react";
import { getPopularMovies, getPersonDetails, getPersonMovieCredits } from "./tmdbApi";

// Demo directors: for each section, a notable director (name, TMDB id, sample correct movies)
const directors = {
  hollywood: [
    {
      name: "Christopher Nolan",
      personId: 525,
      image: "https://image.tmdb.org/t/p/w185/6C4QPGIExnqkzl6LVIqyn5n4yhz.jpg",
      correctMovies: [
        "Inception", "Interstellar", "Dunkirk", "Memento"
      ]
    }
  ],
  kollywood: [
    {
      name: "Mani Ratnam",
      personId: 127934,
      image: "https://image.tmdb.org/t/p/w185/c8TIWrGV6A0XRw2OCn9SWzJom82.jpg",
      correctMovies: [
        "Roja", "Alaipayuthey", "Guru", "Kannathil Muthamittal"
      ]
    }
  ]
};

const distractorPopularMovies = {
  hollywood: ["Pulp Fiction", "Titanic", "The Godfather", "Forrest Gump"],
  kollywood: ["Baahubali", "Sivaji", "Kabali", "Enthiran"]
};

// PUBLIC_INTERFACE
export default function GameDirectorsMovies({ section }) {
  const [director, setDirector] = useState(null);
  const [movies, setMovies] = useState([]); // array of { title, poster_path, isCorrect }
  const [choice, setChoice] = useState([]);
  const [resultMsg, setResultMsg] = useState("");

  useEffect(() => {
    // Pick demo director for section
    const pick = directors[section][0];
    setDirector(pick);

    // Demo: Build movie options list (correct + random popular distractors)
    const correctSet = new Set(pick.correctMovies);
    const distractors = distractorPopularMovies[section].filter(
      t => !correctSet.has(t)
    );

    // For UI: combine, shuffle
    async function buildOptions() {
      let allOpts = [];
      // Get posters for all options, fill as { title, poster_path, isCorrect }
      for (const t of pick.correctMovies.concat(distractors)) {
        try {
          const r = await getPopularMovies({
            region: section === "kollywood" ? "IN" : "US",
          });
          const found = (r.results || []).find(
            m =>
              m.title.toLowerCase().replace(/[^a-z0-9]/g, "") ===
              t.toLowerCase().replace(/[^a-z0-9]/g, "")
          );
          allOpts.push({
            title: t,
            poster_path: found && found.poster_path,
            isCorrect: pick.correctMovies.includes(t)
          });
        } catch {
          allOpts.push({
            title: t,
            poster_path: "",
            isCorrect: pick.correctMovies.includes(t)
          });
        }
      }
      allOpts = allOpts.sort(() => 0.5 - Math.random());
      setMovies(allOpts);
    }
    buildOptions();
  }, [section]);

  function toggle(title) {
    setChoice(ch =>
      ch.includes(title)
        ? ch.filter(t => t !== title)
        : [...ch, title]
    );
  }

  function checkAnswer() {
    if (!director) return;
    const expected = new Set(director.correctMovies);
    const chosen = new Set(choice);
    const correct = choice.every(t => expected.has(t)) && choice.length === expected.size;
    setResultMsg(
      correct
        ? "🎉 Correct! These are all directed by " + director.name
        : "❌ Some choices were wrong or missing. Correct: " +
            director.correctMovies.join(", ")
    );
  }

  return (
    <div className="container" style={{ marginTop: 100 }}>
      <h2 style={{ color: "#d505ff" }}>Director's Movies Game</h2>
      {!director ? (
        <div>Loading…</div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <img
            src={director.image}
            alt={director.name}
            style={{
              width: 110, height: 124,
              borderRadius: 14,
              margin: "0 auto 15px"
            }}
          />
          <div style={{
            fontWeight: 600, color: "#4a0153",
            marginBottom: 10, fontSize: 18
          }}>
            Select all movies directed by {director.name}
          </div>
          <div
            style={{
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 18
            }}>
            {movies.map(m => (
              <div
                key={m.title}
                tabIndex={0}
                onClick={() => toggle(m.title)}
                onKeyDown={e => { if (e.key === "Enter") toggle(m.title); }}
                style={{
                  background: choice.includes(m.title)
                    ? "#d505ff"
                    : "#f9f9fb",
                  color: choice.includes(m.title)
                    ? "#fff"
                    : "#101",
                  borderRadius: 11,
                  padding: 7,
                  width: 96,
                  boxShadow: "0 2px 10px #d505ff17",
                  border: choice.includes(m.title)
                    ? "1.5px solid #8f00ba"
                    : "1.5px solid #eee",
                  cursor: "pointer",
                  marginBottom: 5
                }}>
                {m.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${m.poster_path}`}
                    style={{
                      width: 82,
                      height: 115,
                      objectFit: "cover",
                      borderRadius: 7,
                      marginBottom: 4
                    }}
                    alt={m.title}
                  />
                ) : (
                  <div style={{
                    width: 82, height: 115, background: "#ccc",
                    borderRadius: 7, marginBottom: 4, display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 20
                  }}>🎬</div>
                )}
                <div style={{
                  fontWeight: 600,
                  fontSize: 13.2
                }}>{m.title}</div>
              </div>
            ))}
          </div>
          <button className="btn"
            style={{
              background: "#d505ff",
              color: "#fff"
            }}
            onClick={checkAnswer}
          >Check Answer</button>
          <div style={{ marginTop: 18 }}>{resultMsg}</div>
        </div>
      )}
    </div>
  );
}
