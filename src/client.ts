import type { z } from "zod";
import {
  accountListParamsSchema,
  accountPageSchema,
  accountResponseSchema,
  contactPageSchema,
  contactResponseSchema,
  contactRetrieveParamsSchema,
  errorResponseSchema,
  genericResponseSchema,
  issueFollowersResponseSchema,
  issueListParamsSchema,
  issuePageSchema,
  issueResponseSchema,
  meResponseSchema,
  searchParamsSchema,
  teamListResponseSchema,
  teamResponseSchema,
  userListResponseSchema,
  userPageSchema,
  userResponseSchema,
  type AccountListParams,
  type ContactRetrieveParams,
  type IssueListParams,
  type SearchParams,
} from "./schemas";

const DEFAULT_BASE_URL = "https://api.usepylon.com";

type Fetch = typeof fetch;
export type PylonHttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
type RequestOptions = {
  body?: unknown;
  bodyContentType?: "application/json" | "multipart/form-data" | undefined;
  query?: Record<string, unknown>;
};

export type PylonClientOptions = {
  apiKey: string;
  baseURL?: string | undefined;
  fetch?: Fetch | undefined;
};

export class PylonApiError extends Error {
  readonly body: unknown;
  readonly errors: string[];
  readonly requestId?: string | undefined;
  readonly status: number;

  constructor({
    body,
    errors,
    requestId,
    status,
    statusText,
  }: {
    body: unknown;
    errors: string[];
    requestId?: string | undefined;
    status: number;
    statusText: string;
  }) {
    const message =
      errors.length > 0 ? errors.join("; ") : `Pylon API request failed: ${status} ${statusText}`;

    super(requestId ? `${message} (request_id: ${requestId})` : message);

    this.name = "PylonApiError";
    this.body = body;
    this.errors = errors;
    this.requestId = requestId;
    this.status = status;
  }
}

export class PylonClient {
  readonly accounts = {
    list: (query: AccountListParams = {}) =>
      this.request("GET", "/accounts", accountPageSchema, {
        query: accountListParamsSchema.parse(query),
      }),
    retrieve: (id: string) =>
      this.request("GET", `/accounts/${pathSegment(id)}`, accountResponseSchema),
    search: (body: SearchParams) =>
      this.request("POST", "/accounts/search", accountPageSchema, {
        body: searchParamsSchema.parse(body),
      }),
  };

  readonly contacts = {
    list: () => this.request("GET", "/contacts", contactPageSchema),
    retrieve: (id: string, query: ContactRetrieveParams = {}) =>
      this.request("GET", `/contacts/${pathSegment(id)}`, contactResponseSchema, {
        query: contactRetrieveParamsSchema.parse(query),
      }),
    search: (body: SearchParams) =>
      this.request("POST", "/contacts/search", contactPageSchema, {
        body: searchParamsSchema.parse(body),
      }),
  };

  readonly issues = {
    list: (query: IssueListParams) =>
      this.request("GET", "/issues", issuePageSchema, {
        query: issueListParamsSchema.parse(query),
      }),
    listFollowers: (id: string) =>
      this.request("GET", `/issues/${pathSegment(id)}/followers`, issueFollowersResponseSchema),
    retrieve: (id: string) =>
      this.request("GET", `/issues/${pathSegment(id)}`, issueResponseSchema),
    search: (body: SearchParams) =>
      this.request("POST", "/issues/search", issuePageSchema, {
        body: searchParamsSchema.parse(body),
      }),
  };

  readonly me = {
    retrieve: () => this.request("GET", "/me", meResponseSchema),
  };

  readonly teams = {
    retrieve: (id: string) => this.request("GET", `/teams/${pathSegment(id)}`, teamResponseSchema),
    list: () => this.request("GET", "/teams", teamListResponseSchema),
  };

  readonly users = {
    list: () => this.request("GET", "/users", userListResponseSchema),
    retrieve: (id: string) => this.request("GET", `/users/${pathSegment(id)}`, userResponseSchema),
    search: (body: SearchParams) =>
      this.request("POST", "/users/search", userPageSchema, {
        body: searchParamsSchema.parse(body),
      }),
  };

  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly fetch: Fetch;

  constructor({
    apiKey,
    baseURL = readEnv("PYLON_BASE_URL") ?? DEFAULT_BASE_URL,
    fetch,
  }: PylonClientOptions) {
    if (!apiKey) {
      throw new Error(
        "Pylon API key is required. Pass it as `apiKey` or set the PYLON_API_KEY environment variable.",
      );
    }

    const fetchImplementation = fetch ?? globalThis.fetch;

    if (!fetchImplementation) {
      throw new Error("PylonClient requires a fetch implementation.");
    }

    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.fetch = fetchImplementation;
  }

  private async request<ResponseSchema extends z.ZodType>(
    method: PylonHttpMethod,
    path: string,
    schema: ResponseSchema,
    options: RequestOptions = {},
  ): Promise<z.infer<ResponseSchema>> {
    const init: RequestInit = {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      method,
    };

    if (options.body !== undefined) {
      if (options.bodyContentType === "multipart/form-data") {
        init.body = toFormData(options.body);
      } else {
        init.headers = {
          ...init.headers,
          "Content-Type": "application/json",
        };
        init.body = JSON.stringify(options.body);
      }
    }

    const response = await this.fetch(this.buildURL(path, options.query), init);
    const payload = await readResponsePayload(response);

    if (!response.ok) {
      throw createPylonApiError(response, payload);
    }

    return schema.parse(payload);
  }

  private buildURL(path: string, query?: Record<string, unknown> | undefined): string {
    const url = new URL(path, this.baseURL);

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === undefined || item === null) continue;
          url.searchParams.append(key, String(item));
        }
        continue;
      }

      url.searchParams.set(key, String(value));
    }

    return url.toString();
  }

  requestEndpoint(
    method: PylonHttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<unknown> {
    return this.request(method, path, genericResponseSchema, options);
  }
}

export function createPylonClient(apiKeyOrOptions: string | PylonClientOptions): PylonClient {
  const options =
    typeof apiKeyOrOptions === "string" ? { apiKey: apiKeyOrOptions } : apiKeyOrOptions;

  return new PylonClient(options);
}

export function resolvePylonApiKey(apiKey?: string): string {
  const resolvedApiKey = apiKey ?? readEnv("PYLON_API_KEY");

  if (!resolvedApiKey) {
    throw new Error(
      "Pylon API key is required. Pass it as `apiKey` or set the PYLON_API_KEY environment variable.",
    );
  }

  return resolvedApiKey;
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function createPylonApiError(response: Response, payload: unknown): PylonApiError {
  const parsed = errorResponseSchema.safeParse(payload);
  const errors = parsed.success ? (parsed.data.errors ?? []) : [];
  const requestId = parsed.success ? parsed.data.request_id : undefined;

  return new PylonApiError({
    body: payload,
    errors,
    requestId,
    status: response.status,
    statusText: response.statusText,
  });
}

function pathSegment(value: string): string {
  return encodeURIComponent(value);
}

function readEnv(name: string): string | undefined {
  return typeof process === "undefined" ? undefined : process.env[name];
}

function toFormData(body: unknown): FormData {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Multipart Pylon requests require an object body.");
  }

  const formData = new FormData();

  for (const [key, value] of Object.entries(body)) {
    appendFormValue(formData, key, value);
  }

  return formData;
}

function appendFormValue(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null) return;

  if (Array.isArray(value)) {
    for (const item of value) appendFormValue(formData, key, item);
    return;
  }

  if (isBlob(value)) {
    formData.append(key, value);
    return;
  }

  if (typeof value === "object") {
    formData.append(key, JSON.stringify(value));
    return;
  }

  formData.append(key, String(value));
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}
