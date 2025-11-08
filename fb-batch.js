import fs from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(
  fs.readFileSync("serviceAccountKey.json", "utf8")
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// Завантаження звітності

async function uploadReports(fileJSON) {
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let counter = 0;

  const json = fs.readFileSync(fileJSON, "utf8");

  const data = JSON.parse(json);

  for (const item of data) {
    const { TIN, Y, M, ...reportData } = item;

    if (!TIN || typeof TIN !== "string") {
      console.warn("Пропущено запис — некоректний TIN:", item);
      continue;
    }
    const collectionName = `rep_${Y}_${M}`;
    const docRef = db.collection(collectionName).doc(TIN);

    batch.set(docRef, {
      TIN,
      Y,
      M,
      ...reportData,
    });

    counter++;

    // Кожні 500 — коммітимо батч
    if (counter % BATCH_SIZE === 0) {
      await batch.commit();
      console.log(`Committed ${counter} documents...`);
      batch = db.batch(); // новий батч
    }
  }

  // Закриваємо останній батч
  if (counter % BATCH_SIZE !== 0) {
    await batch.commit();
    console.log(`Final batch committed (${counter % BATCH_SIZE} docs)`);
  }

  console.log("✅ Завантаження завершено");
}

function checkArr() {
  for (const item of data) {
    const { TIN, FN } = item;
    if (!TIN) {
      console.warn("Пропущено запис — некоректний TIN:", FN);
    }
  }
}
// checkArr();
uploadReports("NEW_MID_06_2025.json").catch(console.error);
