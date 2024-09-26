import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import styles from "./style.module.scss";
import WeuiClose2Outlined from "@/components/Backbutton";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore"; // Firestoreの関数をインポート
import { db } from "@/firebase/client"; // Firebase初期化設定をインポート

const Usersityougamen = () => {
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const { videoUrl, audioUrl, videoDocId, thumbnailUrl, shortUrl } =
    router.query; // クエリパラメータからshortUrlも取得
  const videoRef = useRef<HTMLVideoElement>(null); // video要素を参照
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null); // 実際に使用する動画URLを保存するステート

  // Firestoreからデータを取得
  useEffect(() => {
    if (router.isReady && videoDocId) {
      const fetchVideoData = async () => {
        try {
          const videoDocRef = doc(db, "videos", videoDocId as string);
          const videoDoc = await getDoc(videoDocRef);

          if (videoDoc.exists()) {
            const data = videoDoc.data();
            setChecked(data.isPublic || false); // FirestoreのisPublicの値を設定

            // 短縮URLが存在する場合はそれを優先して使用し、存在しない場合は通常のURLを使用
            if (shortUrl) {
              setFinalVideoUrl(shortUrl as string);
            } else if (data.videoUrl) {
              setFinalVideoUrl(data.videoUrl as string);
            }
          } else {
            console.error("指定された動画のドキュメントが存在しません。");
          }
        } catch (error) {
          console.error(
            "Firestoreから動画データを取得する際にエラーが発生しました。:",
            error
          );
        }
      };

      fetchVideoData();
    }
  }, [router.isReady, videoDocId, shortUrl]);

  return (
    <>
      <div className={styles.moviebox}>
        {finalVideoUrl ? (
          <>
            <video
              ref={videoRef}
              controls
              width="100%"
              controlsList="nodownload"
              playsInline
              muted={false}
              poster={thumbnailUrl ? (thumbnailUrl as string) : ""} // クエリパラメータから取得したサムネイルを表示
            >
              <source src={finalVideoUrl} type="video/mp4" />
              お使いのブラウザは動画タグをサポートしていません。
            </video>

            {audioUrl ? (
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  zIndex: 10,
                }}
              ></div>
            ) : (
              <p></p>
            )}
          </>
        ) : (
          <p>動画が選択されていません。</p>
        )}
      </div>

      <Link href="/">
        <WeuiClose2Outlined className={styles.backbutton} />
      </Link>
    </>
  );
};

export default Usersityougamen;
