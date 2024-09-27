import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg"; // 最新のインポート方法

const ffmpeg = createFFmpeg({ log: true });

self.onmessage = async (e) => {
  const { videoFile, audioFile } = e.data;

  try {
    // メッセージ受信確認
    self.postMessage({ log: "Web Workerでメッセージ受信開始" });
    if (!videoFile || !audioFile) {
      throw new Error("動画ファイルまたは音声ファイルが提供されていません");
    }

    // FFmpegロード開始
    self.postMessage({ log: "FFmpegのロード開始" });
    const startTime = performance.now();
    await ffmpeg.load(); // FFmpegをロード
    const endTime = performance.now();
    self.postMessage({
      log: `FFmpegのロード完了 (${(endTime - startTime).toFixed(2)} ms)`,
    });

    // 動画ファイルの書き込み
    self.postMessage({ log: "動画ファイルをFFmpegに書き込み中..." });
    await ffmpeg.FS("writeFile", "input-video.mp4", await fetchFile(videoFile));
    self.postMessage({ log: "動画ファイルの書き込みが完了しました" });

    // 音声ファイルの書き込み
    self.postMessage({ log: "音声ファイルをFFmpegに書き込み中..." });
    await ffmpeg.FS(
      "writeFile",
      "input-audio.webm",
      await fetchFile(audioFile)
    );
    self.postMessage({ log: "音声ファイルの書き込みが完了しました" });

    // 動画と音声の結合処理
    self.postMessage({ log: "音声と動画の結合を実行中..." });
    await ffmpeg.run(
      "-i",
      "input-video.mp4",
      "-i",
      "input-audio.webm",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-strict",
      "experimental", // FFmpegでのAACエンコーディングに必要
      "output.mp4"
    );
    self.postMessage({ log: "音声と動画の結合が完了しました" });

    // 結合されたファイルの読み込み
    self.postMessage({ log: "結合されたファイルを読み込み中..." });
    const data = ffmpeg.FS("readFile", "output.mp4");
    const outputBlob = new Blob([data.buffer], { type: "video/mp4" });
    self.postMessage({ log: "結合されたファイルの読み込みが完了しました" });

    // 結合された動画をメインスレッドに返す
    self.postMessage({ outputBlob });
  } catch (error) {
    // エラーハンドリング
    self.postMessage({
      log: `FFmpeg処理中にエラーが発生しました: ${error.message}`,
    });
    self.postMessage({ error: error.message });
  }
};
