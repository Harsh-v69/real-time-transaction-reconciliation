const axios = require("axios");

// ================= CONFIG =================
const INGEST_URL = "http://localhost:5000/ingest";

const args = process.argv.slice(2);
const scenario =
  args.find(a => a.startsWith("--scenario="))?.split("=")[1] || "perfect_match";
const count =
  parseInt(args.find(a => a.startsWith("--count="))?.split("=")[1]) || 1;
const chaos =
  args.find(a => a === "--chaos") ? true : false;
const load =
  args.find(a => a === "--load") ? true : false;

const sleep = ms => new Promise(res => setTimeout(res, ms));

const log = (scenario, msg) => {
  console.log(`[SCENARIO: ${scenario.toUpperCase()}] ${msg}`);
};

// ============== HELPERS ===================
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomStatus() {
  return Math.random() < 0.9 ? "SUCCESS" : "FAILED";
}

function jitter(base, variance = 300) {
  return base + rand(0, variance);
}

// ============== EVENT SENDER ==============
async function sendEvent(
  scenario,
  txnId,
  source,
  amount,
  status,
  delayMs = 0
) {
  await sleep(delayMs);

  const payload = {
    transaction_id: txnId,
    amount,
    status,
    source,
    timestamp: new Date().toISOString(),
    meta: {
      test_case: scenario
    }
  };

  await axios.post(INGEST_URL, payload);
}


// ================= SCENARIOS =================

async function perfectMatch(txnId) {
  await sendEvent("perfect_match", txnId, "merchant", 500, "SUCCESS", jitter(0));
  await sendEvent("perfect_match", txnId, "gateway", 500, "SUCCESS", jitter(400));
  await sendEvent("perfect_match", txnId, "bank", 500, "SUCCESS", jitter(800));
}

async function amountMismatch(txnId) {
  await sendEvent("amount_mismatch", txnId, "merchant", 500, "SUCCESS", jitter(0));
  await sendEvent("amount_mismatch", txnId, "gateway", 500, "SUCCESS", jitter(400));
  await sendEvent("amount_mismatch", txnId, "bank", rand(450, 495), "SUCCESS", jitter(800));
}

async function delayedBank(txnId) {
  await sendEvent("delayed_bank", txnId, "merchant", 500, "SUCCESS", 0);
  await sendEvent("delayed_bank", txnId, "gateway", 500, "SUCCESS", 300);
  await sendEvent("delayed_bank", txnId, "bank", 500, "SUCCESS", rand(10000, 30000));
}

async function missingEvent(txnId) {
  await sendEvent("missing_event", txnId, "merchant", 500, "SUCCESS", jitter(0));
  await sendEvent("missing_event", txnId, "gateway", 500, "SUCCESS", jitter(400));
}

async function duplicateEvent(txnId) {
  await sendEvent("duplicate_event", txnId, "merchant", 500, "SUCCESS", 0);
  await sendEvent("duplicate_event", txnId, "gateway", 500, "SUCCESS", 300);
  await sendEvent("duplicate_event", txnId, "gateway", 500, "SUCCESS", 600);
  await sendEvent("duplicate_event", txnId, "bank", 500, "SUCCESS", 900);
}

async function statusConflict(txnId) {
  await sendEvent("status_conflict", txnId, "merchant", 500, "SUCCESS", jitter(0));
  await sendEvent("status_conflict", txnId, "gateway", 500, "SUCCESS", jitter(400));
  await sendEvent("status_conflict", txnId, "bank", 500, "FAILED", jitter(800));
}

// ============== CHAOS MODE =================
async function chaosMode(txnId) {
  const baseAmount = rand(100, 5000);

  const merchant = {
    amount: baseAmount,
    status: randomStatus()
  };

  const gateway = {
    amount: Math.random() < 0.85 ? baseAmount : baseAmount - rand(1, 50),
    status: randomStatus()
  };

  const bank = {
    amount: Math.random() < 0.8 ? baseAmount : baseAmount - rand(1, 100),
    status: randomStatus()
  };

  await sendEvent("chaos", txnId, "merchant", merchant.amount, merchant.status, rand(0, 500));
  await sendEvent("chaos", txnId, "gateway", gateway.amount, gateway.status, rand(200, 1000));

  if (Math.random() > 0.15) {
    await sendEvent("chaos", txnId, "bank", bank.amount, bank.status, rand(5000, 20000));
  }
}

// ============== SCENARIO MAP ==============
const SCENARIOS = {
  perfect_match: perfectMatch,
  amount_mismatch: amountMismatch,
  delayed_bank: delayedBank,
  missing_event: missingEvent,
  duplicate_event: duplicateEvent,
  status_conflict: statusConflict
};

// ================= RUNNER =================
async function run() {
  log(scenario, `Starting simulation | count=${count}`);

  if (chaos) {
    for (let i = 1; i <= count; i++) {
      const txnId = `CHAOS_${Date.now()}_${i}`;
      chaosMode(txnId);
      if (!load) await sleep(50);
    }
    return;
  }

  for (let i = 1; i <= count; i++) {
    const txnId = `TXN_${Date.now()}_${i}`;

    if (scenario === "all") {
      for (const [name, fn] of Object.entries(SCENARIOS)) {
        await fn(`${txnId}_${name}`);
      }
    } else {
      const fn = SCENARIOS[scenario];
      if (!fn) {
        console.error("❌ Unknown scenario:", scenario);
        process.exit(1);
      }
      fn(txnId);
    }

    if (!load) await sleep(100);
  }

  log(scenario, "Simulation complete");
}

run();
