const RPC_ENDPOINTS = [
  "https://1rpc.io/eth",
  "https://eth.llamarpc.com",
  "https://ethereum-rpc.publicnode.com",
];

const RECIPIENT = "0xC849612e4f29b81e5e6A40C9c6D543e0C41C863C".toLowerCase();
const USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const BLOCKS_TO_SCAN = 10000;

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

export async function checkBlockchainPayment(
  magicAmount: string,
  onProgress?: (msg: string) => void
): Promise<{ found: boolean; txHash?: string }> {
  onProgress?.("Connecting to Ethereum network...");

  const latestHex = await tryEndpoints<string>("eth_blockNumber", []);
  const latestBlock = parseInt(latestHex, 16);
  const fromBlock = latestBlock - BLOCKS_TO_SCAN;

  onProgress?.(`Scanning last ${BLOCKS_TO_SCAN} blocks...`);

  const recipientPadded = "0x" + RECIPIENT.slice(2).padStart(64, "0");

  const logs = await tryEndpoints<Array<{ data: string; transactionHash: string }>>(
    "eth_getLogs",
    [
      {
        fromBlock: "0x" + fromBlock.toString(16),
        toBlock: "latest",
        address: USDT_CONTRACT,
        topics: [TRANSFER_TOPIC, null, recipientPadded],
      },
    ]
  );

  onProgress?.(`Found ${logs.length} incoming transfers, checking amounts...`);

  const [intPart, decPart = "0"] = magicAmount.split(".");
  const targetRaw =
    BigInt(intPart) * 1_000_000n + BigInt(decPart.padEnd(6, "0").slice(0, 6));

  for (const log of logs) {
    const amount = BigInt(log.data);
    if (amount === targetRaw) {
      return { found: true, txHash: log.transactionHash };
    }
  }

  return { found: false };
}
