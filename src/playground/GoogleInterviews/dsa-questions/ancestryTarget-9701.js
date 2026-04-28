class Node {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

class AncestryTarget {
  constructor() {
    this.prefixSumMap = new Map(); // { PS, [node] }
    this.depthsMap = new Map(); // { node, depth }
    this.prefixDepthsMap = new Map(); // { PS, [depth] }
    this.minLength = 1;
    this.maxLength = 1;
    this.targetSum;
  }

  findDepths(root, level) {
    if (!root) return;
    this.depthsMap.set(root, level);

    this.findDepths(root.left, level + 1);
    this.findDepths(root.right, level + 1);
  }

  dfs(node, pSum) {
    // TC: O(n^2), SC: O(n)
    if (!node) return false;

    if (this.prefixSumMap.has(pSum)) this.prefixSumMap.get(pSum).push(node);
    else this.prefixSumMap.set(pSum, [node]);

    if (this.prefixSumMap.has(pSum + node.val - this.targetSum)) {
      const prevNodes = this.prefixSumMap.get(pSum + node.val - this.targetSum);

      for (const prevNode of prevNodes) {
        const depth =
          this.depthsMap.get(node) - this.depthsMap.get(prevNode) + 1;

        if (depth <= this.maxLength && depth >= this.minLength) return true;
      }
    }

    if (
      this.dfs(node.left, pSum + node.val) ||
      this.dfs(node.right, pSum + node.val)
    ) {
      this.prefixSumMap.get(pSum).pop();
      if (this.prefixSumMap.get(pSum).length === 0) {
        this.prefixSumMap.delete(pSum);
      }

      return true;
    }

    this.prefixSumMap.get(pSum).pop();
    if (this.prefixSumMap.get(pSum).length === 0) {
      this.prefixSumMap.delete(pSum);
    }
    return false;
  }

  dfsOptimized(node, pSum, pDepth) {
    // TC: O(NLogN)
    if (!node) return false;

    if (this.prefixDepthsMap.has(pSum))
      this.prefixDepthsMap.get(pSum).push(pDepth);
    else this.prefixDepthsMap.set(pSum, [pDepth]);

    if (this.prefixDepthsMap.has(pSum + node.val - this.targetSum)) {
      const prevDepths = this.prefixDepthsMap.get(
        pSum + node.val - this.targetSum,
      );

      const lowerBoundId = this.getLowerIndex(
        prevDepths,
        pDepth - this.maxLength + 1,
      );

      if (
        lowerBoundId < prevDepths.length &&
        prevDepths[lowerBoundId] <= pDepth - this.minLength + 1
      )
        return true;
    }

    if (
      this.dfsOptimized(node.left, pSum + node.val, pDepth + 1) ||
      this.dfsOptimized(node.right, pSum + node.val, pDepth + 1)
    ) {
      this.prefixDepthsMap.get(pSum).pop();
      if (this.prefixDepthsMap.get(pSum).length === 0) {
        this.prefixDepthsMap.delete(pSum);
      }

      return true;
    }

    this.prefixDepthsMap.get(pSum).pop();
    if (this.prefixDepthsMap.get(pSum).length === 0) {
      this.prefixDepthsMap.delete(pSum);
    }
    return false;
  }

  getLowerIndex(arr, target) {
    // First index which arr[i] > target
    if (!arr.length || target === null) return -1;

    let left = 0,
      right = arr.length;
    while (left < right) {
      const mid = (left + right) >> 1;

      if (arr[mid] >= target) right = mid;
      else left = mid + 1;
    }

    return left;
  }

  isAncestryTargetExists(root, K, L_min, L_max) {
    if (!root) return false;
    this.targetSum = K;
    this.maxLength = L_max;
    this.minLength = L_min;

    this.findDepths(root, 1);

    if (this.dfs(root, 0)) return true;
    if (this.dfsOptimized(root, 0, 1)) return true;
    return false;
  }
}
