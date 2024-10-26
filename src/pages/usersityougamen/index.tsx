import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import styles from "./style.module.scss";
import WeuiClose2Outlined from "@/components/Backbutton";
import Link from "next/link";

const Usersityougamen = () => {
  const router = useRouter();
  const { mergedVideoUrl, thumbnailUrl, shortUrl } = router.query; // クエリパラメータから取得
  const videoRef = useRef<HTMLVideoElement>(null); // video要素を参照

  useEffect(() => {
    console.log("Received videoUrl:", mergedVideoUrl); // videoUrl をログに出力
    console.log("Received shortUrl:", shortUrl); // shortUrl をログに出力
  }, [mergedVideoUrl, shortUrl]);

  return (
    <>
      <div className={styles.moviebox}>
        {mergedVideoUrl ? (
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
              <source src={mergedVideoUrl as string} type="video/mp4" />
              お使いのブラウザは動画タグをサポートしていません。
            </video>
          </>
        ) : (
          <p>動画が選択されていません。</p>
        )}
      </div>

      <a href={shortUrl as string} target="_blank" rel="noopener noreferrer">
        この動画の短縮URLを開く
      </a>

      <Link href="/">
        <WeuiClose2Outlined className={styles.backbutton} />
      </Link>
    </>
  );
};

export default Usersityougamen;
