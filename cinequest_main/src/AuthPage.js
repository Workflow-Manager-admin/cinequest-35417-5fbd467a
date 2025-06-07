import React, { useState } from "react";
import { useAuth } from "./AuthContext";

// PUBLIC_INTERFACE
export default function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = e => {
    e.preventDefault();
    setError("");
    if (!username || !pw) {
      setError("Please fill both fields.");
      return;
    }
    try {
      mode === "login" ? login(username, pw) : signup(username, pw);
    } catch (err) {
      setError(err.message || "Error on authentication.");
    }
  };

  return (
    <div style={{
      minHeight: "60vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        background: "#fff",
        color: "#0d0d0d",
        borderRadius: 12,
        padding: 32,
        boxShadow: "0 4px 32px #0001",
        minWidth: 340
      }}>
        <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 8, color: "#d505ff" }}>
          CineQuest
        </div>
        <div style={{ marginBottom: 18 }}>
          {mode === "login" ? "Log in to your account" : "Create a new account"}
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            style={inputStyle}
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            style={inputStyle}
            value={pw}
            onChange={e => setPw(e.target.value)}
          />
          {error && (
            <div style={{ color: "#d00", margin: "8px 0" }}>{error}</div>
          )}
          <button className="btn btn-large" style={{
            background: "#d505ff",
            color: "#fff",
            width: "100%",
            marginTop: 12,
            fontWeight: 600,
            borderRadius: 6
          }} type="submit"
          >
            {mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
        <div style={{
          fontSize: 14,
          marginTop: 20,
          textAlign: "center"
        }}>
          {mode === "login"
            ? <>
                No account?{" "}
                <a href="#" style={{ color: "#d505ff" }} onClick={() => setMode("signup")}>Sign up</a>
              </>
            : <>
                Have an account?{" "}
                <a href="#" style={{ color: "#d505ff" }} onClick={() => setMode("login")}>Log in</a>
              </>
          }
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  margin: "10px 0",
  borderRadius: 6,
  border: "1px solid #eee",
  fontSize: 16,
  background: "#f9f9fb",
  color: "#101",
  outline: "none"
};
