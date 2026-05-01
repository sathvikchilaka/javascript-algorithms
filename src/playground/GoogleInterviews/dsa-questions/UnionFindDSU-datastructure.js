class DisjointSetUnion {
  constructor(n) {
    this.parent = Array.from({ length: n + 1 }, (_, i) => i); // 1-indexed array to point 1st element with 1...
    this.size = new Array(n + 1).fill(1); // The size of each node tree
    this.rank = new Array(n + 1).fill(0); // The rank(n) is the height of that node tree
  }

  // O(N)
  unite(a, b) {
    const parentA = this.find(a);
    const parentB = this.find(b);

    if (parentA !== parentB) {
      // Attach smaller tree to the bigger one, to maintain shallower tree overall
      if (this.size[parentA] > this.size[parentB]) {
        this.parent[parentB] = parentA;
        this.size[parentA] += this.size[parentB];
      } else {
        this.parent[parentA] = parentB;
        this.size[parentB] += this.size[parentA];
      }
    }
  }

  // O(N)
  unionByRank(a, b) {
    const parentA = this.find(a);
    const parentB = this.find(b);

    if (parentA !== parentB) {
      const rankA = this.rank[parentA];
      const rankB = this.rank[parentB];

      // Rank doesnt change when u append shorter tree to a bigger tree, as we r appending it to the root parent
      if (rankA > rankB) this.parent[parentB] = parentA;
      else if (rankA < rankB) this.parent[parentA] = parentB;
      else {
        this.parent[parentA] = parentB;
        this.rank[parentB]++;
      }
    }
  }

  // O(N)
  find(x) {
    if (this.parent[x] !== x) {
      // THe first time, it will do entirely but the subsequent times, it gonna be simple
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
}

// Big signals that indicate it's a DSU:
// If a problem says-
// - group elements
// - merge groups
// - check if two elements are connected
// - connected components
// - friend circles / provinces
// - accounts merge
// - redundant connection
// - number of islands with dynamic additions
