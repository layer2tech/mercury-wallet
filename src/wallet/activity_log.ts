// History is a log of all Mercury protocol actions taken by the wallet.

import { constants } from "perf_hooks";
import { textSpanIsEmpty } from "typescript";


export class ActivityLog {
  items: ActivityLogItem[];

  constructor() {
    this.items = []
  }

  static fromJSON(activity_json: ActivityLog): ActivityLog {
    let activity_log = new ActivityLog()
    activity_json.items.forEach((item: ActivityLogItem) => {
      //Rename key from statecoin_id to shared_key_id
      if (item?.statecoin_id) {
        delete Object.assign(item, { shared_key_id: item.statecoin_id })['statecoin_id'];
      }
    
      let log_item = new ActivityLogItem(item.shared_key_id, item.action);
      activity_log.items.push(Object.assign(log_item, item))
    })
    return activity_log
  }

  // Return most recent items up to given depth
  getItems(depth: number) {
    return this.items.sort((a,b) => b.date - a.date).slice(0,depth)
  }

  addItem(shared_key_id: string, action: string) {
    this.items.push(new ActivityLogItem(shared_key_id, action))
  };
}

export class ActivityLogItem {
  shared_key_id: string;
  statecoin_id?: string;
  action: string;
  date: number;

  constructor(shared_key_id: string, action: string) {
    this.shared_key_id = shared_key_id;
    this.action = action;
    this.date = new Date().getTime();
    this.statecoin_id = undefined
  }
}

export const ACTION = {
   INITIATE: "I",  
   DEPOSIT: "D",
   TRANSFER: "T",
   WITHDRAW: "W",
   WITHDRAWING: "G",
   SWAP: "S",
   EXPIRED: "E",
   RECEIVED: "R"
};
Object.freeze(ACTION);
