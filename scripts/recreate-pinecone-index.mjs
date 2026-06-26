/**
 * Recreate the Pinecone index to match OpenAI embeddings.
 *
 * WHY THIS EXISTS:
 * The project originally used Hugging Face embeddings (768 dimensions).
 * We migrated to OpenAI `text-embedding-3-small`, which outputs 1536 dimensions.
 * A Pinecone index has a FIXED dimension set at creation time, so the only way
 * to switch embedding models with a different size is to recreate the index.
 *
 * This script is idempotent and safe to re-run:
 *   - If the index already has the correct dimension, it does nothing.
 *   - Otherwise it deletes the old index and creates a fresh one at 1536 dims.
 *
 * Run with:  node --env-file=.env scripts/recreate-pinecone-index.mjs
 */
import { Pinecone } from "@pinecone-database/pinecone";

const TARGET_DIMENSION = 1536; // OpenAI text-embedding-3-small
const METRIC = "cosine";
const CLOUD = "aws";
const REGION = "us-east-1";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const indexName = process.env.PINECONE_INDEX;

if (!indexName) {
  console.error("PINECONE_INDEX is not set in your environment.");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wait until describeIndex throws (index fully deleted) or times out. */
async function waitUntilDeleted(name) {
  for (let i = 0; i < 30; i++) {
    try {
      await pc.describeIndex(name);
      await sleep(2000);
    } catch {
      return; // describeIndex failed => index is gone
    }
  }
  throw new Error(`Timed out waiting for "${name}" to be deleted.`);
}

/** Wait until the index reports a Ready state. */
async function waitUntilReady(name) {
  for (let i = 0; i < 30; i++) {
    const desc = await pc.describeIndex(name);
    if (desc.status?.ready) return desc;
    await sleep(2000);
  }
  throw new Error(`Timed out waiting for "${name}" to become ready.`);
}

async function createIndex(name) {
  console.log(`Creating index "${name}" at ${TARGET_DIMENSION} dimensions...`);
  await pc.createIndex({
    name,
    dimension: TARGET_DIMENSION,
    metric: METRIC,
    spec: { serverless: { cloud: CLOUD, region: REGION } },
  });
  const ready = await waitUntilReady(name);
  console.log(`Index "${name}" is ready.`);
  return ready;
}

async function main() {
  let existing = null;
  try {
    existing = await pc.describeIndex(indexName);
  } catch {
    existing = null; // index does not exist yet
  }

  if (existing && existing.dimension === TARGET_DIMENSION) {
    console.log(
      `Index "${indexName}" already has dimension ${TARGET_DIMENSION}. Nothing to do.`
    );
    return;
  }

  if (existing) {
    console.log(
      `Index "${indexName}" has dimension ${existing.dimension}, expected ${TARGET_DIMENSION}.`
    );
    console.log(`Deleting old index "${indexName}"...`);
    await pc.deleteIndex(indexName);
    await waitUntilDeleted(indexName);
    console.log("Old index deleted.");
  }

  await createIndex(indexName);
  console.log("Migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err?.message || err);
  process.exit(1);
});
