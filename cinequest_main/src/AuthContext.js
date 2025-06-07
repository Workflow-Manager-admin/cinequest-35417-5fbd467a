import React, { createContext, useState, useContext, useEffect } from "react";

// PUBLIC_INTERFACE
export const AuthContext = createContext();

/**
 * Minimal localStorage-based authentication.
 * For demo: user={username}, token=<fake>, only tracks login/logout.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    localStorage.getItem("cq_user")
      ? JSON.parse(localStorage.getItem("cq_user"))
      : null
  );

  const login = (username, password) => {
    // In demo: Any username/password accepted
    const userObj = { username, token: "demo-token" };
    setUser(userObj);
    localStorage.setItem("cq_user", JSON.stringify(userObj));
  };

  const signup = (username, password) => {
    // Same as login for demo
    login(username, password);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("cq_user");
  };

  // PUBLIC_INTERFACE
  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// PUBLIC_INTERFACE
export function useAuth() {
  return useContext(AuthContext);
}
