import React, { useEffect, useState } from "react";
import { getPopularMovies } from "./tmdbApi";

const conceptClues = [
  // For demonstration, simple hardcoded clues
  {
    title: "Titanic",
    clues: ["Iceberg", "Ship", "Rose", "Jack"]
  },
  {
    title: "Kabali",
    clues: ["Gangster", "Malaysia", "Rajinikanth", "Revenge"]
  },
  {
    title: "Forrest Gump",
    clues: ["Chocolates", "Bench", "Running", "Life"]
  },
  {
    title: "Baahubali",
    clues: ["Mahishmati", "Shivudu", "Waterfall", "Sword"]
  }
];

function getSectionMovies(section, cb) {
  getPopularMovies({
    region: section === "kollywood" ? "IN" : "US",
    language: section === "hollywood" ? "en" : "ta",
    include_adult: false,
  }).then(data => {
    const titles = (data.results || []).map(m => m.title);
    cb(titles);
  });
}

// PUBLIC_INTERFACE
export default function GameFourImageConnection({ section }) {
  const [current, setCurrent] = useState(null);
  const [userGuess, setUserGuess] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // Pick random from concept clues of section (use .title)
    const clues = conceptClues.filter(c =>
      section === "hollywood"
        ? ["Titanic", "Forrest Gump"].includes(c.title)
        : ["Kabali", "Baahubali"].includes(c.title)
    );
    setCurrent(clues[Math.floor(Math.random() * clues.length)]);
  }, [section]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!current) return;
    if (
      userGuess.trim().toLowerCase().replace(/[^a-z0-9]/g, "") ===
      current.title.toLowerCase().replace(/[^a-z0-9]/g, "")
    ) {
      setMsg("🎉 Correct! " + current.title);
    } else {
      setMsg("❌ Oops! This was: " + current.title);
    }
  }

  return (
    <div className="container" style={{ marginTop: 100 }}>
      <h2 style={{ color: "#d505ff" }}>4-Image Connection Game</h2>
      {!current ? (
        <div>Loading Question…</div>
      ) : (
        <div style={{
          textAlign: "center",
          background: "#fff",
          padding: "18px 12px",
          borderRadius: 14,
          color: "#0d0d0d"
        }}>
          <div style={{
            display: "flex",
            gap: 17,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 10
          }}>
            {current.clues.map((item, idx) => (
              <div key={idx}
                style={{
                  background: "#f6e6ff",
                  color: "#b002b5",
                  borderRadius: 8,
                  padding: "18px 10px",
                  minWidth: 50,
                  fontWeight: 700,
                  fontSize: 16,
                  boxShadow: "0 2px 12px #d505ff1c"
                }}>
                {item}
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
            />
            <button className="btn"
              style={{ background: "#d505ff", color: "#fff" }}
              type="submit"
            >Submit</button>
          </form>
          <div style={{ marginTop: 15 }}>{msg}</div>
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
  textAlign: "center"
};
