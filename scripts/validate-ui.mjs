import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

const html = read("index.html");
const js = read("index.js");
const css = read("styles.css");
const config = read("config.js");
const abiText = read("abi.json");

JSON.parse(abiText);

assert(html.includes('id="walletBalance"'), "wallet balance card exists");
assert(html.includes('id="contractUserBalance"'), "user contract balance card exists");
assert(html.includes('id="contractBalance"'), "live contract TVL metric exists");
assert(!html.includes("60.0000 ETH"), "no demo contract balance is present");
assert(html.includes("Live Contract TVL"), "frontend uses a live contract TVL label");
assert(html.includes('id="matrixToggle"'), "matrix view toggle exists");

assert(js.includes("provider.getBalance(userAddress)"), "wallet balance reads from connected wallet");
assert(js.includes("contract.balances(userAddress)"), "contract account balance reads from contract");
assert(js.includes("setText(els.walletBalance"), "wallet balance renders into wallet card");
assert(js.includes("setText(els.contractUserBalance"), "contract account balance renders into contract card");

assert(css.includes(".balance-grid"), "separate balance grid styling exists");
assert(css.includes(".matrix-grid"), "matrix view styling exists");
assert(css.includes(".matrix-mode"), "matrix mode state styling exists");
assert(css.includes(".privacy-grid"), "privacy security panel styling exists");
assert(css.includes(".activity-row"), "safe activity row styling exists");

assert(!/PRIVATE_KEY\s*=|API_KEY\s*=|SECRET\s*=/i.test(config), "config contains no credential assignments");
assert(!/PRIVATE_KEY\s*=|API_KEY\s*=|SECRET\s*=/i.test(js), "frontend JS contains no credential assignments");
assert(!js.includes("console.log("), "frontend does not log customer data to console");
assert(!js.includes("console.error("), "frontend does not log transaction errors to console");
assert(js.includes("sessionStorage.getItem"), "UI preference storage is session-only");
assert(js.includes("contract.deposit({ value })"), "frontend has a real on-chain add-balance flow");

console.log("All Ayu Wallet UI validation checks passed.");
