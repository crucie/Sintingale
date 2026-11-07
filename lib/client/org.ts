"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useConnection, useSignMessage } from "wagmi";
import { createSiweMessage } from "viem/siwe";
import { acceptMessage, authMessage } from "../arkiv/messages";
import { projectIdToBytes32 } from "../chain/splitter";
import { publicConfig } from "../config";
import type { DemoRole } from "../demo";
import type {
  AttrsByType,
  AuthorizedType,
  GrantAttrs,
  InviteAcceptAttrs,
  InviteAttrs,
  MemberAttrs,
  OrgAttrs,
  ProjectAttrs,
  RevocationAttrs,
} from "../schema";
import type {
  ClaimableDTO,
  GrantDTO,
  InviteDTO,
  MemberDTO,
  OrgDTO,
  PayoutDTO,
  ProjectDTO,
  SessionDTO,
  SubnameInstructionsDTO,
} from "../types";
import { api, useMerchant } from "./hooks";

const nowSec = () => Math.floor(Date.now() / 1000);
export const randomId = (prefix: string) =>
  `${prefix}-${Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("")}`;

/* ------------------------------------------------------------- features -- */

/** Teams & ENS are opt-in per merchant (Settings). `undefined` while loading. */
export function useTeamsEnabled(): boolean | undefined {
  const merchant = useMerchant();
  if (merchant.isLoading) return undefined;
  return merchant.data?.teamsEnabled === true;
}

/* -------------------------------------------------------------- session -- */

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => api<{ session: SessionDTO | null; demoAvailable: boolean }>("/api/auth/session"),
    staleTime: 10_000,
  });
}

/** Sign-In with Ethereum, or a seeded demo identity on the local ledger. */
export function useSignIn() {
  const qc = useQueryClient();
  const { address, chainId } = useConnection();
  const { mutateAsync: signMessage } = useSignMessage();

  const withWallet = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Connect a wallet first.");
      const { nonce } = await api<{ nonce: string }>("/api/auth/nonce");
      const now = new Date();
      const message = createSiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Sintingale. This does not send a transaction or cost gas.",
        uri: window.location.origin,
        version: "1",
        chainId: chainId ?? publicConfig.whitechain.chainId,
        nonce,
        issuedAt: now,
        expirationTime: new Date(now.getTime() + 5 * 60_000),
      });
      const signature = await signMessage({ message });
      return api("/api/auth/verify", { method: "POST", body: JSON.stringify({ message, signature }) });
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const asDemo = useMutation({
    mutationFn: (role: DemoRole) => api("/api/auth/demo", { method: "POST", body: JSON.stringify({ role }) }),
    onSuccess: () => qc.invalidateQueries(),
  });

  const signOut = useMutation({
    mutationFn: () => api("/api/auth/session", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  });

  return { withWallet, asDemo, signOut };
}

/**
 * Signs authorisation messages as the signed-in identity: the wallet for real
 * sessions, or the server-held demo key for `.demo` sessions.
 */
export function useSigner() {
  const { data } = useSession();
  const { address } = useConnection();
  const { mutateAsync: signMessage } = useSignMessage();
  const session = data?.session ?? null;

  return useCallback(
    async (message: string): Promise<string> => {
      if (!session) throw new Error("Sign in first.");
      if (session.demo) {
        const { signature } = await api<{ signature: string }>("/api/demo/sign", {
          method: "POST",
          body: JSON.stringify({ message }),
        });
        return signature;
      }
      if (!address || address.toLowerCase() !== session.address) {
        throw new Error("Switch your wallet to the signed-in account to sign.");
      }
      return signMessage({ message });
    },
    [address, session, signMessage],
  );
}

export async function signAttrs<T extends AuthorizedType>(
  sign: (m: string) => Promise<string>,
  type: T,
  attrs: Omit<AttrsByType[T], "authSig">,
): Promise<AttrsByType[T]> {
  const authSig = await sign(authMessage(type, attrs as AttrsByType[T]));
  return { ...attrs, authSig } as AttrsByType[T];
}

/* ----------------------------------------------------------------- reads -- */

export function useOrgData(orgId: string | undefined) {
  return useQuery({
    queryKey: ["org", orgId],
    queryFn: async () => (await api<{ org: OrgDTO }>(`/api/orgs?orgId=${orgId}`)).org,
    enabled: Boolean(orgId),
  });
}

export function useProjects(orgId: string | undefined) {
  return useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => (await api<{ projects: ProjectDTO[] }>(`/api/projects?orgId=${orgId}`)).projects,
    enabled: Boolean(orgId),
  });
}

export function useProject(orgId: string | undefined, projectId: string) {
  return useQuery({
    queryKey: ["project", orgId, projectId],
    queryFn: async () => (await api<{ project: ProjectDTO }>(`/api/projects/${projectId}?orgId=${orgId}`)).project,
    enabled: Boolean(orgId),
  });
}

export function useResync(orgId: string | undefined, projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["resync", orgId, projectId],
    queryFn: async () =>
      (
        await api<{ resync: { diffs: Array<{ subname: string; stored: string; current: string | null }> } }>(
          `/api/projects/${projectId}?orgId=${orgId}&resync=1`,
        )
      ).resync,
    enabled: Boolean(orgId) && enabled,
  });
}

export function usePayouts(orgId: string | undefined, projectId: string) {
  return useQuery({
    queryKey: ["payouts", orgId, projectId],
    queryFn: async () => (await api<{ payouts: PayoutDTO[] }>(`/api/projects/${projectId}/payouts?orgId=${orgId}`)).payouts,
    enabled: Boolean(orgId),
    refetchInterval: 5_000,
  });
}

export function useMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ["members", orgId],
    queryFn: async () => (await api<{ members: MemberDTO[] }>(`/api/members?orgId=${orgId}`)).members,
    enabled: Boolean(orgId),
  });
}

export function useInvites(orgId: string | undefined) {
  return useQuery({
    queryKey: ["invites", orgId],
    queryFn: async () => (await api<{ invites: InviteDTO[] }>(`/api/invites?orgId=${orgId}`)).invites,
    enabled: Boolean(orgId),
    refetchInterval: 5_000,
  });
}

export function useGrants(orgId: string | undefined) {
  return useQuery({
    queryKey: ["grants", orgId],
    queryFn: async () => (await api<{ grants: GrantDTO[] }>(`/api/grants?orgId=${orgId}`)).grants,
    enabled: Boolean(orgId),
    refetchInterval: 5_000,
  });
}

export function useClaimable(enabled: boolean) {
  return useQuery({
    queryKey: ["claimable"],
    queryFn: () => api<{ address: string; balances: ClaimableDTO[] }>("/api/me/claimable"),
    enabled,
    refetchInterval: 5_000,
  });
}

/* --------------------------------------------------------------- writes -- */

export const orgActions = {
  async createOrg(sign: (m: string) => Promise<string>, p: Omit<OrgAttrs, "authSig">) {
    const attrs = await signAttrs(sign, "org", p);
    return api<{ org: OrgDTO }>("/api/orgs", { method: "POST", body: JSON.stringify({ attrs }) });
  },

  async createProject(sign: (m: string) => Promise<string>, orgId: string, p: { projectId: string; name: string; description: string }) {
    const attrs = await signAttrs(sign, "project", {
      orgId,
      ...p,
      splitContract: "",
      onchainId: projectIdToBytes32(orgId, p.projectId),
      version: 0,
      shares: [],
      updatedAt: nowSec(),
    });
    return api<{ project: ProjectDTO }>("/api/projects", { method: "POST", body: JSON.stringify({ attrs }) });
  },

  async saveShares(sign: (m: string) => Promise<string>, p: Omit<ProjectAttrs, "authSig">) {
    const attrs = await signAttrs(sign, "project", p);
    return api<{ project: ProjectDTO }>(`/api/projects/${p.projectId}/shares`, { method: "POST", body: JSON.stringify({ attrs }) });
  },

  async createInvite(sign: (m: string) => Promise<string>, p: Omit<InviteAttrs, "authSig">) {
    const attrs = await signAttrs(sign, "invite", p);
    return api<{ invite: InviteDTO; link: string }>("/api/invites", { method: "POST", body: JSON.stringify({ attrs }) });
  },

  async acceptInvite(sign: (m: string) => Promise<string>, key: string, p: Omit<InviteAcceptAttrs, "acceptSig">) {
    const acceptSig = await sign(acceptMessage(p));
    return api(`/api/invites/${key}/accept`, { method: "POST", body: JSON.stringify({ attrs: { ...p, acceptSig } }) });
  },

  issueSubname(orgId: string, label: string, address: string) {
    return api<{ instructions: SubnameInstructionsDTO; issued: boolean }>(`/api/members/${label}/issue-subname`, {
      method: "POST",
      body: JSON.stringify({ orgId, address }),
    });
  },

  async approveMember(sign: (m: string) => Promise<string>, p: Omit<MemberAttrs, "authSig">) {
    const attrs = await signAttrs(sign, "member", p);
    return api<{ member: MemberDTO }>("/api/members", { method: "POST", body: JSON.stringify({ attrs }) });
  },

  async createGrant(sign: (m: string) => Promise<string>, p: Omit<GrantAttrs, "authSig">, ttlHours: number) {
    const attrs = await signAttrs(sign, "grant", p);
    return api<{ grant: GrantDTO }>("/api/grants", { method: "POST", body: JSON.stringify({ attrs, ttlHours }) });
  },

  async revoke(sign: (m: string) => Promise<string>, p: Omit<RevocationAttrs, "authSig">) {
    const attrs = await signAttrs(sign, "revocation", p);
    return api("/api/revocations", { method: "POST", body: JSON.stringify({ attrs }) });
  },
};
