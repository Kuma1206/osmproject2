import React, { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./style.module.scss";
import IcBaselineAccountBox from "@/components/Profileimage";
import { uploadProfileImage } from "../../firebase/client";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/client";
import UserMenu2 from "../UserMenu2";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth"; // 追加

const Mypage_profile = () => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userId = user.uid;
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          setProfileImage(userDoc.data().photoURL || null);
        }
      } else {
        router.push("/seisaku_page2"); // ログインしていない場合にリダイレクト
      }
    });

    return () => unsubscribe(); // クリーンアップ処理
  }, [router]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const imageUrl = await uploadProfileImage(file);
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
    }
  };

  const handleClick = () => {
    document.getElementById("fileInput")?.click();
  };

  return (
    <main className={styles.mainbox1}>
      <div className={styles.pbox}>
        {/* ログイン状態に応じて表示 */}
        {auth.currentUser ? (
          <div className={styles.profilebox}>
            <div className={styles.iconbox}>
              <UserMenu2 onClick={handleClick} />
            </div>
            <div className={styles.psheet}>
              <p className={styles.ptext}>NAME</p>
            </div>
          </div>
        ) : (
          <p className={styles.pimage} onClick={handleClick}>
            {profileImage ? (
              <Image
                src={profileImage}
                alt="Profile"
                className={styles.pimagebox2}
                width={100}
                height={100}
              />
            ) : (
              <IcBaselineAccountBox className={styles.pimagebox} />
            )}
          </p>
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
  );
};

export default Mypage_profile;
