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
        // さらに詳細なエラーログ
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

  const mergeAudioVideo = async (audioBlob: Blob, videoUrl: string) => {
    if (!ffmpegLoaded) {
      alert("FFmpegがロードされていません");
      return null;
    }

    console.log("FFmpegを使って音声と動画を結合中");

    const audioFile = "audio.webm";
    const videoFile = "video.mp4";
    const outputFile = "output.mp4";

    try {
      const videoResponse = await fetch(videoUrl);
      const videoBlob = await videoResponse.blob();

      console.log("動画ファイルをFFmpegに書き込み中");
      await ffmpeg.writeFile(videoFile, await fetchFile(videoBlob));

      console.log("音声ファイルをFFmpegに書き込み中");
      await ffmpeg.writeFile(audioFile, await fetchFile(audioBlob));

      console.log("音声と動画を結合開始");
      await ffmpeg.exec([
        "-i",
        videoFile,
        "-i",
        audioFile,
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-strict",
        "experimental",
        outputFile,
      ]);

      const data = await ffmpeg.readFile(outputFile);
      const mergedBlob = new Blob([data], { type: "video/mp4" });

      console.log("音声と動画の結合が完了しました");

      return mergedBlob;
    } catch (error) {
      if (error instanceof Error) {
        alert("音声と動画の結合に失敗しました: " + error.message);
      } else {
        alert("音声と動画の結合に失敗しました: 不明なエラーが発生しました");
      }
      return null;
    }
  };

  const saveMergedVideoToFirebase = async (
    mergedBlob: Blob,
    thumbnailUrl: string
  ) => {
    try {
      setIsSaving(true);

      const user = auth.currentUser;
      if (!user) {
        throw new Error("ユーザーが認証されていません");
      }

      const mergedVideoFileName = `merged_video_${Date.now()}.mp4`;
      const mergedVideoRef = ref(
        storage,
        `user_videos/${user.uid}/${mergedVideoFileName}`
      );

      const snapshot = await uploadBytes(mergedVideoRef, mergedBlob);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 元の`videos`コレクションへの保存
      const videoCollectionRef = doc(firestore, "videos", mergedVideoFileName);
      await setDoc(videoCollectionRef, {
        userId: user.uid,
        videoUrl: downloadURL,
        thumbnailUrl: thumbnailUrl,
        isPublic: true,
        createdAt: Date.now(),
        status: "ready",
      });

      // 短縮URL用のランダムなIDを生成
      const shortId = nanoid(6);

      // 短縮URLを生成
      const shortUrl = `https://osmproject.vercel.app/v/${shortId}`;

      // 短縮URLも一緒にFirestoreの`videos`コレクションに保存
      await setDoc(
        videoCollectionRef,
        {
          shortUrl: shortUrl,
          userId: user.uid,
          videoUrl: downloadURL,
          thumbnailUrl: thumbnailUrl,
          isPublic: true,
          createdAt: Date.now(),
          status: "ready",
        },
        { merge: true }
      );

      console.log("短縮された動画URL:", shortUrl);

      // 保存完了後、自動的に `seisaku_page2` へ遷移
      alert(`動画が保存されました!`);
      router.push("/seisaku_page2"); // ← 保存が成功したらページを遷移
    } catch (err) {
      console.error("動画の保存中にエラーが発生しました:", err);
      alert("エラーが発生しました。もう一度やり直してください。");
    } finally {
      setIsSaving(false);
    }
  };

  const saveAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      alert("保存できる音声データがありません");
      return;
    }

    // 保存プロセスの開始時点で「保存中...」を表示するためにisSavingをtrueに設定
    setIsSaving(true);

    console.log("サムネイルをキャプチャ開始");

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

    try {
      const thumbnailDataUrl = await captureThumbnail(); // サムネイルのキャプチャ
      console.log("サムネイルをキャプチャ完了");

      const thumbnailUrl = await uploadThumbnailToFirebase(
        thumbnailDataUrl || ""
      );
      console.log("サムネイルのFirebaseアップロード完了");

      console.log("音声と動画の結合開始");
      const mergedBlob = await mergeAudioVideo(audioBlob, videoUrl as string); // 音声と動画の結合
      console.log("音声と動画の結合完了");

      if (mergedBlob !== null && thumbnailUrl !== null) {
        console.log("結合された動画をFirebaseに保存開始");
        await saveMergedVideoToFirebase(mergedBlob, thumbnailUrl); // Firebaseへの保存
        console.log("結合された動画をFirebaseに保存完了");
      } else {
        alert("動画の結合またはサムネイルの取得に失敗しました。");
      }
    } catch (err) {
      if (err instanceof Error) {
        alert("エラーが発生しました: " + err.message);
      } else {
        alert("不明なエラーが発生しました");
      }
    } finally {
      setIsSaving(false); // 全ての処理が完了した後、再びisSavingをfalseに設定
    }
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

export default Onsei_sakusei2;
