console.log("main.test.js");
const wtf = require("wtfnode");
const whyRunNodelog = require("why-is-node-running"); // should be your first require

// ... rest of your require statements and such ....

afterAll(async () => {
  wtf.dump();
  whyRunNodelog();
  console.log("process._getActiveHandles()", process._getActiveHandles());
});

describe("main test", () => {
  test("main test", () => {
    expect(1).toBe(1);
  });
});
