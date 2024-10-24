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
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { nanoid } from "nanoid";

const auth = getAuth(app);
const storage = getStorage(app);
const firestore = getFirestore(app);

const Onsei_sakusei2_copy = () => {
  const router = useRouter();
  const { videoUrl, videoId } = router.query; // videoIdを取得
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [ffmpeg, setFFmpeg] = useState<any>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const ffmpegInstance = new FFmpeg();

        // FFmpegのログを全てキャッチする
        ffmpegInstance.on("log", ({ type, message }) => {
          console.log(`[FFmpeg ${type}] ${message}`);
          if (type === "error" || message.toLowerCase().includes("error")) {
            console.error(`FFmpegエラー: ${message}`);
            alert(`FFmpegエラー: ${message}`);
          }
        });

        console.log("FFmpegのロードを開始します");

        await ffmpegInstance.load({
          coreURL: "/ffmpeg/ffmpeg-core.js",
          wasmURL: "/ffmpeg/ffmpeg-core.wasm", // WebAssemblyモジュール
          workerURL: "/ffmpeg/ffmpeg-core.worker.js",
        });

        setFFmpeg(ffmpegInstance);
        setFfmpegLoaded(true);
        console.log("FFmpegが正常にロードされました");
      } catch (error) {
        console.error("FFmpegロードエラー:", error);
        if (error instanceof Error) {
          alert(
            `FFmpegのロードに失敗しました。\n\nエラー内容: ${error.message}\n\nスタックトレース:\n${error.stack}`
          );
        } else {
          alert("FFmpegのロードに失敗しました。不明なエラーが発生しました。");
        }
      }
    };

    if (
      typeof WebAssembly === "object" &&
      typeof WebAssembly.instantiate === "function"
    ) {
      loadFFmpeg();
    } else {
      alert(
        "WebAssemblyがサポートされていません。最新のブラウザをご利用ください。"
      );
    }
  }, []);

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

  const saveAudioToFirebase = async (audioBlob: Blob) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("ユーザーがログインしていません");
    }

    if (!videoId) {
      alert("動画IDがありません。動画を選択してください。");
      return; // videoIdがない場合は保存処理を停止
    }

    const audioFileName = `audio_${Date.now()}.webm`;
    const audioStorageRef = ref(
      storage,
      `user_audio/${user.uid}/${audioFileName}`
    );

    try {
      // 音声ファイルをFirebase Storageにアップロード
      const snapshot = await uploadBytes(audioStorageRef, audioBlob);
      const audioDownloadUrl = await getDownloadURL(snapshot.ref);

      console.log("音声が保存されました: ", audioDownloadUrl);

      // Firestoreに音声のURLと結合する動画のIDを保存
      await setDoc(doc(firestore, "user_audio", audioFileName), {
        userId: user.uid,
        audioUrl: audioDownloadUrl,
        videoId: videoId, // 結合する動画のIDを保存
        createdAt: Date.now(),
      });

      return audioDownloadUrl;
    } catch (error) {
      console.error("音声の保存中にエラーが発生しました: ", error);
      throw error;
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
      // 音声をFirebaseに保存
      const audioUrl = await saveAudioToFirebase(audioBlob);
      alert("音声が保存されました!");
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

  // 音声と動画を同時に再生する
  const playAudioWithVideo = () => {
    if (audioRef.current && videoRef.current) {
      audioRef.current.play();
      videoRef.current.play();
    }
  };

  const checkMicrophonePermission = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream;
    } catch (err) {
      console.error("マイクのアクセス許可が拒否されました:", err);
      return null;
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

export default Onsei_sakusei2_copy;
