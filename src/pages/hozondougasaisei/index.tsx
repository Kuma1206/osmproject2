import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import styles from "./style.module.scss";
import WeuiClose2Outlined from "@/components/Backbutton";
import Link from "next/link";
import "react-toggle/style.css";
import Toggle from "react-toggle";
import {
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore"; // onSnapshot を追加
import { db, storage } from "@/firebase/client";
import { deleteObject, ref } from "firebase/storage";

const Hozondougasaisei = () => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userId, videoUrl, audioUrl, videoDocId } = router.query; // audioUrl を追加
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null); // 音声の参照用

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
        const videoDocRef = doc(
          db,
          `user_audio/${userId}/audio`, // user_audioの中にアクセス
          videoDocId as string
        );

        // ドキュメントの変更をリアルタイムに監視
        const unsubscribe = onSnapshot(videoDocRef, (videoDoc) => {
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
        });

        return unsubscribe; // コンポーネントがアンマウントされたときにクリーンアップする
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
      const videoDocRef = doc(
        db,
        `user_audio/${userId}/audio`,
        videoDocId as string
      ); // Firestore の正しいパス
      await updateDoc(videoDocRef, { isPublic: newChecked });
      console.log("isPublic が正常に保存されました:", newChecked);
    } catch (error) {
      console.error("Firestore への保存中にエラーが発生しました:", error);
    }
  };

  const handlePlay = () => {
    if (videoRef.current && audioRef.current) {
      audioRef.current.currentTime = 0; // 音声を先頭から再生
      audioRef.current.play(); // 音声を再生
      videoRef.current.play(); // 動画を再生
    }
  };

  const handlePause = () => {
    if (videoRef.current && audioRef.current) {
      audioRef.current.pause(); // 音声を停止
      videoRef.current.pause(); // 動画を停止
    }
  };

  const handleDeleteVideo = async () => {
    const confirmation = window.confirm("削除しますか？");

    if (confirmation && userId && videoDocId && videoUrl) {
      try {
        const videoRefInStorage = ref(storage, videoUrl as string);
        await deleteObject(videoRefInStorage);

        const videoDocRef = doc(
          db,
          `user_audio/${userId}/audio`,
          videoDocId as string
        );
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
        {videoUrl && audioUrl ? ( // audioUrl をチェック
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
            <audio ref={audioRef}>
              <source src={audioUrl as string} type="audio/mp4" />
              お使いのブラウザは音声タグをサポートしていません。
            </audio>
          </>
        ) : (
          <p>動画または音声が選択されていません。</p>
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

export default Hozondougasaisei;
