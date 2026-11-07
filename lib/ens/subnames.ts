import { publicConfig } from "../config";
import { isDemoName } from "../demo";

export const subnameOf = (label: string, parent: string) => `${label.toLowerCase()}.${parent.toLowerCase()}`;

export const isSubnameOf = (name: string, parent: string) => {
  const n = name.toLowerCase();
  const p = parent.toLowerCase();
  return n.endsWith(`.${p}`) && !n.slice(0, -(p.length + 1)).includes(".");
};

export const isValidLabel = (label: string) => /^[a-z0-9][a-z0-9-]{0,39}$/.test(label) && !label.endsWith("-");

export interface SubnameInstructions {
  name: string;
  parent: string;
  address: string;
  ensAppUrl: string | null;
  demo: boolean;
  steps: string[];
}

/**
 * Sintingale does not issue subnames itself: on ENSv2 the org owner creates
 * them in the ENS app. These are the exact steps; approval then re-resolves the
 * name and only succeeds once it points at the member's wallet.
 */
export function subnameInstructions(label: string, parent: string, address: string): SubnameInstructions {
  const name = subnameOf(label, parent);
  if (isDemoName(parent)) {
    return { name, parent, address, ensAppUrl: null, demo: true, steps: ["Demo org: the subname is issued in the local demo registry."] };
  }
  return {
    name,
    parent,
    address,
    ensAppUrl: `${publicConfig.sepolia.ensAppUrl}/${parent}?tab=subnames`,
    demo: false,
    steps: [
      `Open ${parent} in the ENS app on Sepolia and choose "New subname".`,
      `Create the label "${label}" and keep it unlocked (do not burn any fuses).`,
      `Set its ETH address record to ${address}.`,
      "Come back and press Check & approve.",
    ],
  };
}
