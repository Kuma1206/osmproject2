import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebase/client"; // Firebaseの初期化
import styles from "../style.module.scss"; // スタイルシートのパスを適宜調整

const VideoRedirect = () => {
  const router = useRouter();
  const { id } = router.query; // 動的ルートからIDを取得
  const [videoUrl, setVideoUrl] = useState<string | null>(null); // 動画URLを保存
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null); // サムネイルを保存
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideoData = async () => {
      if (id) {
        // `id` が配列型か単一の文字列型か確認
        const shortId = Array.isArray(id) ? id[0] : id;
        console.log("Short ID for query:", shortId);

        try {
          // Firestoreのvideosコレクションから短縮URL（shortUrl）に基づいて動画データを取得
          const videosCollectionRef = collection(db, "videos");
          const q = query(
            videosCollectionRef,
            where(
              "shortUrl",
              "==",
              `https://osmproject.vercel.app/v/${shortId}`
            )
          );

          console.log(
            `Executing Firestore query for shortUrl: https://osmproject.vercel.app/v/${shortId}`
          );

          const videoSnapshot = await getDocs(q);

          if (!videoSnapshot.empty) {
            console.log("Found documents matching shortUrl query.");
            // 短縮URLに対応する動画データを取得
            videoSnapshot.forEach((doc) => {
              const data = doc.data();
              console.log("Document data:", data);
              setVideoUrl(data.videoUrl);
              setThumbnailUrl(data.thumbnailUrl || null);
            });
          } else {
            console.error("No documents found matching the shortUrl query.");
            // 短縮URLが見つからない場合は、通常の動画URLを取得
            const videoDocRef = doc(db, "videos", shortId); // FirestoreのドキュメントIDとして扱う
            const videoDoc = await getDoc(videoDocRef);

            if (videoDoc.exists()) {
              const data = videoDoc.data();
              setVideoUrl(data.videoUrl);
              setThumbnailUrl(data.thumbnailUrl || null);
            } else {
              console.error("指定された動画のドキュメントが存在しません。");
              router.push("/404"); // 動画がない場合は404ページへリダイレクト
            }
          }
        } catch (error) {
          console.error("Firestoreからデータを取得できませんでした:", error);
          router.push("/404"); // エラー時も404ページへリダイレクト
        } finally {
          setLoading(false);
        }
      }
    };

    fetchVideoData();
  }, [id, router]);

  if (loading) {
    return <p>読み込み中...</p>; // ローディング状態を表示
  }

  return (
    <div className={styles.moviebox}>
      {videoUrl ? (
        <video
          controls
          width="100%"
          controlsList="nodownload"
          playsInline
          muted={false}
          poster={thumbnailUrl ? thumbnailUrl : ""} // サムネイルを表示
        >
          <source src={videoUrl} type="video/mp4" />
          お使いのブラウザはvideoタグをサポートしていません。
        </video>
      ) : (
        <p>動画が選択されていません。</p>
      )}
    </div>
  );
};

export default VideoRedirect;
