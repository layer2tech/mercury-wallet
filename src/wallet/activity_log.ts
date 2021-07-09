// History is a log of all Mercury protocol actions taken by the wallet.

export class ActivityLog {
  items: ActivityLogItem[];

  constructor() {
    this.items = []
  }

  static fromJSON(activity_json: ActivityLog): ActivityLog {
    let activity_log = new ActivityLog()
    activity_json.items.forEach((item: ActivityLogItem) => {
      let log_item = new ActivityLogItem(item.statecoin_id, item.action);
      activity_log.items.push(Object.assign(log_item, item))
    })
    return activity_log
  }

  // Return most recent items up to given depth
  getItems(depth: number) {
    return this.items.reverse().slice(0,depth)
  }

  addItem(statecoin_id: string, action: string) {
    this.items.push(new ActivityLogItem(statecoin_id, action))
  };
}


export class ActivityLogItem {
  statecoin_id: string;
  action: string;
  date: number;

  constructor(statecoin_id: string, action: string) {
    this.statecoin_id = statecoin_id;
    this.action = action;
    this.date = new Date().getTime();
  }
}

export const ACTION = {
   INITIATE: "I",  
   DEPOSIT: "D",
   TRANSFER: "T",
   WITHDRAW: "W",
   SWAP: "S",
   EXPIRED: "E",
};
Object.freeze(ACTION);
