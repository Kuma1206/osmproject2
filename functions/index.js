const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); // CORSの設定
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;
const { exec } = require("child_process");
const { tmpdir } = require("os");
const { join } = require("path");
const fs = require("fs");

admin.initializeApp();
const storage = admin.storage();

// 音声ファイルの処理を行う関数
const processFile = (filePath) => {
  // 1. ファイルパスが有効かどうかを確認
  if (filePath && typeof filePath === "string") {
    // 2. ファイルが音声ファイルかどうかを確認
    if (filePath.endsWith(".mp3") || filePath.endsWith(".wav")) {
      const fileName = filePath.split("/").pop(); // ファイル名を取得
      console.log("処理するファイル:", fileName);

      // 音声ファイルの処理を続行
      // ここに処理内容を記述
    } else {
      console.log(
        "アップロードされたファイルは音声ファイルではありません: ",
        filePath
      );
      return;
    }
  } else {
    console.error("ファイルパスが正しくありません:", filePath);
    return;
  }
};

// 動画と音声を結合する関数
exports.merge = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    const { videoUrl, audioUrl } = req.body;

    // 一時ファイルのパスを定義
    const videoFilePath = join(tmpdir(), `video.mp4`);
    const audioFilePath = join(tmpdir(), `audio.webm`);
    const outputFilePath = join(tmpdir(), `merged.mp4`);

    try {
      // 動画と音声をFirebase Storageからダウンロード
      await downloadFileFromStorage(videoUrl, videoFilePath);
      await downloadFileFromStorage(audioUrl, audioFilePath);

      // ffmpegを使って動画と音声を結合
      await new Promise((resolve, reject) => {
        exec(
          `${ffmpeg} -i ${videoFilePath} -i ${audioFilePath} -c:v copy -c:a aac -strict experimental ${outputFilePath}`,
          (error, stdout, stderr) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          }
        );
      });

      // 結合された動画をFirebase Storageにアップロード
      const mergedVideoUrl = await uploadFileToStorage(
        outputFilePath,
        "merged_videos"
      );

      res.status(200).json({ mergedVideoUrl });
    } catch (error) {
      console.error("エラー:", error);
      res.status(500).send("結合に失敗しました");
    } finally {
      // 一時ファイルを削除
      [videoFilePath, audioFilePath, outputFilePath].forEach((filePath) => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error("ファイル削除エラー:", err);
        }
      });
    }
  });
});

const downloadFileFromStorage = async (fileUrl, destPath) => {
  try {
    const fileName = fileUrl.split("/o/")[1].split("?")[0]; // Firebase Storage URLからファイル名を取得
    const file = storage.bucket().file(decodeURIComponent(fileName));
    await file.download({ destination: destPath });
  } catch (error) {
    console.error("ファイルのダウンロードに失敗しました:", error);
    throw new Error("ファイルのダウンロードに失敗しました");
  }
};

const uploadFileToStorage = async (filePath, folder) => {
  const fileName = `${folder}/${Date.now()}.mp4`;
  try {
    await storage.bucket().upload(filePath, { destination: fileName });
    const file = storage.bucket().file(fileName);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "03-01-2500",
    });
    return url;
  } catch (error) {
    console.error("ファイルのアップロードに失敗しました:", error);
    throw new Error("ファイルのアップロードに失敗しました");
  }
};
