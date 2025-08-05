import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

initializeApp({
  credential: cert(serviceAccount)
})

const db = getFirestore()

export const getReport = async (period, company) => {
  const docRef = db.collection(period).doc(company)
  const doc = await docRef.get()
  return doc.exists ? doc.data() : null
}
