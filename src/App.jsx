import React from "react";
import "./App.css";
import Header from "./components/Header";
import TicketAnalyzer from "./components/TicketAnalyzer";

function App() {
  return (
    <div className="app">
      <div className="background-circle circle1"></div>
      <div className="background-circle circle2"></div>

      <div className="dashboard">
        <Header />

        <main style={{ padding: "24px" }}>
          <TicketAnalyzer />
        </main>
      </div>
    </div>
  );
}

export default App;