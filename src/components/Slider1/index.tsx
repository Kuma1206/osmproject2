import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { Swiper, SwiperSlide } from "swiper/react";
import Link from "next/link";
import "swiper/swiper-bundle.css";
import styles from "./style.module.scss";
import { db } from "@/firebase/client"; // Firebaseの初期化設定をインポート

// 配列をシャッフルする関数
const shuffleArray = (array: any[]) => {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
};

const Slider1 = () => {
  const [videos, setVideos] = useState<any[]>([]); // 動画データを格納するステート
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]); // 各動画のrefを保存
  const swiperRef = useRef<any>(null); // Swiperのrefを保存
  const [randomVideos, setRandomVideos] = useState<any[]>([]); // ランダムな順序で保存

  // Firestoreから動画リンクを取得
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const videosCollectionRef = collection(db, "user_videos");
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

        // 公開動画データをステートに保存し、ランダム化
        setVideos(allPublicVideos);
        setRandomVideos(shuffleArray(allPublicVideos)); // シャッフルした順番で動画をセット
        console.log(`Total public videos found: ${allPublicVideos.length}`);
      } catch (error) {
        console.error("Error fetching video data:", error);
      }
    };

    fetchVideos();
  }, []);

  // 動画再生終了時に次のスライドに進む
  const handleVideoEnded = () => {
    if (swiperRef.current) {
      swiperRef.current.slideNext(); // 次のスライドへ自動で移動
    }
  };

  // スライドが変わるたびに動画を自動再生し、他の動画はミュート
  const handleSlideChange = (swiper: any) => {
    const currentSlideIndex = swiper.realIndex; // 実際のスライドインデックス

    // すべての動画をミュート
    videoRefs.current.forEach((videoRef, index) => {
      if (videoRef) {
        videoRef.pause(); // 一旦すべての動画を停止
        videoRef.muted = true; // ミュートに設定
      }
    });

    // 現在の動画だけを再生し、ミュートを解除
    const currentVideoRef = videoRefs.current[currentSlideIndex];
    if (currentVideoRef) {
      currentVideoRef.muted = false; // ミュートを解除
      currentVideoRef.play(); // 新しいスライドに移動したら動画を再生
    }
  };

  return (
    <div className={styles.menubox}>
      <p className={styles.title1}></p>
      <Swiper
        direction="vertical"
        spaceBetween={0}
        slidesPerView={1}
        loop={true} // ループを有効化
        className={styles.swiper}
        onSwiper={(swiper) => {
          swiperRef.current = swiper; // Swiperのインスタンスを保存
        }}
        onSlideChange={handleSlideChange} // スライド変更時の処理
      >
        {randomVideos.length > 0 ? (
          randomVideos.map((video, index) => (
            <SwiperSlide key={index} className={styles.itembox}>
              <Link
                href={{
                  pathname: "/usersityougamen",
                  query: {
                    videoDocId: video.videoDocId,
                    thumbnailUrl: video.thumbnailUrl,
                    shortUrl: video.shortUrl,
                    videoUrl: video.videoUrl, // videoUrlを渡す
                  },
                }}
              >
                <div
                  className={styles.item}
                  onClick={() => {
                    console.log("Navigating to video:", {
                      videoDocId: video.videoDocId,
                      thumbnailUrl: video.thumbnailUrl,
                      shortUrl: video.shortUrl,
                      videoUrl: video.videoUrl,
                    });
                  }}
                >
                  <video
                    ref={(el) => {
                      videoRefs.current[index] = el;
                    }}
                    src={video.videoUrl}
                    width="100%"
                    height="10%"
                    autoPlay
                    controls={false}
                    loop={false}
                    onEnded={handleVideoEnded}
                    poster={video.thumbnailUrl || video.videoUrl}
                  >
                    お使いのブラウザはvideoタグをサポートしていません。
                  </video>
                </div>
              </Link>
            </SwiperSlide>
          ))
        ) : (
          <p></p>
        )}
      </Swiper>
    </div>
  );
};

export default Slider1;
