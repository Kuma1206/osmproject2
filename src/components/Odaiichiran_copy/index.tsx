import React, { useEffect, useState } from "react";
import styles from "./style.module.scss";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/client";
import Link from "next/link";

const Odaiidhiran = () => {
  const [videos, setVideos] = useState<any[]>([]); // サムネイルと動画URLのオブジェクト配列

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "videos"), (snapshot) => {
      const videoData = snapshot.docs.map((doc) => {
        const data = doc.data();
        console.log("Firestore data:", data); // 取得したデータを確認
        return {
          url: data.url, // 動画URL
          thumbnailUrl: data.thumbnailUrl || "", // サムネイルURL
        };
      });

      // Firestoreデータが更新されたことをログで確認
      console.log("Filtered video data:", videoData.filter(Boolean));
      setVideos(videoData.filter((video) => video.url && video.thumbnailUrl)); // 無効なURLやサムネイルがないものを除外してセット
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      {videos.length > 0 ? (
        <div className={styles.mainbox}>
          {videos.map((video, index) => (
            <Link
              href={{
                pathname: "/onsei_sakusei2_copy",
                query: { videoUrl: video.url },
              }}
              key={index}
              className={styles.movebox}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                }}
              >
                {/* サムネイル画像を表示 */}
                <img
                  src={video.thumbnailUrl}
                  alt={`サムネイル ${index}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p>動画がありません。</p>
      )}
    </>
  );
};

export default Odaiidhiran;
