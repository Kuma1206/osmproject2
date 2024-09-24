import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (getApps().length === 0) {
  // Firebaseアプリの初期化
  initializeApp(firebaseConfig);
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp(); 

// Firebase関連機能をエクスポート
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const functions = getFunctions(app); // 必要に応じてリージョン指定も可能

// FirestoreにisPublicフィールドを追加・更新する関数
export const updateIsPublic = async (docPath: string, isPublic: boolean) => {
  const docRef = doc(db, docPath);

  try {
    // FirestoreドキュメントにisPublicフィールドを追加または更新
    await updateDoc(docRef, {
      isPublic: isPublic,
    });
    console.log('isPublicフィールドが正常に保存されました。');
  } catch (error) {
    console.error('isPublicの保存中にエラーが発生しました。:', error);
  }
};

// 音声ファイルをアップロードし、そのURLを取得して Firestore に保存
// 音声ファイルをアップロードし、そのURLを取得して Firestore に動画リンクとユーザー情報も保存
export const uploadAudioAndSaveUrl = async (
  file: File,
  userId: string,
  videoId: string,
  videoUrl: string
) => {
  try {
    // Upload audio file to Firebase Storage
    const audioFileName = `audio/${userId}/${Date.now()}_${file.name}`;
    const audioRef = ref(storage, audioFileName);
    
    await uploadBytes(audioRef, file);
    
    // Get the download URL of the uploaded file
    const audioUrl = await getDownloadURL(audioRef);
    
    console.log('Audio URL obtained:', audioUrl);

    // Save audio URL, video link, and user info to Firestore
    const videoDocRef = doc(db, 'videos', videoId);

    try {
      await updateDoc(videoDocRef, {
        audioUrl: audioUrl,
        videoUrl: videoUrl,
        userId: userId,
      });
      console.log('Audio URL, video link, and user ID saved to Firestore:', audioUrl);
    } catch (firestoreError) {
      console.error('Error saving audio information to Firestore:', firestoreError);
      throw firestoreError;
    }

    return audioUrl;
  } catch (error) {
    console.error('Error occurred while uploading audio:', error);
    throw error;
  }
};



// 画像をアップロードしてそのURLを返す関数を定義
export const uploadProfileImage = async (file: File): Promise<string> => {
  const storageRef = ref(storage, `profile_images/${file.name}`);
  
  // Firebase Storage に画像をアップロード
  await uploadBytes(storageRef, file);

  // アップロードされた画像のダウンロードURLを取得
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
};

/**
 * 動画をStorageから削除し、対応するFirestoreのドキュメントも削除する
 * @param {string} storagePath - Storageの動画パス
 * @param {string} firestoreDocPath - Firestoreのドキュメントパス
 */
export const deleteVideoAndDocument = async (storagePath: string, firestoreDocPath: string) => {
  const videoRef = ref(storage, storagePath);
  const docRef = doc(db, firestoreDocPath);

  try {
    // Storageから動画を削除
    await deleteObject(videoRef);
    console.log('Storageから動画を削除しました。');

    // Firestoreからドキュメントを削除
    await deleteDoc(docRef);
    console.log('Firestoreから対応するドキュメントを削除しました。');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  }
};

export { app };