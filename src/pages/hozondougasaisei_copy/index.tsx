import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import styles from "./style.module.scss";
import WeuiClose2Outlined from "@/components/Backbutton";
import Link from "next/link";
import "react-toggle/style.css";
import Toggle from "react-toggle";
import { doc, updateDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db, storage } from "@/firebase/client";
import { deleteObject, ref } from "firebase/storage";

const Hozondougasaisei_copy = () => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userId, videoUrl, videoDocId } = router.query;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchIsPublic = async () => {
      if (!userId || !videoDocId) {
        console.error("userId または videoDocId が存在しません。");
        setLoading(false);
        return;
      }

      try {
        console.log(
          `Fetching document for userId: ${userId}, videoDocId: ${videoDocId}`
        );
        const videoDocRef = doc(db, "merged_videos", videoDocId as string);
        const videoDoc = await getDoc(videoDocRef);

        if (videoDoc.exists()) {
          const data = videoDoc.data();
          console.log("Firestore から取得したデータ:", data);
          if (data?.isPublic !== undefined) {
            setChecked(data.isPublic);
            console.log("トグルの初期値を設定しました:", data.isPublic);
          } else {
            console.warn(
              "isPublic フィールドが存在しません。デフォルトで false に設定されます。"
            );
            setChecked(false); // isPublic が存在しない場合は false に設定
          }
        } else {
          console.error("指定されたドキュメントが存在しません。");
        }
      } catch (error) {
        console.error(
          "Firestore から isPublic を取得する際にエラーが発生しました:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    if (router.isReady) {
      fetchIsPublic();
    }
  }, [router.isReady, userId, videoDocId]);

  const handleToggleChange = async () => {
    const newChecked = !checked;
    setChecked(newChecked);

    if (!userId || !videoDocId) {
      console.error("userId または videoDocId が存在しません。");
      return;
    }

    try {
      const videoDocRef = doc(db, "merged_videos", videoDocId as string);
      await updateDoc(videoDocRef, { isPublic: newChecked });
      console.log("isPublic が正常に保存されました:", newChecked);
    } catch (error) {
      console.error("Firestore への保存中にエラーが発生しました:", error);
    }
  };

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleDeleteVideo = async () => {
    const confirmation = window.confirm("削除しますか？");

    if (confirmation && userId && videoDocId && videoUrl) {
      try {
        const videoRefInStorage = ref(storage, videoUrl as string);
        await deleteObject(videoRefInStorage);

        const videoDocRef = doc(db, "merged_videos", videoDocId as string);
        await deleteDoc(videoDocRef);

        console.log("動画データが正常に削除されました。");
        alert("削除しました");

        router.push("/seisaku_page2");
      } catch (error) {
        console.error("動画データの削除中にエラーが発生しました:", error);
      }
    }
  };

  if (loading) {
    return <p>読み込み中...</p>;
  }

  return (
    <>
      <div className={styles.moviebox}>
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              controls
              width="100%"
              muted
              controlsList="nodownload"
              onPlay={handlePlay}
              onPause={handlePause}
            >
              <source src={videoUrl as string} type="video/mp4" />
              お使いのブラウザは動画タグをサポートしていません。
            </video>
          </>
        ) : (
          <p>動画が選択されていません。</p>
        )}
      </div>

      {!loading && (
        <div className={styles.togglebox}>
          <span className={styles.title}>公開</span>
          <Toggle
            checked={checked}
            onChange={handleToggleChange}
            icons={false}
            className="react-toggle"
          />
        </div>
      )}

      <div className={styles.sakujobox}>
        <button className={styles.sakujo} onClick={handleDeleteVideo}>
          削除
        </button>
      </div>

      <Link href="/seisaku_page2">
        <WeuiClose2Outlined className={styles.backbutton} />
      </Link>
    </>
  );
};

export default Hozondougasaisei_copy;
