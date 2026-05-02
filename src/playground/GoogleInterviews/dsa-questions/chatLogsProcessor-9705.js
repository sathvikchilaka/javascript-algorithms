class ChatLogsProcessor {
  constructor() {
    this.convoContacts = new Map();
    this.mostActiveUser = null;
    this.maxConvoCount = 0;
  }

  makeActiveUser(user) {
    const userSet = this.convoContacts.get(user);

    if (userSet.size >= this.maxConvoCount) {
      this.maxConvoCount = userSet.size;
      this.mostActiveUser = user;
    }
  }

  registerEvent(timestamp, sender, receiver, message) {
    if (!this.convoContacts.has(sender))
      this.convoContacts.set(sender, new Set());
    if (!this.convoContacts.has(receiver))
      this.convoContacts.set(receiver, new Set());

    const senderSet = this.convoContacts.get(sender);
    const receiverSet = this.convoContacts.get(receiver);

    const prevSenderSetCount = senderSet.size;
    const prevReceiverSetCount = receiverSet.size;
    senderSet.add(receiver);
    receiverSet.add(sender);

    if (prevReceiverSetCount !== receiverSet.size)
      this.makeActiveUser(receiver);
    if (prevSenderSetCount !== senderSet.size) this.makeActiveUser(sender);
  }

  getMostActiveUser() {
    return this.mostActiveUser;
  }

  getKMostActiveUsers(k) {
    const res = [...this.convoContacts.entries()]
      .sort(([x, v1], [y, v2]) => v2.size - v1.size)
      .slice(0, k)
      .map(([a, _]) => a);

    return res;
  }
}
