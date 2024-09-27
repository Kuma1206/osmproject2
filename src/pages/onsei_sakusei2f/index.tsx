import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "./style.module.scss";
import WeuiClose2Outlined from "@/components/Backbutton";
import Link from "next/link";
import { FaMicrophone } from "react-icons/fa";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { app } from "@/firebase/client";
import { nanoid } from "nanoid";

const auth = getAuth(app);
const storage = getStorage(app);
const firestore = getFirestore(app);

const Onsei_sakusei2f = () => {
  const router = useRouter();
  const { videoUrl } = router.query;
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const getSupportedMimeType = () => {
    const possibleTypes = [
      "audio/webm",
      "audio/ogg",
      "audio/mp4",
      "audio/mpeg",
    ];
    return (
      possibleTypes.find((type) => MediaRecorder.isTypeSupported(type)) || ""
    );
  };

  const startRecording = (stream: MediaStream) => {
    try {
      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        throw new Error("サポートされているMIMEタイプが見つかりません");
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
        }
        console.log("録音が終了しました。");
      };

      mediaRecorder.onerror = (event: Event) => {
        const error = event as ErrorEvent;
        alert("MediaRecorderエラー: " + error.message);
      };

      mediaRecorder.start();
      console.log("録音を開始しました。");
      setIsRecording(true);

      if (videoRef.current) {
        videoRef.current.play();
        videoRef.current.onended = () => {
          stopRecording();
        };
      }
    } catch (err) {
      if (err instanceof Error) {
        alert("録音の開始中にエラーが発生しました。: " + err.message);
      } else {
        alert("録音の開始中に未知のエラーが発生しました。");
      }
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      console.log("録音を停止しました。");
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    setIsRecording(false);
  };

  const uploadThumbnailToFirebase = async (thumbnailDataUrl: string) => {
    const user = auth.currentUser;
    if (!user) return null;

    const thumbnailFileName = `thumbnail_${Date.now()}.png`;
    const thumbnailStorageRef = ref(
      storage,
      `user_thumbnails/${user.uid}/${thumbnailFileName}`
    );

    const response = await fetch(thumbnailDataUrl);
    const blob = await response.blob();
    const snapshot = await uploadBytes(thumbnailStorageRef, blob);
    return getDownloadURL(snapshot.ref);
  };

  const saveMergedVideoToFirebase = async (
    mergedVideoBlob: Blob,
    thumbnailUrl: string
  ) => {
    try {
      setIsSaving(true);

      const user = auth.currentUser;
      if (!user) {
        throw new Error("ユーザーが認証されていません");
      }
      const videoRef = ref(storage, `user_videos/${user.uid}/${nanoid(6)}.mp4`);
      const snapshot = await uploadBytes(videoRef, mergedVideoBlob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const videoDocRef = doc(firestore, "videos", nanoid(6));
      await setDoc(videoDocRef, {
        userId: user.uid,
        videoUrl: downloadURL,
        thumbnailUrl: thumbnailUrl,
        isPublic: true,
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error("エラー:", error.message);
      } else {
        console.error("予期しないエラーが発生しました");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const saveAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      alert("保存できる音声データがありません");
      return;
    }

    setIsSaving(true);

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

    try {
      const audioStorageRef = ref(storage, `user_audio/${Date.now()}.webm`);
      const audioSnapshot = await uploadBytes(audioStorageRef, audioBlob);
      const audioUrl = await getDownloadURL(audioSnapshot.ref);

      const thumbnailUrl = await uploadThumbnailToFirebase(""); // サムネイルURLの処理
      console.log("音声と動画の結合開始");

      // サーバー側のクラウドファンクションにリクエストを送信
      const response = await fetch(
        "https://us-central1-osmproject-34e1b.cloudfunctions.net/merge",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            videoUrl, // クライアント側からの動画URL
            audioUrl, // クライアント側からの音声URL
          }),
        }
      );

      const data = await response.json();
      console.log("結合されたビデオのURL:", data.mergedVideoUrl);

      const { mergedVideoUrl } = await response.json();
      if (typeof mergedVideoUrl === "string") {
        const videoBlobResponse = await fetch(mergedVideoUrl);
        const videoBlob = await videoBlobResponse.blob();
        if (thumbnailUrl) {
          await saveMergedVideoToFirebase(videoBlob, thumbnailUrl);
        } else {
          throw new Error("サムネイルのURLが取得できませんでした");
        }
        console.error("サムネイルの取得に失敗しました");
      } else {
        throw new Error("マージされたビデオのURLが取得できませんでした");
      }
    } catch (err) {
      if (err instanceof Error) {
        alert("エラーが発生しました: " + err.message);
      } else {
        alert("不明なエラーが発生しました");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const checkMicrophonePermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("お使いのブラウザはマイクへのアクセスをサポートしていません。");
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("マイクのアクセスが許可されました");
      return stream;
    } catch (err) {
      if (err instanceof Error) {
        alert(
          "マイクのアクセスが拒否されました、またはエラーが発生しました: " +
            err.message
        );
      } else {
        alert(
          "マイクのアクセスが拒否されました、または未知のエラーが発生しました。"
        );
      }
      return null;
    }
  };

  const startRecordingWithPermissionCheck = async () => {
    const stream = await checkMicrophonePermission();
    if (stream) {
      startRecording(stream);
    } else {
      alert("マイクの権限が許可されていません。録音を開始できません。");
    }
  };

  const playAudioWithVideo = () => {
    if (videoRef.current && audioRef.current) {
      videoRef.current.play();
      audioRef.current.play();
    } else {
      console.error("ビデオまたはオーディオ要素が見つかりません");
    }
  };

  return (
    <>
      <div className={styles.moviebox}>
        {videoUrl ? (
          <video
            ref={videoRef}
            controls
            width="100%"
            controlsList="nodownload"
            crossOrigin="anonymous"
            onEnded={stopRecording}
            poster={thumbnailUrl ? (thumbnailUrl as string) : ""}
          >
            <source src={videoUrl as string} type="video/mp4" />
            お使いのブラウザは動画タグをサポートしていません。
          </video>
        ) : (
          <p>動画が選択されていません。</p>
        )}
      </div>

      <audio ref={audioRef} controls hidden />

      <div
        className={styles.microphoneIconContainer}
        onClick={async () => {
          const user = auth.currentUser;
          if (!user) {
            alert("ログインしてください。");
            return;
          }

          if (isRecording) {
            stopRecording();
          } else {
            const stream = await checkMicrophonePermission();
            if (stream) {
              startRecording(stream);
            }
          }
        }}
      >
        <div className={isRecording ? styles.recordingIndicator : ""}>
          <FaMicrophone className={styles.microphoneIcon} />
        </div>
      </div>

      <div className={styles.box}>
        <div className={styles.onseisaiseibox}>
          <button className={styles.onseisaisei} onClick={playAudioWithVideo}>
            音声動画再生
          </button>
        </div>
      </div>
      <div
        className={styles.hozonbox}
        onClick={saveAudio}
        style={{ cursor: isSaving ? "not-allowed" : "pointer" }}
      >
        {isSaving ? "保存中..." : "保存"}
      </div>
      <Link href="/seisaku_page2">
        <WeuiClose2Outlined className={styles.backbutton} />
      </Link>
    </>
  );
};

export default Onsei_sakusei2f;
