// History is a log of all Mercury protocol actions taken by the wallet.

'use strict';
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
      activity_log.items.push(Object.assign(log_item, item) as ActivityLogItem)
    })
    return activity_log
  }

  // Return most recent items up to given depth
  getItems(depth: number): ActivityLogItem[] {
    return this.items.sort((a,b) => b.date - a.date).slice(0,depth)
  }

  addItem(shared_key_id: string, action: string) {
    this.items.push(new ActivityLogItem(shared_key_id, action))
  };

  getDate(shared_key_id: string, action: string){

    let item = this.items.filter(item => item.shared_key_id === shared_key_id && item.action === action )
    // filter by action and shared key ID

    if(item.length === 0 && action === ACTION.WITHDRAW){
      // Withdraw action not set in previous wallet versions
      // take "Withdrawing" action as date
      item = this.items.filter(item => item.shared_key_id === shared_key_id && item.action === ACTION.WITHDRAWING )
    }

    if(item.length > 0){
      //return date of first entry
      return item[0].date
    }
    else{
      return "NA"
    }

  }

  static mergeActivityByDate = (activity_data: ActivityLogItem[]): ActivityLogItem[][] => {
    if (!activity_data.length) return [];
    let allActivity: any = {};
    activity_data.forEach(item => {
      let dateStr = new Date(item.date).toLocaleDateString();
      if (allActivity.hasOwnProperty(dateStr)) {
        allActivity[dateStr].push(item as ActivityLogItem);
      } else {
        allActivity[dateStr] = [item as ActivityLogItem];
      }
    })
    let result: ActivityLogItem[][] = Object.values(allActivity);
    return result
  };

  static filterDuplicates = (activity_data: ActivityLogItem[]) => {
    {
      // if there are any objects in here with exactly the same values, they must be a duplicate
      return activity_data.filter((element, index, self) =>
        index === self.findIndex((t) => (
          // check for date, action, funding txid and txvout
          t.date === element.date &&
          t.value === element.value &&
          t.action === element.action &&
          t.funding_txid === element.funding_txid &&
          t.funding_txvout === element.funding_txvout
        ))
      )
    }
  }

}

export class ActivityLogItem {
  shared_key_id: string;
  statecoin_id?: string;
  action: string;
  date: number;
  value?: number;
  funding_txid?: string;
  funding_txvout?: number;

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
