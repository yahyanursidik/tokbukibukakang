export const adminPerPageOptions = [10, 20, 50] as const;

export type AdminPagination = {
  page: number;
  perPage: number;
  from: number;
  to: number;
};

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const getAdminPagination = (url: URL, defaultPerPage = 20): AdminPagination => {
  const page = parsePositiveInt(url.searchParams.get('page'), 1);
  const requestedPerPage = parsePositiveInt(url.searchParams.get('per_page'), defaultPerPage);
  const perPage = adminPerPageOptions.includes(requestedPerPage as (typeof adminPerPageOptions)[number])
    ? requestedPerPage
    : defaultPerPage;
  const from = (page - 1) * perPage;

  return {
    page,
    perPage,
    from,
    to: from + perPage - 1
  };
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
};
