import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteField,
  getDocs,
  deleteDoc,
  Unsubscribe,
} from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "@/firebase/client"; // Firebase初期化コード
import styles from "./style.module.scss";
import Link from "next/link";
import WeuiClose2Outlined from "@/components/Backbutton";

const firestore = getFirestore(app);
const auth = getAuth(app);

interface VideoData {
  id: string;
  mergedVideoUrl: string;
  audioUrl: string;
  userId: string;
  status: string;
  createdAt: number;
  updatedAt?: number;
  thumbnailUrl?: string; // ここに thumbnailUrl プロパティを追加
  isPublic?: boolean;
}

const Dougaichiran = () => {
  const [videoList, setVideoList] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = async (userId: string) => {
    const videoCollectionRef = collection(firestore, "merged_videos");
    const q = query(videoCollectionRef, where("userId", "==", userId));

    // Firestoreのvideosコレクションからデータを取得
    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const videoData = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as VideoData))
        .filter((data) => data.mergedVideoUrl);

      setVideoList(videoData);
      setLoading(false);
    });

    return unsubscribeSnapshot;
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        console.log("User logged in: ", user.uid);
        fetchVideos(user.uid); // ユーザーがログインしている時のみデータを取得
      } else {
        console.log("No user logged in");
        setVideoList([]);
        setLoading(false);
      }
    });

    return () => {
      console.log("Dougaichiran component unmounted.");
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []); // 空の依存配列により、初回マウント時にのみ実行される

  const handleDelete = async (videoId: string, videoUrl: string) => {
    if (window.confirm("削除しますか？")) {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.error("ログインが必要です。");
          return;
        }

        // 1. Firestore の merged_videos コレクション内の該当ドキュメントを削除
        const videoDocRef = doc(firestore, "merged_videos", videoId);
        const videoDoc = await getDoc(videoDocRef);
        await deleteDoc(videoDocRef);

        // 2. Firestore の user_audio コレクション内の該当ドキュメントを削除
        const audioQuery = query(
          collection(firestore, "user_audio"),
          where("videoId", "==", videoId)
        );

        const audioSnapshot = await getDocs(audioQuery);
        audioSnapshot.forEach(async (audioDoc) => {
          await deleteDoc(doc(firestore, "user_audio", audioDoc.id));
        });

        // 3. Firebase Storage の merged_videos フォルダ内の該当動画データを削除
        const storage = getStorage(app);
        const videoRef = ref(storage, videoUrl); // videoUrl を使って Firebase Storage の参照を取得
        await deleteObject(videoRef);

        // 4. Firebase Storage の user_audio フォルダ内の該当音声データを削除
        audioSnapshot.forEach(async (audioDoc) => {
          const audioData = audioDoc.data();
          const audioStorageRef = ref(storage, audioData.audioUrl);
          await deleteObject(audioStorageRef);
        });

        // 4. thumbnails フォルダからサムネイルを削除
        const thumbnailUrl = videoDoc.data()?.thumbnailUrl;
        if (thumbnailUrl) {
          const thumbnailRef = ref(storage, thumbnailUrl);
          await deleteObject(thumbnailRef);
        }

        console.log("動画と関連する音声データが削除されました。");
      } catch (error) {
        console.error("エラーが発生しました。:", error);
      }
    }
  };

  if (loading) {
    return <p>読み込み中...</p>;
  }

  return (
    <div className={styles.mainbox}>
      {videoList.length > 0 ? (
        videoList.map((video) => (
          <div
            id={`movebox-${video.id}`}
            key={video.id}
            className={styles.movebox}
          >
            <Link
              href={{
                pathname: "/hozondougasaisei_copy",
                query: {
                  userId: auth.currentUser?.uid, // ユーザーIDを追加
                  videoUrl: video.mergedVideoUrl,
                  videoDocId: video.id, // videoDocIdをクエリパラメータとして追加
                  isPublic: video.isPublic, // isPublic プロパティを追加
                },
              }}
            >
              <div
                style={{ width: "100%", height: "100%", overflow: "hidden" }}
              >
                <div
                  className={styles.backbutton}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(video.id, video.mergedVideoUrl);
                  }}
                >
                  <WeuiClose2Outlined />
                </div>

                {/* サムネイル表示 */}
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt="サムネイル"
                    width="100%"
                    height="100%"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <p>サムネイルがありません</p>
                )}
              </div>
            </Link>
          </div>
        ))
      ) : (
        <p>動画がまだ保存されていません。</p>
      )}
    </div>
  );
};

export default Dougaichiran;
