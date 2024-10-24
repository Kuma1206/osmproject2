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

const Onsei_sakusei2 = () => {
  const router = useRouter();
  const { videoUrl } = router.query;
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Web Workerを使ってFFmpegで動画と音声を結合する
  const mergeAudioVideoInWorker = (
    audioBlob: Blob,
    videoUrl: string
  ): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      const worker = new Worker("/ffmpeg-worker.js", { type: "module" });

      try {
        console.log("動画ファイルの取得開始");
        const videoResponse = await fetch(videoUrl);
        const videoBlob = await videoResponse.blob();
        console.log("動画ファイルの取得完了");

        // Web Worker でのメッセージ送信確認
        console.log("Web Workerにメッセージ送信開始");
        worker.postMessage({
          videoFile: videoBlob,
          audioFile: audioBlob,
        });
        console.log("Web Workerにメッセージ送信完了");

        worker.onmessage = (e) => {
          const { outputBlob, error, log } = e.data;

          // ログがあれば表示
          if (log) {
            console.log("Web Workerからのログ:", log);
          }

          // エラーが発生した場合はリジェクト
          if (error) {
            console.error(`Web Workerでエラーが発生: ${error}`);
            reject(new Error(error));
          } else if (outputBlob) {
            resolve(outputBlob);
          }
        };

        worker.onerror = (error) => {
          console.error(`Web Workerのエラー: ${error.message}`);
          reject(new Error("Web Worker エラーが発生しました"));
        };
      } catch (error) {
        reject(error);
      }
    });
  };

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
    const mimeType = getSupportedMimeType();
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = []; // 録音データを初期化

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // 録音データを保存
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
      }
      console.log("録音が終了しました。録音データ:", audioChunksRef.current);
    };

    mediaRecorder.start();
    setIsRecording(true);

    if (videoRef.current) {
      videoRef.current.play();
      videoRef.current.onended = stopRecording;
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    setIsRecording(false);
  };

  const saveAudio = async () => {
    if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
      alert("保存できる音声データがありません");
      return;
    }

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    try {
      setIsSaving(true);
      const validVideoUrl = typeof videoUrl === "string" ? videoUrl : "";
      const validThumbnailUrl =
        typeof thumbnailUrl === "string" ? thumbnailUrl : "";
      const mergedBlob = await mergeAudioVideoInWorker(
        audioBlob,
        validVideoUrl
      ); // Web Workerを利用
      await saveMergedVideoToFirebase(mergedBlob, validThumbnailUrl); // Firebaseに保存
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

  const saveMergedVideoToFirebase = async (
    mergedBlob: Blob,
    thumbnailUrl: string
  ) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("ユーザーが認証されていません");
      }
      const videoRef = ref(storage, `user_videos/${user.uid}/${nanoid(6)}.mp4`);
      const snapshot = await uploadBytes(videoRef, mergedBlob);
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
    }
  };

  const captureThumbnail = async () => {
    if (!videoRef.current) {
      alert("動画が見つかりません");
      return null;
    }

    const videoElement = videoRef.current;
    return new Promise<string | null>((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      const ctx = canvas.getContext("2d");

      videoElement.currentTime = 1;

      const handleSeeked = () => {
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          const dataURL = canvas.toDataURL("image/png");
          console.log("サムネイルキャプチャ成功");
          resolve(dataURL);
        } else {
          alert("Canvasのコンテキストが取得できませんでした");
          reject("Canvas context not available");
        }
        videoElement.removeEventListener("seeked", handleSeeked);
      };

      videoElement.addEventListener("seeked", handleSeeked);

      videoElement.onerror = () => {
        alert("サムネイルのキャプチャ中にエラーが発生しました");
        reject("サムネイルキャプチャに失敗");
      };
    });
  };

  const playAudioWithVideo = () => {
    if (audioRef.current && videoRef.current) {
      audioRef.current.play();
      videoRef.current.play();
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

      <div className={styles.onseisaiseibox}>
        <button className={styles.onseisaisei} onClick={playAudioWithVideo}>
          音声動画再生
        </button>
      </div>

      <div className={styles.hozonbox} onClick={saveAudio}>
        {isSaving ? "保存中..." : "保存"}
      </div>

      <Link href="/seisaku_page2">
        <WeuiClose2Outlined className={styles.backbutton} />
      </Link>
    </>
  );
};

export default Onsei_sakusei2;
