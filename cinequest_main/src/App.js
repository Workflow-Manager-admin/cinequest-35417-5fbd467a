import React from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Navbar from "./Navbar";
import AuthPage from "./AuthPage";
import SectionPage from "./SectionPage";
import GameBlurredPoster from "./GameBlurredPoster";
import GameMovieClipQuiz from "./GameMovieClipQuiz";
import GameFourImageConnection from "./GameFourImageConnection";
import GameFamousDialogueMatch from "./GameFamousDialogueMatch";

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container">
      <div className="hero" style={{paddingTop: 110, color: "#0d0d0d"}}>
        <div className="subtitle">The Movie Game Platform</div>
        <h1 className="title" style={{color: "#d505ff"}}>CineQuest</h1>
        <div className="description" style={{color: "#222"}}>
          Hollywood & Kollywood movie quiz games powered by TMDB.<br />
          <small>
            {user
              ? "Welcome, " + user.username + "!"
              : "Sign up/log in to play and track your progress."}
          </small>
        </div>
        <button
          className="btn btn-large"
          style={{
            background: "#d505ff",
            color: "#fff",
            fontWeight: 600
          }}
          onClick={() =>
            user
              ? navigate("/section")
              : navigate("/auth")
          }
        >
          {user ? "Choose Section" : "Get Started"}
        </button>

        <div style={{ marginTop: 32 }}>
          <div className="subtitle" style={{ fontSize: "1rem", color: "#d505ff" }}>
            How CineQuest works
          </div>
          <div style={{
            color: "#333", maxWidth: 480, margin: "10px auto 0",
            fontSize: 16, lineHeight: 1.7
          }}>
            Login and pick either the Hollywood or Kollywood section. Each offers multiple games: guess movies from blurred posters, connect images, match dialogues, play movie clip quizzes, and select movies for directors!
            <br />
            No adult movies included. Movie data powered by TMDB API.
          </div>
        </div>
      </div>
    </div>
  );
}

// Only if authenticated
function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/auth" />;
  }
  return children;
}
// Section Choice Page
function SectionChoicePage() {
  const navigate = useNavigate();
  return (
    <div className="container" style={{marginTop: 100, textAlign:"center"}}>
      <h2 style={{color: "#d505ff"}}>Choose Your Section</h2>
      <div style={{display:"flex", gap:50, justifyContent:"center", marginTop:28}}>
        <button className="btn btn-large"
          style={{
            background: "#d505ff",
            color: "#fff",
            fontWeight: 600,
            borderRadius: 8,
          }}
          onClick={() => navigate("/hollywood")}
        >Hollywood</button>
        <button className="btn btn-large"
          style={{
            background: "#d505ff",
            color: "#fff",
            fontWeight: 600,
            borderRadius: 8,
          }}
          onClick={() => navigate("/kollywood")}
        >Kollywood</button>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app" style={{
          minHeight: "100vh",
          background: "#f9f9fb",
        }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/section"
                element={
                  <RequireAuth>
                    <SectionChoicePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/hollywood"
                element={
                  <RequireAuth>
                    <SectionPage section="hollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/kollywood"
                element={
                  <RequireAuth>
                    <SectionPage section="kollywood" />
                  </RequireAuth>
                }
              />

              {/* Hollywood Games */}
              <Route
                path="/hollywood/blurred-poster"
                element={
                  <RequireAuth>
                    <GameBlurredPoster section="hollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/hollywood/movie-clip-quiz"
                element={
                  <RequireAuth>
                    <GameMovieClipQuiz section="hollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/hollywood/four-image-connection"
                element={
                  <RequireAuth>
                    <GameFourImageConnection section="hollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/hollywood/famous-dialogue-match"
                element={
                  <RequireAuth>
                    <GameFamousDialogueMatch section="hollywood" />
                  </RequireAuth>
                }
              />
              {/* Kollywood Games */}
              <Route
                path="/kollywood/blurred-poster"
                element={
                  <RequireAuth>
                    <GameBlurredPoster section="kollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/kollywood/movie-clip-quiz"
                element={
                  <RequireAuth>
                    <GameMovieClipQuiz section="kollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/kollywood/four-image-connection"
                element={
                  <RequireAuth>
                    <GameFourImageConnection section="kollywood" />
                  </RequireAuth>
                }
              />
              <Route
                path="/kollywood/famous-dialogue-match"
                element={
                  <RequireAuth>
                    <GameFamousDialogueMatch section="kollywood" />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;