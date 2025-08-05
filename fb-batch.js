const admin = require("firebase-admin");
const fs = require("fs");

// Ініціалізація Firebase
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Завантаження звітності
const data = JSON.parse(fs.readFileSync("./MID_12_2024.json"));

async function uploadReports() {
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let counter = 0;

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
uploadReports().catch(console.error);
