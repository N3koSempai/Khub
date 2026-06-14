import { useState } from "react";
import PayPage from "./pages/PayPage";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState<"pay" | "restore">("pay");
  const params = new URLSearchParams(window.location.search);
  const hwFromUrl = params.get("hw") ?? "";

  return (
    <div className="app">
      <header className="app-header">
        <h1>Klia Pro License</h1>
        <p className="subtitle">$12 USDT · 6 months</p>
      </header>

      <div className="tabs">
        <button
          className={tab === "pay" ? "tab active" : "tab"}
          onClick={() => setTab("pay")}
        >
          Buy License
        </button>
        <button
          className={tab === "restore" ? "tab active" : "tab"}
          onClick={() => setTab("restore")}
        >
          Restore License
        </button>
      </div>

      <main className="content">
        <PayPage initialHw={hwFromUrl} mode={tab} />
      </main>

      <footer>
        <p>All sales are final · License tied to your machine · Powered by USDT on Ethereum</p>
      </footer>
    </div>
  );
}
