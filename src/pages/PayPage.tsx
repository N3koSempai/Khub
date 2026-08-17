import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { generateMagicAmount, generateLicenseKey } from "../lib/license";
import { checkBlockchainPayment } from "../lib/blockchain";

const USDT_ADDRESS = "0xC849612e4f29b81e5e6A40C9c6D543e0C41C863C";

type PayStatus = "idle" | "waiting" | "checking" | "success" | "error";

interface Props {
  initialHw: string;
}

export default function PayPage({ initialHw }: Props) {
  const [hw, setHw] = useState(initialHw);
  const [magicAmount, setMagicAmount] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [status, setStatus] = useState<PayStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [walletUri, setWalletUri] = useState("");

  useEffect(() => {
    if (initialHw) initPayment(initialHw);
  }, [initialHw]);

  async function initPayment(hardwareHash: string) {
    if (!hardwareHash.trim()) return;
    const amount = await generateMagicAmount(hardwareHash);
    setMagicAmount(amount);
    const uri = `ethereum:${USDT_ADDRESS}?value=${amount}&token=USDT`;
    setWalletUri(uri);
    const dataUrl = await QRCode.toDataURL(uri, { width: 200, margin: 1 });
    setQrDataUrl(dataUrl);
    setStatus("waiting");
  }

  async function handleVerify() {
    if (!magicAmount) return;
    setStatus("checking");
    setStatusMsg("Connecting to Ethereum network...");
    try {
      const result = await checkBlockchainPayment(magicAmount, setStatusMsg);
      if (result.found) {
        const key = await generateLicenseKey(hw.trim());
        setLicenseKey(key);
        setStatus("success");
      } else {
        setStatus("error");
        setStatusMsg("Payment not found yet. If you just sent it, wait 1-2 minutes for the transaction to confirm, then tap Verify again.");
      }
    } catch {
      setStatus("error");
      setStatusMsg("Failed to connect to the blockchain. Please try again.");
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  if (status === "idle") {
    return (
      <div className="pay-section">
        <p className="instruction">
          Open the app, copy your Hardware Hash, and paste it below to start.
        </p>
        <label className="field-label">Hardware Hash</label>
        <input
          className="text-input"
          placeholder="Paste your hardware hash from the app"
          value={hw}
          onChange={(e) => setHw(e.target.value)}
        />
        <button className="btn-primary" onClick={() => initPayment(hw)} disabled={!hw.trim()}>
          Generate Payment
        </button>

        <div className="onramp-box">
          <p className="note">
            Payment is in USDT (ERC-20) on Ethereum.{" "}
            <a
              className="inline-link"
              href="https://www.coingecko.com/learn/what-is-tether-usdt-crypto"
              target="_blank"
              rel="noopener noreferrer"
            >
              What is USDT?
            </a>
          </p>
          <p className="note">Don't have USDT yet?</p>
          <a
            className="btn-secondary btn-onramp"
            href="https://portfolio.metamask.io/buy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Buy USDT with a card ↗
          </a>
          <p className="note onramp-hint">Opens MetaMask's buy page — select USDT on Ethereum, then come back here to pay.</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="pay-section success-section">
        <div className="success-icon">✓</div>
        <h2>Payment Verified!</h2>
        <p>Copy your license key and paste it in the app under <strong>Restore License</strong>.</p>
        <div className="license-box">
          <textarea className="license-key" readOnly value={licenseKey} rows={4} />
          <button className="btn-primary" onClick={() => copy(licenseKey)}>
            Copy License Key
          </button>
        </div>
        <p className="note">Save this key somewhere safe. Valid for 6 months on this machine.</p>
      </div>
    );
  }

  return (
    <div className="pay-section">
      <p className="instruction">
        Send exactly <strong>{magicAmount} USDT</strong> (ERC-20) to the address below.
        This amount is unique to your machine.
      </p>

      <div className="qr-wrapper">
        {qrDataUrl && <img src={qrDataUrl} alt="Payment QR" className="qr-img" />}
      </div>

      <a className="btn-primary btn-wallet" href={walletUri}>
        Open in Wallet App
      </a>
      <p className="note wallet-hint">On mobile, this opens MetaMask, Trust Wallet, or your default wallet with the amount pre-filled.</p>

      <div className="address-box">
        <span className="address-text">{USDT_ADDRESS}</span>
        <button className="btn-copy" onClick={() => copy(USDT_ADDRESS)}>Copy</button>
      </div>

      <div className="amount-box">
        <span>Amount: <strong>{magicAmount} USDT</strong></span>
        <button className="btn-copy" onClick={() => copy(magicAmount)}>Copy</button>
      </div>

      {status === "error" && <div className="status-box error">{statusMsg}</div>}
      {status === "checking" && <div className="status-box info">{statusMsg}</div>}

      <button className="btn-primary" onClick={handleVerify} disabled={status === "checking"}>
        {status === "checking" ? "Verifying..." : "I've sent the payment — Verify"}
      </button>

      <button className="btn-secondary" onClick={() => { setStatus("idle"); setMagicAmount(""); setQrDataUrl(""); }}>
        ← Change hardware hash
      </button>
    </div>
  );
}
