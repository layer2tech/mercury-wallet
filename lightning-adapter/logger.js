const winston = require("winston");

// var fs = require("fs");
// const { join, dirname } = require('path');
// const joinPath = join;

// const rootPath = require('electron-root-path').rootPath;

// const logDir = joinPath(rootPath, "ldk-adapter-log");

// if (!fs.existsSync(logDir.toString())) {
//     fs.mkdirSync(logDir.toString());
//   }

// console.log(`logDir: ${logDir}`);

// const logger = winston.createLogger({
//     level: "debug",
//     format: winston.format.combine(
//       winston.format.json(),
//       winston.format.timestamp({
//         format: "YYYY-MM-DD HH:mm:ss",
//       })
//     ),
//     defaultMeta: { service: "user-service" },
//     transports: [
//       new winston.transports.File({
//         filename: path.join(logDir, "info.log"),
//         level: "info",
//       }),
//       new winston.transports.File({
//         filename: path.join(logDir, "error.log"),
//         level: "error",
//       }),
//       new winston.transports.File({
//         filename: path.join(logDir, "debug.log"),
//         level: "debug",
//       }),
//       new winston.transports.File({
//         filename: path.join(logDir, "combined.log"),
//       }),
//     ],

// });

// const log = (level, message) => {
//     if (logger !== undefined) {
//       logger.log(level, message);
//     }
// };

// module.exports = {
//     logger,
//     log
// }