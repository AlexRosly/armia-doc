const { spawn } = require("node:child_process");
const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
process.send({ grandchild: child.pid });
setInterval(() => {}, 1000);
