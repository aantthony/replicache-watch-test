import { nanoid } from "nanoid";
import {
  type PullerResultV1,
  type ReadonlyJSONValue,
  Replicache,
  TEST_LICENSE_KEY,
  type WriteTransaction,
} from "replicache";

const logEl = document.getElementById("log");
if (!logEl) {
  throw new Error("No log element");
}

function log(msg: string): void {
  const node = document.createElement("div");
  node.textContent = msg;
  logEl?.appendChild(node);
}

const rep = new Replicache({
  name: "test",
  licenseKey: TEST_LICENSE_KEY,
  mutators: {
    async update(
      tx: WriteTransaction,
      changes: Record<string, ReadonlyJSONValue>,
    ) {
      for (const [key, value] of Object.entries(changes)) {
        await tx.set(key, value);
      }
    },
  },
  puller: async (): Promise<PullerResultV1> => {
    return {
      httpRequestInfo: {
        httpStatusCode: 200,
        errorMessage: "",
      },
      response: {
        cookie: 0,
        patch: [],
        lastMutationIDChanges: {},
      },
    };
  },
  pusher: async () => {
    return {
      httpRequestInfo: {
        httpStatusCode: 200,
        errorMessage: "",
      },
    };
  },
  indexes: {
    idx1: {
      prefix: "example/",
      jsonPointer: "/name",
      allowEmpty: true,
    },
  },
});

async function testUpdate() {
  const newName = nanoid();

  const keys: string[] = [];
  for (let i = 0; i < 10; i++) {
    keys.push(`example/${i}`);
  }

  const watchPrefix = newName;

  // watch for changes matching the .name field:
  const watch = rep.experimentalWatch(
    (diffs) => {
      log(`Watch: Received ${diffs.length} diffs`);
    },
    {
      indexName: "idx1",
      prefix: watchPrefix, //.substring(0, watchPrefix.length - 1),
    },
  );

  log(`while watching for ${watchPrefix}, updating ${keys}`);

  // now update the database:
  await rep.mutate.update(
    Object.fromEntries(keys.map((k) => [k, { name: newName }])),
  );

  await new Promise((resolve) => {
    setTimeout(resolve, 100);
  });

  log("Waiting for watch to close");
  watch();
}

document.getElementById("btn")?.addEventListener("click", testUpdate);
