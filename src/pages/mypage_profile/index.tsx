import React, { useState, useEffect } from "react";
import { BsPencil } from "react-icons/bs";
import Header_whtie from "@/components/Header_white";
import styles from "./style.module.scss";
import { uploadProfileImage } from "../../firebase/client";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";

// Firebaseに保存するための型
type Params = {
  id: string;
};

const MypageProfile = ({ params }: { params: Params }) => {
  const [currentUser, setCurrentUser] = useState({
    id: params?.id,
    name: "Kuma",
    username: "testuser",
    image: "https://via.placeholder.com/150",
    bio: "自己紹介文がここに表示されます。",
    gender: "男性",
    link: "https://example.com",
    followers: 44000,
    following: 10000,
    videos: ["動画1", "動画2", "動画3"],
    likes: ["いいねした動画1", "いいねした動画2", "いいねした動画2"],
    savedItems: ["保存した動画1", "保存した動画2", "保存した動画2"],
  });

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editedName, setEditedName] = useState(currentUser.name);
  const [editedUsername, setEditedUsername] = useState(currentUser.username);
  const [editedBio, setEditedBio] = useState(currentUser.bio);
  const [editedGender, setEditedGender] = useState(currentUser.gender);
  const [editedLink, setEditedLink] = useState(currentUser.link);
  const [editedImage, setEditedImage] = useState(currentUser.image);
  const [activeTab, setActiveTab] = useState("videos");
  const router = useRouter();

  // Firebaseからプロフィール画像を取得
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userId = user.uid;
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser({
            ...currentUser,
            name: userData.name || currentUser.name,
            username: userData.username || currentUser.username,
            image: userData.photoURL || currentUser.image,
            bio: userData.bio || currentUser.bio,
            gender: userData.gender || currentUser.gender,
            link: userData.link || currentUser.link,
          });
          setProfileImage(userData.photoURL || null);
        }
      } else {
        router.push("/login"); // ログインしていない場合のリダイレクト
      }
    });

    return () => unsubscribe(); // クリーンアップ処理
  }, [router]);

  // プロフィール画像のアップロード処理
  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const imageUrl = await uploadProfileImage(file);
        setEditedImage(imageUrl);
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

  // プロフィールの更新処理
  const handleProfileUpdate = async () => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      try {
        await setDoc(
          doc(db, "users", userId),
          {
            name: editedName,
            username: editedUsername,
            bio: editedBio,
            gender: editedGender,
            link: editedLink,
            photoURL: editedImage,
          },
          { merge: true }
        );
        setCurrentUser({
          ...currentUser,
          name: editedName,
          username: editedUsername,
          bio: editedBio,
          gender: editedGender,
          link: editedLink,
          image: editedImage,
        });
        setIsEditProfileOpen(false); // モーダルを閉じる
      } catch (error) {
        console.error("プロフィールの更新に失敗しました:", error);
      }
    }
  };

  return (
    <>
      <Header_whtie />
      <div className={styles.profileContainer}>
        <div className={styles.profileDetails}>
          <img
            className={styles.profileImage}
            src={currentUser.image}
            alt="Profile"
          />
          <div className={styles.mainbox}>
            <h1 className={styles.profileName}>{currentUser.name}</h1>
            <p className={styles.profileInfo}>@{currentUser.username}</p>
            <p className={styles.profileInfo}>{currentUser.bio}</p>
            <p className={styles.profileInfo}>性別: {currentUser.gender}</p>
            <p className={styles.profileInfo}>
              リンク: <a href={currentUser.link}>{currentUser.link}</a>
            </p>
            <button
              onClick={() => setIsEditProfileOpen(true)}
              className={styles.profileButton}
            >
              <BsPencil />
              プロフィールを編集
            </button>
          </div>
        </div>

        <div className={styles.followStats}>
          <div className={styles.followStat}>
            <span>{currentUser.following}</span> Following
          </div>
          <div className={styles.followStat}>
            <span>{currentUser.followers}</span> Followers
          </div>
        </div>

        <ul className={styles.tabs}>
          <li
            className={`${styles.tabItem} ${
              activeTab === "videos" ? styles.active : styles.inactive
            }`}
            onClick={() => setActiveTab("videos")}
          >
            Videos
          </li>
          <li
            className={`${styles.tabItem} ${
              activeTab === "likes" ? styles.active : styles.inactive
            }`}
            onClick={() => setActiveTab("likes")}
          >
            Likes
          </li>
          <li
            className={`${styles.tabItem} ${
              activeTab === "savedItems" ? styles.active : styles.inactive
            }`}
            onClick={() => setActiveTab("savedItems")}
          >
            Saved
          </li>
        </ul>

        <div className={styles.tabContent}>
          {activeTab === "videos" ? (
            <ul className={styles.itembox}>
              {currentUser.videos.map((video, index) => (
                <li key={index} className={styles.videoItem}>
                  {video}
                </li>
              ))}
            </ul>
          ) : activeTab === "likes" ? (
            <ul className={styles.itembox}>
              {currentUser.likes.map((like, index) => (
                <li key={index} className={styles.likeItem}>
                  {like}
                </li>
              ))}
            </ul>
          ) : (
            <ul className={styles.itembox}>
              {currentUser.savedItems.map((item, index) => (
                <li key={index} className={styles.savedItem}>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {isEditProfileOpen && (
          <div className={styles.editModal}>
            <div className={styles.modalContent}>
              <h2>プロフィール編集</h2>

              <div className="mb-4">
                <p className="mb-2">プロフィール画像:</p>
                <img
                  src={editedImage}
                  alt="Profile Preview"
                  className={styles.profileImage}
                />
                <input type="file" onChange={handleImageChange} />
              </div>

              <label className={styles.inputField}>
                名前:
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                />
              </label>

              <label className={styles.inputField}>
                ユーザー名:
                <input
                  type="text"
                  value={editedUsername}
                  onChange={(e) => setEditedUsername(e.target.value)}
                />
              </label>

              <label className={styles.inputField}>
                自己紹介:
                <textarea
                  value={editedBio}
                  onChange={(e) => setEditedBio(e.target.value)}
                />
              </label>

              <label className={styles.inputField}>
                性別:
                <select
                  value={editedGender}
                  onChange={(e) => setEditedGender(e.target.value)}
                >
                  <option value="男性">男性</option>
                  <option value="女性">女性</option>
                  <option value="その他">その他</option>
                </select>
              </label>

              <label className={styles.inputField}>
                リンク:
                <input
                  type="text"
                  value={editedLink}
                  onChange={(e) => setEditedLink(e.target.value)}
                />
              </label>

              <div className={styles.buttonGroup}>
                <button
                  className={styles.saveButton}
                  onClick={handleProfileUpdate}
                >
                  保存
                </button>
                <button
                  className={styles.cancelButton}
                  onClick={() => setIsEditProfileOpen(false)}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MypageProfile;
