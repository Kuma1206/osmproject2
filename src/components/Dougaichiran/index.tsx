import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  deleteDoc,
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
  videoUrl: string;
  audioUrl: string;
  userId: string;
  createdAt: number;
  thumbnailUrl?: string;
  isPublic?: boolean;
}

const Dougaichiran = () => {
  const [videoList, setVideoList] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = async (userId: string) => {
    const audioCollectionRef = collection(
      firestore,
      `user_audio/${userId}/audio`
    );

    console.log("Firestore query: ", audioCollectionRef);

    // Firestoreのuser_audioコレクションからデータを取得
    const unsubscribeSnapshot = onSnapshot(audioCollectionRef, (snapshot) => {
      const videoData = snapshot.docs
        .map((doc) => {
          console.log("Document data: ", doc.data());
          return { id: doc.id, ...doc.data() } as VideoData;
        })
        .filter((data) => data.videoUrl); // videoUrlが存在するデータのみをフィルタ

      console.log("Filtered video data: ", videoData);

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
  }, []);

  const handleDelete = async (videoId: string, videoUrl: string) => {
    if (window.confirm("削除しますか？")) {
      try {
        const videoDocRef = doc(
          firestore,
          `user_audio/${auth.currentUser?.uid}/audio`,
          videoId
        );

        // Firestoreからドキュメントを削除
        await deleteDoc(videoDocRef);

        // Firebase Storageから動画ファイルを削除
        const storage = getStorage();
        const videoRef = ref(storage, videoUrl);
        await deleteObject(videoRef);

        console.log("ドキュメントと動画ファイルが削除されました。");
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
                  audioUrl: video.audioUrl, // audioUrl も追加
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
                    handleDelete(video.id, video.videoUrl); // videoUrlを追加で渡す
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
