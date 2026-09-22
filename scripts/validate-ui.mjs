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
assert(html.includes('id="contractBalanceTop"'), "live contract balance is prominent in the top card");
assert(html.includes('25.0000 ETH'), "25 ETH target is displayed separately from live balance");
assert(html.includes('id="contractBalance"'), "live contract TVL metric exists");
assert(!html.includes("60.0000 ETH"), "no demo contract balance is present");
assert(html.includes("Live Contract TVL"), "frontend uses a live contract TVL label");
assert(html.includes('id="preset25Btn"'), "25 ETH real funding preset exists");
assert(html.includes('id="loadHistoryBtn"'), "transaction history load control exists");
assert(html.includes('id="matrixToggle"'), "matrix view toggle exists");

assert(js.includes("provider.getBalance(userAddress)"), "wallet balance reads from connected wallet");
assert(js.includes("contract.balances(userAddress)"), "contract account balance reads from contract");
assert(js.includes("contract.getContractBalance()"), "live contract balance reads from chain");
assert(js.includes("EVENT_TOPICS.deposit"), "history uses explicit deposit event topic");
assert(js.includes("historyNextToBlock"), "history supports older block ranges");
assert(js.includes("setText(els.walletBalance"), "wallet balance renders into wallet card");
assert(js.includes("setText(els.contractUserBalance"), "contract account balance renders into contract card");

assert(css.includes(".balance-grid"), "separate balance grid styling exists");
assert(css.includes(".matrix-grid"), "matrix view styling exists");
assert(css.includes(".matrix-mode"), "matrix mode state styling exists");
assert(css.includes(".privacy-grid"), "privacy security panel styling exists");
assert(css.includes(".activity-row"), "safe activity row styling exists");
assert(css.includes(".contract-submetrics"), "contract account and target remain visually separate");

assert(!/PRIVATE_KEY\s*=|API_KEY\s*=|SECRET\s*=/i.test(config), "config contains no credential assignments");
assert(!/PRIVATE_KEY\s*=|API_KEY\s*=|SECRET\s*=/i.test(js), "frontend JS contains no credential assignments");
assert(!js.includes("console.log("), "frontend does not log customer data to console");
assert(!js.includes("console.error("), "frontend does not log transaction errors to console");
assert(js.includes("sessionStorage.getItem"), "UI preference storage is session-only");
assert(js.includes("contract.deposit({ value })"), "frontend has a real on-chain add-balance flow");
assert(js.includes("ethers.parseEther('25')"), "25 ETH target is calculated from real on-chain TVL");
assert(js.includes("loadHistoryChunk"), "transaction history uses paginated blockchain event loading");

console.log("All Ayu Wallet UI validation checks passed.");


assert(html.includes('id="refreshAllBtn"'), "global refresh button exists");
assert(html.includes('id="systemCheckBtn"'), "system diagnostic button exists");
assert(html.includes('id="viewContractBtn"'), "view contract button exists");
assert(js.includes("runSystemCheck"), "system diagnostic logic exists");
assert(js.includes("provider.getLogs"), "history uses direct log queries");
assert(js.includes("MAX_HISTORY_CHUNKS_PER_CLICK"), "older history has bounded pagination");
assert(js.includes("contract.owner()"), "owner check exists for privileged controls");
assert(js.includes("validateContractAccountAmount"), "withdraw/send balance checks exist");
assert(js.includes("window.open"), "view contract action opens explorer");
assert(css.includes(".status-toolbar"), "diagnostic toolbar styling exists");

assert(js.includes("ensureWalletConnected"), "buttons can request a MetaMask connection");
assert(js.includes("eth_requestAccounts"), "MetaMask transaction actions can request an account");
assert(js.includes("autoConnectIfAuthorized"), "authorized MetaMask sessions auto-connect");
assert(js.includes("Trusted contact removed. Your wallet remains connected."), "remove action removes only the trusted address");
assert(css.includes("button{cursor:pointer}"), "interactive controls use pointer cursor");
assert(html.includes('id="removeContactBtn" type="button"'), "remove address control is an explicit button");
