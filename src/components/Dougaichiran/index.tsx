import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteField,
  Unsubscribe,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "@/firebase/client"; // Firebase初期化コード
import styles from "./style.module.scss";
import Link from "next/link";
import WeuiClose2Outlined from "@/components/Backbutton";

const firestore = getFirestore(app);
const auth = getAuth(app);

interface VideoData {
  id: string;
  videoUrl: string;
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
      const videoCollectionRef = collection(firestore, "videos");
      const q = query(videoCollectionRef, where("userId", "==", userId));

      // Firestoreのvideosコレクションからデータを取得
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const videoData = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as VideoData))
          .filter((data) => data.videoUrl);

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

  const handleDelete = async (videoId: string) => {
    if (window.confirm("削除しますか？")) {
      try {
        const videoDocRef = doc(firestore, "videos", videoId);

        // FirestoreからvideoUrlとthumbnailUrlを削除
        await updateDoc(videoDocRef, {
          videoUrl: deleteField(),
          audioUrl: deleteField(), // audioUrlも削除
        });

        console.log("リンクと動画が削除されました。");
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
                pathname: "/hozondougasaisei",
                query: {
                  userId: auth.currentUser?.uid, // ユーザーIDを追加
                  videoUrl: video.videoUrl,
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
                    handleDelete(video.id);
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
