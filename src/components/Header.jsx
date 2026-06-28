import React, { useEffect, useState } from "react";

function Header() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch("https://jsonplaceholder.typicode.com/users/1")
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (mounted) setUser(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message || "Failed to load user");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="header topbar">
      <div className="header-left">
        <h1>OmniCorp Global</h1>
        <p>AI-Powered IT Support Ticket Classifier</p>
      </div>

      <div className="header-right userCard">
        <div className={`status ${user ? "online" : "offline"}`}></div>

        <div>
          {loading && (
            <>
              <h3>Loading User...</h3>
              <span>Fetching user details...</span>
            </>
          )}

          {error && (
            <>
              <h3>Error</h3>
              <span>{error}</span>
            </>
          )}

          {user && (
            <>
              <h3>{user.name}</h3>
              <span>{user.email}</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;