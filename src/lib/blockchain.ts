// Endpoints públicos gratuitos verificados manualmente el 2026-08-15.
// 1rpc.io es el único que sirve eth_getLogs sin API key, pero limitado a
// 50 bloques por consulta ("eth_getLogs is limited to 0 - 50 blocks range").
// llamarpc.com no impone ese límite de 50 en pruebas previas, así que se
// intenta primero con el rango completo por chunk antes de caer a 1rpc.io.
// publicnode/ankr/cloudflare/merkle exigen API key para eth_getLogs y se
// descartaron tras pruebas en vivo — no agregarlos sin volver a verificar.
const RPC_ENDPOINTS = ["https://eth.llamarpc.com", "https://1rpc.io/eth"];

const CHUNK_SIZE = 50;
const RECIPIENT = "0xC849612e4f29b81e5e6A40C9c6D543e0C41C863C".toLowerCase();
const USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const BLOCKS_TO_SCAN = 2000; // ~7-8 min de margen a ~15s/bloque

async function rpcCall(endpoint: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function tryEndpoints<T>(method: string, params: unknown[]): Promise<T> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      return (await rpcCall(endpoint, method, params)) as T;
    } catch {
      continue;
    }
  }
  throw new Error("All RPC endpoints failed");
}

async function getLogsChunk(
  fromBlock: number,
  toBlock: number,
  recipientPadded: string
): Promise<Array<{ data: string; transactionHash: string }>> {
  return tryEndpoints("eth_getLogs", [
    {
      fromBlock: "0x" + fromBlock.toString(16),
      toBlock: "0x" + toBlock.toString(16),
      address: USDT_CONTRACT,
      topics: [TRANSFER_TOPIC, null, recipientPadded],
    },
  ]);
}

export async function checkBlockchainPayment(
  magicAmount: string,
  onProgress?: (msg: string) => void
): Promise<{ found: boolean; txHash?: string }> {
  onProgress?.("Connecting to Ethereum network...");

  const latestHex = await tryEndpoints<string>("eth_blockNumber", []);
  const latestBlock = parseInt(latestHex, 16);
  const scanFrom = latestBlock - BLOCKS_TO_SCAN;

  const recipientPadded = "0x" + RECIPIENT.slice(2).padStart(64, "0");

  const [intPart, decPart = "0"] = magicAmount.split(".");
  const targetRaw =
    BigInt(intPart) * 1_000_000n + BigInt(decPart.padEnd(6, "0").slice(0, 6));

  const totalChunks = Math.ceil(BLOCKS_TO_SCAN / CHUNK_SIZE);
  let chunkIndex = 0;

  // Escanea del bloque más reciente hacia atrás: los pagos recientes
  // (el caso común) se detectan primero, sin esperar a cubrir toda la ventana.
  for (let to = latestBlock; to > scanFrom; to -= CHUNK_SIZE) {
    const from = Math.max(to - CHUNK_SIZE + 1, scanFrom);
    chunkIndex++;
    onProgress?.(`Scanning blocks (${chunkIndex}/${totalChunks})...`);

    const logs = await getLogsChunk(from, to, recipientPadded);
    for (const log of logs) {
      const amount = BigInt(log.data);
      if (amount === targetRaw) {
        return { found: true, txHash: log.transactionHash };
      }
    }
  }

  return { found: false };
}
