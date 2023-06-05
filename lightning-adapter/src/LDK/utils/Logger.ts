import chalk, { ChalkInstance } from "chalk";

export enum ChalkColor {
  Green = "green",
  Yellow = "yellow",
  Magenta = "magenta",
  Blue = "blue",
  Red = "red",
  Cyan = "cyan",
  bgCyan = "bgCyan",
}

export class Logger {
  color: ChalkColor;
  filename: any;

  getColor(): ChalkColor {
    return this.color;
  }

  constructor(color: ChalkColor, filename: string) {
    this.color = color;
    this.filename = filename;
  }

  logD(msg: string = "", data = "") {
    const chalkColor = this.getColor();
    console.log(chalk[chalkColor](`[${this.filename}]: ${msg} ${data}`));
  }

  log(msg: string = "", func: string = "", data: any = "") {
    const chalkColor = this.getColor();

    if (func === "") {
      console.log(chalk[chalkColor](`[${this.filename}]: ${msg} ${data}`));
    } else {
      console.log(
        chalk[chalkColor](`[${this.filename}/${func}]: ${msg} ${data}`)
      );
    }
  }

  err(msg: string, err: any = "") {
    console.log(chalk.red(msg + err));
  }
}
