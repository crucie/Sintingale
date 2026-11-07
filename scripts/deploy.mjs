// Deploys PaymentRouter and ProjectSplitter to Whitechain Sepolia, settling in the
// official test USDT, and records the addresses in deployments.json.
//
//   cd contracts && forge build && cd ..
//   node --env-file=.env scripts/deploy.mjs
//
// Env: DEPLOYER_PRIVATE_KEY (required, funded with test WBT), WHITECHAIN_RPC_URL,
// USDT_ADDRESS (defaults to the official test USDT).
import { readFileSync, writeFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  formatEther,
  getAddress,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const OFFICIAL_USDT = getAddress("0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7");
const rpc = process.env.WHITECHAIN_RPC_URL ?? "https://rpc.testnet.whitechain.io";
const explorer = "https://explorer.testnet.whitechain.io";
const key = process.env.DEPLOYER_PRIVATE_KEY;
if (!key) throw new Error("Set DEPLOYER_PRIVATE_KEY to a wallet funded with test WBT");

const chain = defineChain({
  id: 1874,
  name: "Whitechain Sepolia",
  nativeCurrency: { name: "WhiteBIT Coin", symbol: "WBT", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
});
const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
const wallet = createWalletClient({ chain, transport: http(rpc), account });
const client = createPublicClient({ chain, transport: http(rpc) });

const artifact = (name) => {
  const json = JSON.parse(readFileSync(`contracts/out/${name}.sol/${name}.json`, "utf8"));
  return { abi: json.abi, bytecode: json.bytecode.object };
};

const deployed = {};
async function deploy(name, args = []) {
  const { abi, bytecode } = artifact(name);
  const hash = await wallet.deployContract({ abi, bytecode, args });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${name} deployment reverted (tx ${hash})`);
  console.log(`${name.padEnd(16)} ${receipt.contractAddress}  (tx ${hash}, block ${receipt.blockNumber})`);
  deployed[name] = { address: receipt.contractAddress, tx: hash, block: Number(receipt.blockNumber) };
  return receipt.contractAddress;
}

const chainId = await client.getChainId();
if (chainId !== 1874) throw new Error(`RPC ${rpc} reports chain ${chainId}, expected 1874`);
const balance = await client.getBalance({ address: account.address });
console.log(`Deployer ${account.address} on chain ${chainId}, balance ${formatEther(balance)} WBT`);
if (balance === 0n) throw new Error("Deployer has no WBT. Claim some at https://faucet.testnet.whitechain.io");

const usdt = getAddress(process.env.USDT_ADDRESS || OFFICIAL_USDT);
if (usdt !== OFFICIAL_USDT) {
  console.warn(`Warning: ${usdt} is not the official test USDT ${OFFICIAL_USDT}.`);
}

const router = await deploy("PaymentRouter");
const allowList = [...new Set([usdt, OFFICIAL_USDT])];
const splitter = await deploy("ProjectSplitter", [allowList]);
const splitterArgs = encodeAbiParameters([{ type: "address[]" }], [allowList]);

const deployments = {
  network: "whitechain-sepolia",
  chainId,
  deployedAt: new Date().toISOString(),
  deployer: account.address,
  contracts: Object.fromEntries(Object.entries(deployed).map(([name, d]) => [name, d.address])),
  transactions: deployed,
  token: { address: usdt, decimals: 6 },
  splitterAllowList: allowList,
  splitterConstructorArgs: splitterArgs,
};
writeFileSync("deployments.json", `${JSON.stringify(deployments, null, 2)}\n`);

const verifier = `--rpc-url ${rpc} --verifier blockscout --verifier-url ${explorer}/api/`;
console.log("\nVerify on the Whitechain explorer (run from contracts/):");
console.log(`forge verify-contract ${router} src/PaymentRouter.sol:PaymentRouter ${verifier}`);
console.log(`forge verify-contract ${splitter} src/ProjectSplitter.sol:ProjectSplitter ${verifier} --constructor-args ${splitterArgs}`);

console.log("\nAdd to .env:");
console.log(`NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS=${router}`);
console.log(`NEXT_PUBLIC_SPLITTER_ADDRESS=${splitter}`);
console.log(`NEXT_PUBLIC_USDT_ADDRESS=${usdt}`);
console.log(`SPLITTER_ALLOWED_TOKEN=${usdt}`);
console.log(`\nExplorer: ${explorer}/address/${router}`);
