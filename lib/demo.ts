/** Seeded customers, shared between the in-memory seed and the /demo page quick picks. */
export const DEMO_CUSTOMERS = {
  withPro: "0x617F2E2fD72FD9D5503197092aC168c91465E7f2",
  withTeam: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
  noAccess: "0x2932b7A2355D6fEcc4b5c0B6BD44cC31df247a2e",
} as const;

/**
 * Demo organisation used when the app runs on the in-memory ledger. Names end in
 * `.demo`, which is not an ENS TLD, so they can never be confused with real names;
 * they resolve from a local registry and the UI labels them as demo identities.
 * Private keys are derived server-side in `lib/demo-keys.ts`.
 */
export const DEMO_SUFFIX = ".demo";
export const DEMO_ORG_NAME = "acme.demo";

export const DEMO_IDENTITIES = {
  owner: { name: "acme.demo", address: "0x6c3AD8C387f83ccA3F2cBB578834e4e8694BbC25" },
  alice: { name: "alice.acme.demo", address: "0x5BFc0d322353c6a8b630660AEC500A82E3695074" },
  bob: { name: "bob.acme.demo", address: "0x506f882b7421d8148fE994B3495c030800f03a2b" },
  carol: { name: "carol.acme.demo", address: "0x668E43Ca0854509B629d2925EE80990553213523" },
  agent: { name: "billing-bot.acme.demo", address: "0x3D66139ec2dDce3BBD4005110fFE33ee54245246" },
} as const;

export type DemoRole = keyof typeof DEMO_IDENTITIES;

export const isDemoName = (name: string) => name.toLowerCase().endsWith(DEMO_SUFFIX);
