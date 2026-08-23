class AsyncWordCount {
  constructor() {
    this.totalWordsCount = 0;
  }

  // Internal Async func given in the question to return the wordsCount for a doc,
  // and u should also assign a machine for the same task
  async _countWords(machineId, docId) {}

  // Base optimal soln for unlimited machines, TC: O(timePerDoc)
  async getTotalCount(numDocs) {
    let promises = [];

    for (let docId = 0; docId < numDocs; docId++)
      promises.push(this._countWords(docId, docId));

    const counts = await Promise.all(promises);

    return counts.reduce((acc, curr) => curr + acc, 0);
  }

  // Followup-1: With limited maxMachines count
  async getTotalCountLimitedMachines(numDocs, maxMachines) {
    let workers = [];
    let currrDocId = 0;

    const worker = async (machineId) => {
      let subTotal = 0;
      while (currrDocId < numDocs)
        subTotal += await this._countWords(machineId, currrDocId++);

      return subTotal;
    };

    const machineCount = Math.min(maxMachines, numDocs);
    for (let machineId = 0; machineId < machineCount; machineId++)
      workers.push(worker(machineId));

    const subTotals = await Promise.all(workers);

    return subTotals.reduce((acc, curr) => acc + curr, 0);
  }

  // Followup-2: With limited maxMachines count and countWords might return incorrect results some times
  async getTotalCountLimitedMachinesWithUnreliability(numDocs, maxMachines) {
    let workers = [];
    let currrDocId = 0;

    const countReliableWordsCount = async (machineId, docId) => {
      const seen = new Map();

      while (true) {
        const currRes = await this._countWords(machineId, docId);

        if (seen.has(currRes)) return currRes;
        seen.set(currRes, 1);
      }
    };

    const worker = async (machineId) => {
      let subTotal = 0;
      while (currrDocId < numDocs)
        subTotal += await countReliableWordsCount(machineId, currrDocId++);

      return subTotal;
    };

    const machineCount = Math.min(maxMachines, numDocs);
    for (let machineId = 0; machineId < machineCount; machineId++)
      workers.push(worker(machineId));

    const subTotals = await Promise.all(workers);

    return subTotals.reduce((acc, curr) => acc + curr, 0);
  }
}
