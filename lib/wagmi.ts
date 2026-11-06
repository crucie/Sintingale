import { http, createConfig, injected } from "wagmi";
import { publicConfig } from "./config";
import { whitechain } from "./whitechain";

export const wagmiConfig = createConfig({
  chains: [whitechain],
  connectors: [injected({ shimDisconnect: true })],
  transports: { [whitechain.id]: http(publicConfig.whitechain.rpcUrl) },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
