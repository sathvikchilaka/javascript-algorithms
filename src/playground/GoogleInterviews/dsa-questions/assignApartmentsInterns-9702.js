class UnionFindMaps {
  constructor(items) {
    this.size = new Map();
    this.parent = new Map();

    for (const item of items) {
      this.parent.set(item, item);
      this.size.set(item, 1); // We r tracking the size of each tree here, so union by Size not Rank, so default would be 1 considering itself
    }
  }

  find(x) {
    if (this.parent.get(x) !== x)
      this.parent.set(x, this.find(this.parent.get(x)));

    return this.parent.get(x);
  }

  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);

    if (rootA === rootB) return;

    if (this.size.get(rootA) > this.size.get(rootB)) {
      this.parent.set(rootB, rootA);
      this.size.set(rootA, this.size.get(rootA) + this.size.get(rootB));
    } else {
      this.parent.set(rootA, rootB);
      this.size.set(rootB, this.size.get(rootA) + this.size.get(rootB));
    }
  }
}

class AssignApartmentsToInterns {
  constructor() {
    this.result = new Map();
  }

  addIntern(aptId, person) {
    if (!this.result.has(aptId)) {
      this.result.set(aptId, []);
    }
    this.result.get(aptId).push(person.name);
  }

  // TC: O(N) & SC: O(N)
  assignApts(apts, persons) {
    this.result = new Map();

    const soloApts = [];
    const multiApts = [];

    const aloneInterns = [];
    const sharingInterns = [];

    // One pass over apartments
    for (const apt of apts) {
      if (apt.numBedrooms <= 0) continue;

      if (apt.numBedrooms === 1) {
        soloApts.push(apt);
      } else {
        multiApts.push(apt);
      }
    }

    // One pass over people
    for (const person of persons) {
      if (person.wantsHousemates) {
        sharingInterns.push(person);
      } else {
        aloneInterns.push(person);
      }
    }

    let soloIndex = 0;
    let sharingIndex = 0;

    const unusedSoloApts = [];

    // Step 1: solo interns -> single apartments
    for (const apt of soloApts) {
      if (soloIndex < aloneInterns.length) {
        this.addIntern(apt.aptId, aloneInterns[soloIndex++]);
      } else {
        unusedSoloApts.push(apt);
      }
    }

    // Step 2: sharing interns -> multi apartments
    for (const apt of multiApts) {
      let capacity = apt.numBedrooms;

      while (capacity > 0 && sharingIndex < sharingInterns.length) {
        this.addIntern(apt.aptId, sharingInterns[sharingIndex++]);
        capacity--;
      }

      while (capacity > 0 && soloIndex < aloneInterns.length) {
        this.addIntern(apt.aptId, aloneInterns[soloIndex++]);
        capacity--;
      }
    }

    // Step 3: leftover sharing interns -> unused single apartments
    for (const apt of unusedSoloApts) {
      if (sharingIndex < sharingInterns.length) {
        this.addIntern(apt.aptId, sharingInterns[sharingIndex++]);
      }
    }

    return this.result;
  }
}

class AssignApartmentsWithPreferences {
  constructor() {
    this.result = new Map();
  }

  buildGroups(persons) {
    const names = persons.map((p) => p.name);
    const uf = new UnionFindMaps(names);
    const resGroups = new Map();
    const prefPersonsMap = new Map();

    persons.forEach((person) => {
      prefPersonsMap.set(person.name, new Set(person.preferredRoommates || []));
    });

    persons.forEach((person) => {
      (person.preferredRoommates || []).forEach((other) => {
        if (prefPersonsMap.get(other)?.has(person.name))
          uf.union(person.name, other);
      });
    });

    persons.forEach((person) => {
      const root = uf.find(person.name);

      if (!resGroups.has(root)) resGroups.set(root, []);
      resGroups.get(root).push(person.name);
    });

    return [...resGroups.values()];
  }

  addGroupToAptId(group, aptId) {
    if (this.result.has(aptId))
      this.result.set(aptId, [...this.result.get(aptId), ...group]);
    else this.result.set(aptId, [...group]);
  }

  // TC: O(N^2) & SC: O(N)
  assignApts(apts, persons) {
    this.result = new Map();
    const validApts = apts
      .filter((apt) => apt.numBedrooms >= 1)
      .sort((a, b) => b.numBedrooms - a.numBedrooms);

    const groups = this.buildGroups(persons).sort(
      (a, b) => b.length - a.length,
    );

    const filledApts = new Set();
    groups.forEach((group) => {
      let remainingPeople = [...group];
      for (const apt of validApts) {
        if (filledApts.has(apt.aptId)) continue;

        const used = this.result.get(apt.aptId)?.length ?? 0;
        let remainingCapacity = apt.numBedrooms - used;

        while (remainingCapacity > 0 && remainingPeople.length > 0) {
          const person = remainingPeople.shift();
          this.addGroupToAptId([person], apt.aptId);
          remainingCapacity--;
        }

        if (this.result.get(apt.aptId)?.length === apt.numBedrooms)
          filledApts.add(apt.aptId);

        if (remainingPeople.length === 0) break;
      }
    });

    return this.result;
  }

  // Returns the index of lowest arr[i]>=x
  lowerBound(arr, x) {
    let i = 0,
      j = arr.length - 1,
      res = j + 1;

    while (i <= j) {
      const mid = Math.floor((i + j) / 2);

      if (arr[mid] >= x) {
        res = mid;
        j = mid - 1;
      } else i = mid + 1;
    }

    return res;
  }

  // TC: O(logN), SC: O(N)
  optimizedAssignApts(apts, persons) {
    this.result = new Map();
    const capacityToApts = new Map();

    for (const apt of apts) {
      if (apt.numBedrooms < 1) continue;

      if (!capacityToApts.has(apt.numBedrooms)) {
        capacityToApts.set(apt.numBedrooms, []);
      }

      capacityToApts.get(apt.numBedrooms).push(apt);
    }

    const capacities = [...capacityToApts.keys()].sort((a, b) => a - b);

    const groups = this.buildGroups(persons).sort(
      (a, b) => a.length - b.length,
    );

    for (const group of groups) {
      // First try to keep whole group together
      let index = this.lowerBound(capacities, group.length);
      if (index !== capacities.length) {
        const capacity = capacities[index];
        const apt = capacityToApts.get(capacity).pop();

        this.addPeopleToApt(apt.aptId, group);

        if (capacityToApts.get(capacity).length === 0) {
          capacityToApts.delete(capacity);
          capacities.splice(index, 1);
        }

        continue;
      }

      // Fallback: split group to maximize occupancy
      for (const person of group) {
        index = this.lowerBound(capacities, 1);

        if (index === capacities.length) break;

        const capacity = capacities[index];

        const apt = capacityToApts.get(capacity).pop();

        this.addPeopleToApt(apt.aptId, [person]);

        const remainingCapacity = capacity - 1;

        if (capacityToApts.get(capacity).length === 0) {
          capacityToApts.delete(capacity);

          capacities.splice(index, 1);
        }

        if (remainingCapacity > 0) {
          if (!capacityToApts.has(remainingCapacity)) {
            capacityToApts.set(remainingCapacity, []);

            capacities.splice(
              this.lowerBound(capacities, remainingCapacity),
              0,
              remainingCapacity,
            );
          }

          capacityToApts.get(remainingCapacity).push({
            aptId: apt.aptId,

            numBedrooms: remainingCapacity,
          });
        }
      }
    }

    return this.result;
  }
}
