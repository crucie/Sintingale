import type { AccessResult, InvoiceRow, InvoiceStatus } from "../types";

export interface SintingaleOptions {
  /** Base URL of the Sintingale deployment, e.g. https://sintingale.app */
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
}

export class SintingaleApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * `@sintingale/sdk` for SaaS backends. Every call maps to a single Arkiv query on
 * the Sintingale side, filtered to entities written by the relayer.
 */
export class Sintingale {
  private readonly fetcher: typeof fetch;

  constructor(private readonly opts: SintingaleOptions) {
    this.fetcher = opts.fetch ?? fetch;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetcher(`${this.opts.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: { "content-type": "application/json", "x-api-key": this.opts.apiKey, ...init?.headers },
    });
    const body = await res.json();
    if (!res.ok) throw new SintingaleApiError(body?.error?.code ?? "UNKNOWN", body?.error?.message ?? res.statusText, res.status);
    return body as T;
  }

  /** Is this customer currently entitled to this plan? */
  async hasAccess(params: { merchantId: string; planId: string; customer: string }): Promise<boolean> {
    return (await this.checkAccess(params)).active;
  }

  checkAccess(params: { merchantId: string; planId: string; customer: string }): Promise<AccessResult> {
    const qs = new URLSearchParams(params).toString();
    return this.request<AccessResult>(`/api/access?${qs}`);
  }

  async listInvoices(params: { merchantId: string; status?: InvoiceStatus }): Promise<InvoiceRow[]> {
    const qs = new URLSearchParams({ merchantId: params.merchantId, ...(params.status ? { status: params.status } : {}) });
    return (await this.request<{ invoices: InvoiceRow[] }>(`/api/invoices?${qs}`)).invoices;
  }

  createInvoice(params: {
    merchantId: string;
    planId: string;
    amount?: string;
    customer?: string;
    dueInHours?: number;
  }): Promise<{ invoiceKey: string; checkoutUrl: string; expiresAt: number }> {
    return this.request(`/api/invoices`, { method: "POST", body: JSON.stringify({ currency: "USDT", ...params }) });
  }
}
