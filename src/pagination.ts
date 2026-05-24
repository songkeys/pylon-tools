export type PageSummary<T> = {
  data: T[];
  pagination?: {
    cursor?: string;
    hasNextPage?: boolean;
  };
  requestId?: string;
};

type PylonPage<T> = {
  data?: T[] | undefined;
  pagination?:
    | {
        cursor?: string | undefined;
        has_next_page?: boolean | undefined;
      }
    | undefined;
  request_id?: string | undefined;
};

export async function summarizePage<T>(
  pagePromise: PromiseLike<PylonPage<T>>,
): Promise<PageSummary<T>> {
  const page = await pagePromise;
  const summary: PageSummary<T> = {
    data: page.data ?? [],
  };
  const pagination = page.pagination ? cleanPagination(page.pagination) : undefined;

  if (pagination) {
    summary.pagination = pagination;
  }

  if (page.request_id) {
    summary.requestId = page.request_id;
  }

  return summary;
}

function cleanPagination(pagination: NonNullable<PylonPage<unknown>["pagination"]>) {
  const cleaned: NonNullable<PageSummary<unknown>["pagination"]> = {};

  if (pagination.cursor !== undefined) {
    cleaned.cursor = pagination.cursor;
  }

  if (pagination.has_next_page !== undefined) {
    cleaned.hasNextPage = pagination.has_next_page;
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}
