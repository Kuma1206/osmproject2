import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import styles from "./style.module.scss";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import Link from "next/link";
import { db } from "@/firebase/client"; // Firebaseの初期化設定をインポート

const Slider1 = () => {
  const [videos, setVideos] = useState<any[]>([]); // 動画データを格納するステート

  // Firestoreから動画リンクを取得
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        console.log("Fetching public videos...");

        // FirestoreのvideosコレクションからisPublicがtrueのドキュメントを取得
        const videosCollectionRef = collection(db, "videos");
        // クエリに orderBy を追加
        const videosQuery = query(
          videosCollectionRef,
          where("isPublic", "==", true),
          orderBy("createdAt", "desc") // 投稿日の降順でソート
        );

        // Firestoreクエリの結果取得
        const videoSnapshot = await getDocs(videosQuery);

        if (videoSnapshot.empty) {
          console.log("No public videos found.");
          return;
        }

        const allPublicVideos: any[] = [];

        // 公開されている動画データを取得
        videoSnapshot.forEach((doc) => {
          const videoData = doc.data();
          console.log("Video document data:", videoData); // クエリ結果をログ出力

          if (videoData.videoUrl) {
            // 短縮URLがあれば使用、なければ通常のURLを使う
            const videoLink =
              videoData.shortUrl ||
              `/usersityougamen?videoUrl=${encodeURIComponent(
                videoData.videoUrl
              )}&videoDocId=${doc.id}`;

            allPublicVideos.push({
              videoUrl: videoData.videoUrl,
              shortUrl: videoLink, // 短縮URLまたは通常のURLを保存
              videoDocId: doc.id,
              thumbnailUrl: videoData.thumbnailUrl || "", // サムネイルURLも追加
            });
            console.log("Video URL added:", videoLink);
          } else {
            console.log("No videoUrl found for document");
          }
        });

        // 公開動画データをステートに保存
        setVideos(allPublicVideos);
        console.log(`Total public videos found: ${allPublicVideos.length}`);
      } catch (error) {
        console.error("Error fetching video data:", error);
      }
    };

    fetchVideos();
  }, []);

  const responsive = {
    superLargeDesktop: { breakpoint: { max: 4000, min: 3000 }, items: 5 },
    desktop: { breakpoint: { max: 3000, min: 1024 }, items: 3 },
    tablet: { breakpoint: { max: 1024, min: 464 }, items: 2 },
    mobile: { breakpoint: { max: 464, min: 0 }, items: 1 },
  };

  return (
    <div className={styles.menubox}>
      <p className={styles.title1}>動画一覧</p>
      <Carousel responsive={responsive}>
        {videos.length > 0 ? (
          videos.map((video, index) => (
            <div key={index} className={styles.itembox}>
              <Link href={video.shortUrl}>
                <div className={styles.item}>
                  <video
                    src={video.videoUrl}
                    width="100%"
                    autoPlay
                    muted
                    loop
                    controls={false}
                    poster={video.thumbnailUrl || video.videoUrl} // サムネイルまたは動画のURLを表示
                  >
                    お使いのブラウザはvideoタグをサポートしていません。
                  </video>
                </div>
              </Link>
            </div>
          ))
        ) : (
          <p>保存された動画がありません。</p>
        )}
      </Carousel>
    </div>
  );
};

export default Slider1;
