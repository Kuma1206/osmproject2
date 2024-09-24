import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "./style.module.scss";
import WeuiClose2Outlined from "@/components/Backbutton";
import Link from "next/link";
import { FaMicrophone } from "react-icons/fa";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { app } from "@/firebase/client"; // トランザクション関数をインポート
import { FFmpeg } from "@ffmpeg/ffmpeg"; // 崩さないインポート
import { fetchFile } from "@ffmpeg/util"; // 崩さないインポート

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [ffmpeg, setFFmpeg] = useState<any>(null); // FFmpegインスタンスを状態として管理
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false); // FFmpegがロード済みかを管理

  // useEffectでクライアントサイドのみffmpeg.wasmをロード
  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpegInstance = new FFmpeg();
      await ffmpegInstance.load();
      setFFmpeg(ffmpegInstance);
      setFfmpegLoaded(true);
    };

    if (typeof window !== "undefined") {
      loadFFmpeg(); // クライアントサイドでのみFFmpegをロード
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
        alert("録音が終了しました。");
      };

      mediaRecorder.onerror = (event: Event) => {
        const error = event as ErrorEvent;
        alert("MediaRecorderエラー: " + error.message);
      };

      mediaRecorder.start();
      alert("録音を開始しました。");
      setIsRecording(true);

      if (videoRef.current) {
        videoRef.current.play();
        videoRef.current.onended = () => {
          stopRecording();
        };
      }
    } catch (err) {
      if (err instanceof Error) {
        alert("録音の開始中にエラーが発生しました: " + err.message);
      } else {
        alert("録音の開始中に未知のエラーが発生しました。");
      }
    }
  };

  const stopRecording = () => {
    // 録音を停止
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      console.log("録音を停止しました。");
    }

    // 動画も停止
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0; // 動画の位置をリセット
    }

    setIsRecording(false);
  };

  // サムネイルをキャプチャする関数
  const captureThumbnail = async () => {
    if (!videoRef.current) return null;

    const videoElement = videoRef.current;
    return new Promise<string | null>((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      const ctx = canvas.getContext("2d");

      videoElement.currentTime = 1; // 動画の1秒後にフレームをキャプチャ

      const handleSeeked = () => {
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          const dataURL = canvas.toDataURL("image/png");
          resolve(dataURL);
        } else {
          reject("Canvas context not available");
        }
        videoElement.removeEventListener("seeked", handleSeeked);
      };

      videoElement.addEventListener("seeked", handleSeeked);
    });
  };

  // サムネイルをFirebaseにアップロードする関数
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
    return getDownloadURL(snapshot.ref); // サムネイルのURLを返す
  };

  // 動画と音声を結合する関数
  const mergeAudioVideo = async (audioBlob: Blob, videoUrl: string) => {
    if (!ffmpegLoaded) {
      console.error("FFmpeg is not loaded yet.");
      return null;
    }

    const audioFile = "audio.webm";
    const videoFile = "video.mp4";
    const outputFile = "output.mp4";

    const videoResponse = await fetch(videoUrl);
    const videoBlob = await videoResponse.blob();

    await ffmpeg.writeFile(videoFile, await fetchFile(videoBlob));
    await ffmpeg.writeFile(audioFile, await fetchFile(audioBlob));

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

    return mergedBlob;
  };

  // 動画とサムネイルをFirebaseに保存し、トランザクションでFireStoreに保存
  // 動画とサムネイルをFirebaseに保存し、Firestoreに保存する関数
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

      // 動画ファイルをFirebase Storageにアップロード
      const snapshot = await uploadBytes(mergedVideoRef, mergedBlob);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Firestoreのvideosコレクションに動画データを保存
      const videoCollectionRef = doc(firestore, "videos", mergedVideoFileName);

      await setDoc(videoCollectionRef, {
        userId: user.uid,
        videoUrl: downloadURL, // 動画のURL
        thumbnailUrl: thumbnailUrl, // サムネイルのURL
        isPublic: true, // デフォルトで公開状態
        createdAt: Date.now(),
        status: "ready",
      });

      console.log(
        "結合された動画とサムネイルがFirebaseに保存され、Firestoreに保存されました:",
        downloadURL
      );
      alert("結合された動画とサムネイルが保存されました！");
    } catch (err) {
      console.error("動画の保存中にエラーが発生しました:", err);
      alert("エラーが発生しました。もう一度やり直してください。");
    } finally {
      setIsSaving(false);
    }
  };

  // サムネイルと動画を保存するための呼び出し
  const saveAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      console.error("保存できる音声データがありません");
      return;
    }

    const audioBlob = new Blob(audioChunksRef.current, {
      type: "audio/webm",
    });

    // 1. サムネイルをキャプチャしてFirebaseに保存
    const thumbnailDataUrl = await captureThumbnail();
    const thumbnailUrl = await uploadThumbnailToFirebase(
      thumbnailDataUrl || ""
    );

    // 2. 音声と動画を結合
    const mergedBlob = await mergeAudioVideo(audioBlob, videoUrl as string);

    // 3. 結合された動画とサムネイルをFirebaseに保存
    if (mergedBlob !== null && thumbnailUrl !== null) {
      await saveMergedVideoToFirebase(mergedBlob, thumbnailUrl);
    } else {
      console.error("動画の結合またはサムネイルの取得に失敗しました。");
    }
  };

  const playAudioWithVideo = () => {
    if (audioRef.current && videoRef.current) {
      audioRef.current.play();
      videoRef.current.play();
    }
  };

  const checkMicrophonePermission = async () => {
    // まず、ブラウザがgetUserMediaをサポートしているかを確認
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("お使いのブラウザはマイクへのアクセスをサポートしていません。");
      return null; // ブラウザがサポートしていない場合はnullを返す
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      alert("マイクのアクセスが許可されました");
      return stream; // 権限が許可されている場合、streamを返す
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
      return null; // 権限が拒否された場合やエラーが発生した場合
    }
  };

  const startRecordingWithPermissionCheck = async () => {
    const stream = await checkMicrophonePermission();
    if (stream) {
      startRecording(stream); // 権限が許可されたら録音を開始
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
          if (isRecording) {
            stopRecording(); // 録音と動画を停止
          } else {
            // 録音を開始する前にマイク権限を確認
            const stream = await checkMicrophonePermission();
            if (stream) {
              startRecording(stream); // 権限が許可されたら録音と動画を開始
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
