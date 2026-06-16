import PayPage from "./pages/PayPage";
import "./App.css";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const hwFromUrl = params.get("hw") ?? "";

  return (
    <div className="app">
      <header className="app-header">
        <h1>Klia Pro License</h1>
        <p className="subtitle">$12 USDT · 6 months</p>
      </header>

      <main className="content">
        <PayPage initialHw={hwFromUrl} />
      </main>

      <footer>
        <p>All sales are final · License tied to your machine · Powered by USDT on Ethereum</p>
      </footer>
    </div>
  );
}
