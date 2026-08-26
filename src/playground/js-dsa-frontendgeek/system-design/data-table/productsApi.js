const BASE_URL = 'https://dummyjson.com/products';

// Backs the DataTable with the DummyJSON /products public API instead of mock data.
// DummyJSON natively supports limit/skip pagination, sortBy/order sorting, and a
// separate /search endpoint for text search -- same shape usePaginatedRows expects.
export async function fetchPage({ offset, limit, sort, filters }) {
  const params = new URLSearchParams({ limit, skip: offset });
  if (sort) {
    params.set('sortBy', sort.key);
    params.set('order', sort.direction);
  }

  const url = filters?.search
    ? `${BASE_URL}/search?q=${encodeURIComponent(filters.search)}&${params}`
    : `${BASE_URL}?${params}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch products (${res.status})`);

  const data = await res.json();
  return { rows: data.products, total: data.total };
}
