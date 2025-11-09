import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import { fileURLToPath } from 'url';

// const serviceAccount = JSON.parse(fs.readFileSync(new URL('./serviceAccountKey.json', import.meta.url)));
// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: 'googleapis.com'
};

initializeApp({
  credential: cert(serviceAccount)
})


const db = getFirestore();

export const getReport = async (period, company) => {
  const docRef = db.collection(period).doc(company);
  const doc = await docRef.get();
  return doc.exists ? doc.data() : null;
}
