import BinaryHeap from './BinaryHeap-datastructure';

/*
Final Ad Object:
{
  content: "Nike Ad",
  score: 5,
  delay: 2,
  id: uniqueNumericCounter
}
*/

class AdsCenterBasic {
  constructor() {
    this.idCounter = 0;
    this.adsDisplayed = 0;
    this.availableAds = new BinaryHeap((a, b) => {
      if (a.score > b.score) return true;
      return a.id > b.id; // This is for equal scores case, adding custom own second layer of comp
    });
    this.lastServedAd = null;
  }

  insertAd(content, score) {
    const newAd = {
      id: this.idCounter++,
      content,
      score,
    };

    this.availableAds.push(newAd);
  }

  getAd() {
    this.adsDisplayed++;

    let upcomingAd = this.availableAds.pop();
    if (!upcomingAd) return null; // If there's no Ad, we are assuming to return null
    if (this.lastServedAd) {
      this.lastServedAd.score -= 1;
      if (this.lastServedAd.score > 0)
        this.availableAds.push(this.lastServedAd);
    }
    this.lastServedAd = upcomingAd;

    return upcomingAd.content;
  }
}

class AdsCenterFollowUp1 {
  constructor() {
    this.idCounter = 0;
    this.timeCompleted = 0;
    this.availableAds = new BinaryHeap((a, b) => {
      if (a.score !== b.score) return a.score > b.score;
      return a.id > b.id; // This is for equal scores case, adding custom own second layer of comp
    });
    this.cooldownAds = new BinaryHeap(
      (a, b) => a.nextAvailableTime < b.nextAvailableTime,
    );
  }

  insertAd(content, score, delay = 1) {
    // Delay=1, coz we still dont want to have consecutive Ads
    const newAd = {
      id: this.idCounter++,
      content,
      score,
      delay,
    };

    this.availableAds.push(newAd);
  }

  getAd() {
    this.timeCompleted++;

    while (
      this.cooldownAds.size() > 0 &&
      this.cooldownAds.peek().nextAvailableTime <= this.timeCompleted
    ) {
      let readyAd = this.cooldownAds.pop();
      this.availableAds.push({
        id: readyAd.id,
        content: readyAd.content,
        delay: readyAd.delay,
        score: readyAd.score,
      });
    }

    if (!this.availableAds.size()) return null;

    let upcomingAd = this.availableAds.pop();

    console.log(
      `Serving: ${upcomingAd.content} (score=${upcomingAd.score}) at epoch=${this.timeCompleted}`,
    );

    if (upcomingAd.score > 1) {
      this.cooldownAds.push({
        ...upcomingAd,
        score: upcomingAd.score - 1,
        nextAvailableTime: upcomingAd.delay + this.timeCompleted,
      });
    }

    return upcomingAd.content;
  }
}

// Similar to followUp1, but here delay is constant N globally for all the ads which have been displayed
class AdsCenterFollowUp2 {
  constructor(N) {
    this.idCounter = 0;
    this.N = N;
    this.timeCompleted = 0;
    this.availableAds = new BinaryHeap((a, b) => {
      if (a.score !== b.score) return a.score > b.score;
      return a.id > b.id; // This is for equal scores case, adding custom own second layer of comp
    });
    this.cooldownAds = new BinaryHeap(
      (a, b) => a.nextAvailableTime < b.nextAvailableTime,
    );
  }

  insertAd(content, score) {
    // No Delay needed, as we add N nextAvailableTime to cooldown items
    const newAd = {
      id: this.idCounter++,
      content,
      score,
    };

    this.availableAds.push(newAd);
  }

  getAd() {
    this.timeCompleted++;

    while (
      this.cooldownAds.size() > 0 &&
      this.cooldownAds.peek().nextAvailableTime <= this.timeCompleted
    ) {
      let readyAd = this.cooldownAds.pop();
      this.availableAds.push({
        id: readyAd.id,
        content: readyAd.content,
        score: readyAd.score,
      });
    }

    if (!this.availableAds.size()) return null;

    let upcomingAd = this.availableAds.pop();

    console.log(
      `Serving: ${upcomingAd.content} (score=${upcomingAd.score}) at epoch=${this.timeCompleted}`,
    );

    if (upcomingAd.score > 1) {
      this.cooldownAds.push({
        ...upcomingAd,
        score: upcomingAd.score - 1,
        nextAvailableTime: this.N + this.timeCompleted,
      });
    }

    return upcomingAd.content;
  }
}
