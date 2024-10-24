const functions = require("firebase-functions");
const admin = require("firebase-admin");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const { Storage } = require("@google-cloud/storage");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Firebaseの初期化
admin.initializeApp();
const storage = admin.storage().bucket(); // バケットの初期化

exports.mergeAudioWithVideo = functions.firestore
  .document("user_audio/{audioId}")
  .onCreate(async (snap, context) => {
    const audioData = snap.data();
    const videoId = audioData.videoId;

    console.log("audioData: ", audioData);
    console.log("videoId: ", videoId);

    try {
      const audioFilePath = path.join(os.tmpdir(), "audio.webm");
      const videoFilePath = path.join(os.tmpdir(), "video.mp4");
      const outputFilePath = path.join(os.tmpdir(), "output.mp4");

      // 1. 音声ファイルをダウンロード
      console.log("音声ファイルをダウンロードしています...");
      const audioFile = storage.file(
        `user_audio/${audioData.userId}/${context.params.audioId}`
      );
      await audioFile.download({ destination: audioFilePath });
      console.log("音声ファイルダウンロード完了: ", audioFilePath);

      if (!fs.existsSync(audioFilePath)) {
        throw new Error(
          "音声ファイルのダウンロードに失敗しました。ファイルが存在しません。"
        );
      }

      // 2. Firestoreから動画のURLを取得し、Firebase Storageから動画をダウンロード
      console.log("動画の情報を取得中...");
      const videoDoc = await admin
        .firestore()
        .collection("videos")
        .doc(videoId)
        .get();
      if (!videoDoc.exists) {
        console.error("関連する動画が見つかりません: videoId =", videoId);
        throw new Error("関連する動画が見つかりません");
      }

      const videoData = videoDoc.data();
      console.log("videoData: ", videoData);

      const videoStoragePath = decodeURIComponent(
        videoData.url
          .replace(
            `https://firebasestorage.googleapis.com/v0/b/${storage.name}/o/`,
            ""
          )
          .split("?")[0]
      ); // クエリパラメータを削除
      console.log("Constructed video storage path:", videoStoragePath);

      const videoFile = storage.file(videoStoragePath);
      await videoFile.download({ destination: videoFilePath });

      console.log("動画ファイルダウンロード完了: ", videoFilePath);

      if (!fs.existsSync(videoFilePath)) {
        throw new Error(
          "動画ファイルのダウンロードに失敗しました。ファイルが存在しません。"
        );
      }

      // 3. 音声と動画を結合
      console.log("音声と動画を結合中...");
      await new Promise((resolve, reject) => {
        ffmpeg()
          .setFfmpegPath(ffmpegStatic)
          .input(videoFilePath)
          .input(audioFilePath)
          .outputOptions("-c:v", "copy")
          .outputOptions("-c:a", "aac")
          .output(outputFilePath)
          .on("end", async () => {
            console.log("音声と動画の結合が完了しました。");

            // サムネイル生成
            console.log("サムネイルを生成しています...");
            const thumbnailPath = path.join(os.tmpdir(), "thumbnail.png");
            await new Promise((resolve, reject) => {
              ffmpeg(videoFilePath)
                .setFfmpegPath(ffmpegStatic)
                .screenshots({
                  timestamps: ["1"],
                  filename: "thumbnail.png",
                  folder: os.tmpdir(),
                })
                .on("end", resolve)
                .on("error", reject);
            });
            console.log("サムネイル生成が完了しました: ", thumbnailPath);

            // サムネイルをFirebase Storageにアップロード
            const thumbnailFileName = `thumbnails/thumbnail_${Date.now()}.png`;
            await storage.upload(thumbnailPath, {
              destination: thumbnailFileName,
              contentType: "image/png",
            });
            const thumbnailUrl = `https://firebasestorage.googleapis.com/v0/b/${
              storage.name
            }/o/${encodeURIComponent(thumbnailFileName)}?alt=media`;

            // 4. 結合したMP4ファイルをFirebase Storageにアップロード
            console.log("結合した動画をFirebase Storageにアップロード中...");
            const outputFileName = `merged_videos/output_${Date.now()}.mp4`;
            await storage.upload(outputFilePath, {
              destination: outputFileName,
              contentType: "video/mp4",
            });
            console.log(
              "結合した動画のアップロードが完了しました: ",
              outputFileName
            );

            // 5. Firestoreに結合された動画のURLとサムネイルURLを保存
            const mergedVideoUrl = `https://firebasestorage.googleapis.com/v0/b/${
              storage.name
            }/o/${encodeURIComponent(outputFileName)}?alt=media`;
            await admin.firestore().collection("merged_videos").add({
              videoId: videoId,
              userId: audioData.userId,
              mergedVideoUrl,
              thumbnailUrl, // サムネイルURLを追加
              isPublic: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // 一時ファイルを削除
            fs.unlinkSync(audioFilePath);
            fs.unlinkSync(videoFilePath);
            fs.unlinkSync(outputFilePath);
            fs.unlinkSync(thumbnailPath); // サムネイルの削除
            console.log("一時ファイルを削除しました。");

            resolve();
          })
          .on("error", (err) => {
            console.error("音声と動画の結合中にエラーが発生しました:", err);
            reject(err);
          })
          .run();
      });

      // 5. Firestoreに結合された動画のURLを保存
      const mergedVideoUrl = `https://firebasestorage.googleapis.com/v0/b/${
        storage.name
      }/o/${encodeURIComponent(outputFileName)}?alt=media`;
      await admin.firestore().collection("merged_videos").add({
        videoId: videoId,
        userId: audioData.userId,
        mergedVideoUrl,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 一時ファイルを削除
      fs.unlinkSync(audioFilePath);
      fs.unlinkSync(videoFilePath);
      fs.unlinkSync(outputFilePath);
      console.log("一時ファイルを削除しました。");

      console.log("音声と動画の結合に成功しました");
    } catch (error) {
      console.error("音声と動画の結合に失敗しました:", error);
    }
  });
