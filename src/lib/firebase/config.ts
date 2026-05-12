import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyClZmNCWg8mX7ZBiFdx_ObqK2f7SI25Aec',
  authDomain: 'walter-rivas.firebaseapp.com',
  projectId: 'walter-rivas',
  storageBucket: 'walter-rivas.firebasestorage.app',
  messagingSenderId: '921317837708',
  appId: '1:921317837708:web:dfdd9c170ddce93bb064a9',
  measurementId: 'G-GPFJ55DG3L',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
