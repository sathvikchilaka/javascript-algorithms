class Paginator {
  constructor(items, pageSize = 10) {
    this.items = items;
    this.pageSize = pageSize;
    this.currentPage = 1;
  }

  getTotalPages() {
    return Math.ceil(this.items.length / this.pageSize);
  }

  getCurrentPageData() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;

    return this.items.slice(start, end);
  }

  nextPage() {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page) {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }
}

class GroupPorts {
  constructor() {
    this.grouped = {};
  }

  groupingPorts(ports) {
    if (!Array.isArray(ports) || ports.length === 0) {
      return {};
    }

    const sortedPorts = [...ports]
      .filter(
        (port) =>
          port && typeof port.name === 'string' && Number.isFinite(port.number),
      )
      .sort((a, b) => {
        if (a.name !== b.name) {
          return a.name.localeCompare(b.name);
        }
        return a.number - b.number;
      });

    for (const { name, number } of sortedPorts) {
      if (!grouped[name]) {
        grouped[name] = [{ start: number, end: number }];
        continue;
      }

      const ranges = grouped[name];
      const lastRange = ranges[ranges.length - 1];

      if (number === lastRange.end) {
        continue; // duplicate
      }

      if (number === lastRange.end + 1) {
        lastRange.end = number; // extend range
      } else {
        ranges.push({ start: number, end: number }); // new range
      }
    }

    return grouped;
  }

  formatGroupedPorts(grouped) {
    return Object.entries(grouped).map(([name, ranges]) => ({
      name,
      ports: ranges
        .map((range) =>
          range.start === range.end
            ? `${range.start}`
            : `${range.start}-${range.end}`,
        )
        .join(', '),
    }));
  }
}

// Follow-up 1 — What if input is already sorted?

// If the backend guarantees the input is already sorted by port name and port number, then I can skip the sorting step completely. Right now the solution is O(n log n) because of sorting, but if input is already sorted, the solution becomes O(n) since I only need a single linear pass to merge consecutive ranges.

// ⸻

// Follow-up 2 — What if the dataset is huge?

// If the dataset contains thousands or millions of ports, rendering everything directly can freeze the UI because too many DOM nodes get created.

// To handle this, I’d use:

// 1. Pagination
// 2. Virtualization
// 3. Backend aggregation

// Pagination means rendering only a subset of rows per page, like 50 rows at a time.

// Virtualization means rendering only the rows visible on screen using libraries like react-window or react-virtualized. Even if there are 100000 rows, only around 10–20 visible rows are mounted in the DOM.

// Backend aggregation means the backend already groups ranges before sending them to frontend. Instead of sending:
// abc 1000
// abc 1001
// abc 1002

// backend can send:
// abc: 1000-1002

// This reduces network payload, frontend CPU work, and rendering overhead.

// For very large datasets, I’d prefer backend aggregation plus frontend virtualization.

// ⸻

// Follow-up 3 — What if ports arrive as a stream?

// If ports arrive continuously through WebSockets or real-time updates, repeatedly sorting the entire dataset becomes expensive.

// Instead, I’d maintain ranges incrementally.

// Example:
// Current range:
// 1000-1002

// Incoming port:
// 1003

// I’d simply extend the range to:
// 1000-1003

// For more advanced streaming systems, data structures like interval trees or ordered maps can help efficiently merge intervals.

// For streaming data, incremental interval merging is better than reprocessing the entire dataset every update.

// ⸻

// Follow-up 4 — What about duplicates?

// Example:
// 1000
// 1000
// 1001

// I’d first clarify product requirements.

// One option is ignoring duplicates, which is what the current solution does.

// Another option is preserving duplicate frequency if duplicates are meaningful. In that case, ranges could store counts as metadata.

// I’d clarify whether duplicates should be deduplicated or preserved semantically.

// ⸻

// Follow-up 5 — What if invalid data exists?

// Input may contain null values, undefined entries, missing fields, or invalid numbers.

// Example:
// { name: null }
// { number: “abc” }

// So I’d validate before processing:

// * name should be a string
// * number should be finite

// Without validation, sorting or grouping logic may fail or produce corrupted ranges.

// Validation ensures the grouping logic remains reliable and fault tolerant.

// ⸻

// Follow-up 6 — How would you test this?

// I’d test:

// * empty input
// * null input
// * single port
// * consecutive numbers
// * non-consecutive numbers
// * multiple names
// * duplicates
// * unsorted input
// * invalid entries

// Unsorted input is especially important because grouping logic depends on ordering.

// Thorough edge-case testing ensures correctness and prevents hidden bugs in interval logic.
