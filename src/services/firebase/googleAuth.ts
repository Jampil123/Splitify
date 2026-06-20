import { GoogleAuthProvider, auth, db, doc, getDoc, signInWithCredential } from './config';
import { createUserDocument, updateUserLastLogin } from './auth';

export async function signInWithGoogleCredential(idToken: string | null, accessToken: string | null) {
  try {
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    const result = await signInWithCredential(auth, credential);
    const user = result.user;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      await createUserDocument(user.uid, {
        email: user.email!,
        fullName: user.displayName || '',
        photoURL: user.photoURL,
      });
    } else {
      await updateUserLastLogin(user.uid);
    }

    return { success: true, user, error: null };
  } catch (error: any) {
    return { success: false, user: null, error: error.message };
  }
}
