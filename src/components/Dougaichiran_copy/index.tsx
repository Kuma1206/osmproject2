import React, { useState, useEffect, useRef } from "react";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteField,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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
  thumbnailUrl?: string; // サムネイルURLを追加
}

const Dougaichiran_copy = () => {
  const [videoList, setVideoList] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true); // ローディング状態
  const audioRefs = useRef<HTMLAudioElement[]>([]); // 複数の音声を参照するための配列

  useEffect(() => {
    audioRefs.current = []; // videoListが更新されるたびにaudioRefsをクリア
  }, [videoList]);

  useEffect(() => {
    const fetchVideos = async (userId: string) => {
      const audioCollectionRef = collection(
        firestore,
        `user_audio/${userId}/audio`
      );

      const unsubscribe = onSnapshot(audioCollectionRef, (snapshot) => {
        const videoData = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as VideoData))
          .filter((data) => {
            return data.videoUrl && data.audioUrl; // videoUrlとaudioUrlがあるものだけを表示
          });

        setVideoList(videoData);
        setLoading(false); // ローディング完了
      });

      return () => unsubscribe();
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("ユーザーID:", user.uid); // 確認用ログ
        fetchVideos(user.uid);
      } else {
        setVideoList([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handlePlay = (index: number) => {
    if (audioRefs.current[index]) {
      audioRefs.current[index].play(); // 動画再生時に音声も再生
    }
  };

  const handlePause = (index: number) => {
    if (audioRefs.current[index]) {
      audioRefs.current[index].pause(); // 動画停止時に音声も停止
    }
  };

  const handleDelete = async (videoId: string) => {
    if (window.confirm("削除しますか？")) {
      try {
        const videoDocRef = doc(
          firestore,
          `user_audio/${auth.currentUser?.uid}/audio`,
          videoId
        );

        // FirestoreからaudioURLとvideoURLを削除
        await updateDoc(videoDocRef, {
          audioUrl: deleteField(),
          videoUrl: deleteField(),
        });

        console.log("リンクが削除されました");
      } catch (error) {
        console.error("エラーが発生しました:", error);
      }
    }
  };

  if (loading) {
    return <p>読み込み中...</p>;
  }

  return (
    <div className={styles.mainbox}>
      {videoList.length > 0 ? (
        videoList.map((video, index) => {
          console.log("Link parameters:", {
            videoUrl: video.videoUrl,
            audioUrl: video.audioUrl,
            userId: auth.currentUser?.uid,
            audioDocId: video.id,
          });

          return (
            <div
              id={`movebox-${video.id}`}
              key={video.id}
              className={styles.movebox}
            >
              <Link
                href={{
                  pathname: "/hozondougasaisei",
                  query: {
                    videoUrl: video.videoUrl,
                    audioUrl: video.audioUrl,
                    userId: auth.currentUser?.uid,
                    audioDocId: video.id,
                  },
                }}
                key={video.id}
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

                  <audio
                    ref={(el) => {
                      audioRefs.current[index] = el!;
                    }}
                  >
                    <source src={video.audioUrl} type="audio/wav" />
                    お使いのブラウザは音声タグをサポートしていません。
                  </audio>
                </div>
              </Link>
            </div>
          );
        })
      ) : (
        <p>動画がまだ保存されていません。</p>
      )}
    </div>
  );
};

export default Dougaichiran_copy;
