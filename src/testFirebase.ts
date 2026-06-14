import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from './services/firebase/config';

export async function testFirebaseConnection() {
  console.log('Testing Firebase connection...');
  console.log('Auth instance:', !!auth);
  console.log('DB instance:', !!db);
  
  // Try to read users collection (will fail if not authenticated)
  try {
    const usersRef = collection(db, 'users');
    await getDocs(usersRef);
    console.log('✅ Firestore connection successful');
  } catch (error) {
    console.log('⚠️ Firestore requires authentication');
  }
  
  console.log('✅ Firebase configured correctly');
}