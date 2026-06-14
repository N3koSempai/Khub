import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { generateMagicAmount, generateLicenseKey, validateLicenseKey } from "../lib/license";
import { checkBlockchainPayment } from "../lib/blockchain";

const USDT_ADDRESS = "0xC849612e4f29b81e5e6A40C9c6D543e0C41C863C";

type Mode = "pay" | "restore";
type PayStatus = "idle" | "waiting" | "checking" | "success" | "error";

interface Props {
  initialHw: string;
  mode: Mode;
}

export default function PayPage({ initialHw, mode }: Props) {
  const [hw, setHw] = useState(initialHw);
  const [magicAmount, setMagicAmount] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [status, setStatus] = useState<PayStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [restoreKey, setRestoreKey] = useState("");
  const [restoreResult, setRestoreResult] = useState<"" | "ok" | "invalid" | "expired" | "hw_mismatch">("");

  useEffect(() => {
    if (initialHw) {
      initPayment(initialHw);
    }
  }, [initialHw]);

  async function initPayment(hardwareHash: string) {
    if (!hardwareHash.trim()) return;
    const amount = await generateMagicAmount(hardwareHash);
    setMagicAmount(amount);
    const uri = `ethereum:${USDT_ADDRESS}?value=${amount}&token=USDT`;
    const dataUrl = await QRCode.toDataURL(uri, { width: 200, margin: 1 });
    setQrDataUrl(dataUrl);
    setStatus("waiting");
  }

  async function handleInit() {
    if (!hw.trim()) return;
    await initPayment(hw.trim());
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
        setStatusMsg("Payment not found. Make sure you sent the exact amount and wait a few minutes for confirmation.");
      }
    } catch (e) {
      setStatus("error");
      setStatusMsg("Failed to connect to the blockchain. Please try again.");
    }
  }

  function handleRestore() {
    if (!restoreKey.trim() || !hw.trim()) return;
    try {
      const result = validateLicenseKey(restoreKey.trim(), hw.trim());
      if (!result.valid) {
        setRestoreResult("invalid");
      } else if (result.expired) {
        setRestoreResult("expired");
      } else {
        setRestoreResult("ok");
      }
    } catch {
      setRestoreResult("invalid");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  if (mode === "restore") {
    return (
      <div className="pay-section">
        <p className="instruction">
          Paste your hardware hash and license key to verify your existing license.
        </p>

        <label className="field-label">Your Hardware Hash</label>
        <input
          className="text-input"
          placeholder="Paste hardware hash from the app"
          value={hw}
          onChange={(e) => { setHw(e.target.value); setRestoreResult(""); }}
        />

        <label className="field-label">Your License Key</label>
        <textarea
          className="text-input textarea"
          placeholder="Paste your license key here"
          value={restoreKey}
          onChange={(e) => { setRestoreKey(e.target.value); setRestoreResult(""); }}
          rows={4}
        />

        <button className="btn-primary" onClick={handleRestore} disabled={!hw.trim() || !restoreKey.trim()}>
          Validate License
        </button>

        {restoreResult === "ok" && (
          <div className="status-box success">
            ✓ License is valid. You can use this key in the app under "Restore License".
          </div>
        )}
        {restoreResult === "expired" && (
          <div className="status-box error">
            ✗ This license has expired. Please purchase a new one.
          </div>
        )}
        {restoreResult === "invalid" && (
          <div className="status-box error">
            ✗ Invalid key or generated on a different machine.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pay-section">
      {status === "idle" && (
        <>
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
          <button className="btn-primary" onClick={handleInit} disabled={!hw.trim()}>
            Generate Payment
          </button>
        </>
      )}

      {(status === "waiting" || status === "checking" || status === "error") && (
        <>
          <p className="instruction">
            Send exactly <strong>{magicAmount} USDT</strong> (ERC-20) to the address below.
            This amount is unique to your machine.
          </p>

          <div className="qr-wrapper">
            {qrDataUrl && <img src={qrDataUrl} alt="Payment QR" className="qr-img" />}
          </div>

          <div className="address-box">
            <span className="address-text">{USDT_ADDRESS}</span>
            <button className="btn-copy" onClick={() => copyToClipboard(USDT_ADDRESS)}>Copy</button>
          </div>

          <div className="amount-box">
            <span>Amount: <strong>{magicAmount} USDT</strong></span>
            <button className="btn-copy" onClick={() => copyToClipboard(magicAmount)}>Copy</button>
          </div>

          {status === "error" && (
            <div className="status-box error">{statusMsg}</div>
          )}

          {status === "checking" && (
            <div className="status-box info">{statusMsg}</div>
          )}

          <button
            className="btn-primary"
            onClick={handleVerify}
            disabled={status === "checking"}
          >
            {status === "checking" ? "Verifying..." : "I've sent the payment — Verify"}
          </button>

          <button className="btn-secondary" onClick={() => { setStatus("idle"); setMagicAmount(""); setQrDataUrl(""); }}>
            ← Change hardware hash
          </button>
        </>
      )}

      {status === "success" && (
        <div className="success-section">
          <div className="success-icon">✓</div>
          <h2>Payment Verified!</h2>
          <p>Copy your license key and paste it in the app under <strong>Restore License</strong>.</p>

          <div className="license-box">
            <textarea className="license-key" readOnly value={licenseKey} rows={4} />
            <button className="btn-primary" onClick={() => copyToClipboard(licenseKey)}>
              Copy License Key
            </button>
          </div>

          <p className="note">Save this key somewhere safe. Valid for 6 months on this machine.</p>
        </div>
      )}
    </div>
  );
}
