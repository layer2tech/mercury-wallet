// History is a log of all Mercury protocol actions taken by the wallet.

export class ActionLog {
  items: ActionLogItem[];

  constructor() {
    this.items = []
  }

  // Return most recent items up to given depth
  getItems = (depth: number) => {
    return this.items.reverse().slice(0,depth)
  }

  addItem = (statecoin_id: string, action: string) => {
    this.items.push(new ActionLogItem(statecoin_id, action))
  };
}


class ActionLogItem {
  statecoin_id: string;
  action: string;
  date: number;

  constructor(statecoin_id: string, action: string) {
    this.statecoin_id = statecoin_id;
    this.action = action;
    this.date = new Date().getTime();
  }

}
