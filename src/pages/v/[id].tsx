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
import styles from "./style.module.scss"; // スタイルシートのパスを適宜調整
import WeuiClose2Outlined from "@/components/Backbutton";
import Link from "next/link";

const VideoRedirect = () => {
  const router = useRouter();
  const { id } = router.query; // 動的ルートからIDを取得
  const [videoUrl, setVideoUrl] = useState<string | null>(null); // 動画URLを保存
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null); // サムネイルを保存
  const [shortUrl, setShortUrl] = useState<string | null>(null); // 短縮URLを保存
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideoData = async () => {
      if (router.isReady && id) {
        console.log("Router Query ID (from dynamic route):", id); // ここでIDが取得できているか確認

        const videoDocId = Array.isArray(id) ? id[0] : id; // ルートからのidを取得
        console.log("Video Doc ID for Firestore query:", videoDocId); // 取得したIDが正しいか確認

        try {
          // 短縮URLから動画ドキュメントを取得するクエリ
          const videosCollectionRef = collection(db, "user_videos");
          const q = query(
            videosCollectionRef,
            where(
              "shortUrl",
              "==",
              `https://osmproject.vercel.app/v/${videoDocId}`
            )
          );

          const videoSnapshot = await getDocs(q);

          if (!videoSnapshot.empty) {
            // ドキュメントが見つかった場合
            videoSnapshot.forEach((doc) => {
              const data = doc.data();
              console.log("Video document exists:", data);
              setVideoUrl(data.videoUrl);
              setThumbnailUrl(data.thumbnailUrl || null);
              setShortUrl(data.shortUrl || null);

              // URLタブにshortUrlを表示させる（コンテンツはそのまま保持）
              if (data.shortUrl) {
                console.log(
                  "Short URL to display in the address bar:",
                  data.shortUrl
                );
                if (data.shortUrl !== window.location.href) {
                  router.replace(data.shortUrl); // URLタブだけを変更
                }
              }
            });
          } else {
            console.error("No video found for the provided short URL."); // ドキュメントが見つからない場合
            router.push("/404"); // 404ページへリダイレクト
          }
        } catch (error) {
          console.error("Firestoreからデータを取得できませんでした:", error); // Firestoreからの取得に失敗した場合
          router.push("/404"); // 404ページにリダイレクト
        } finally {
          setLoading(false);
        }
      }
    };

    fetchVideoData();
  }, [id, router.isReady]);

  if (loading) {
    return <p>読み込み中...</p>; // ローディング状態を表示
  }

  return (
    <>
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

      {/* videoUrlを画面上に表示して確認する */}
      <p>Video URL: {videoUrl}</p>

      {/* 外部リンクは <a> タグを使用して表示 */}
      {shortUrl && (
        <a href={shortUrl} target="_blank" rel="noopener noreferrer">
          この動画の短縮URLを開く
        </a>
      )}

      <Link href="/">
        <WeuiClose2Outlined className={styles.backbutton} />
      </Link>
    </>
  );
};

export default VideoRedirect;
