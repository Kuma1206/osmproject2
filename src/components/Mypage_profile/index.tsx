import React, { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./style.module.scss";
import IcBaselineAccountBox from "@/components/Profileimage";
import { uploadProfileImage } from "../../firebase/client";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/client";
import UserMenu2 from "../UserMenu2";
import { useRouter } from "next/router";

const Mypage_profile = () => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const router = useRouter(); // useRouter フックを使ってルーターを取得

  useEffect(() => {
    const fetchUserData = async () => {
      const userId = auth.currentUser?.uid;
      if (userId) {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          setProfileImage(userDoc.data().photoURL || null);
        }
      }
    };

    // ユーザーがログインしているか確認
    if (auth.currentUser) {
      router.push("/seisaku_page2"); // ログインしている場合、/mypage にリダイレクト
    } else {
      fetchUserData();
    }
  }, [router]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    console.log("選択されたファイル:", file);

    if (file) {
      try {
        console.log("アップロードを開始します:", file.name);
        const imageUrl = await uploadProfileImage(file);
        console.log("画像のアップロードに成功:", imageUrl);
        setProfileImage(imageUrl);

        const userId = auth.currentUser?.uid;

        if (userId) {
          await setDoc(
            doc(db, "users", userId),
            { photoURL: imageUrl },
            { merge: true }
          );
        }
      } catch (error) {
        console.error("画像のアップロードに失敗しました:", error);
      }
    } else {
      console.log("ファイルが選択されていません。");
    }
  };

  const handleClick = () => {
    document.getElementById("fileInput")?.click();
  };

  return (
    <>
      <main className={styles.mainbox1}>
        <div className={styles.pbox}>
          {/* ユーザーがログインしていない場合のみpimageを表示 */}
          {!auth.currentUser && (
            <p className={styles.pimage} onClick={handleClick}>
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt="Profile"
                  className={styles.pimagebox2}
                  width={100} // 必須の width
                  height={100} // 必須の height
                />
              ) : (
                <IcBaselineAccountBox className={styles.pimagebox} />
              )}
            </p>
          )}
          <div className={styles.iconbox}>
            {auth.currentUser && <UserMenu2 onClick={handleClick} />}
          </div>
          {/* ユーザーがログインしている場合のみptextを表示 */}
          {auth.currentUser && (
            <div className={styles.psheet}>
              <p className={styles.ptext}>NAME</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            id="fileInput"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
        </div>
      </main>
    </>
  );
};

export default Mypage_profile;
