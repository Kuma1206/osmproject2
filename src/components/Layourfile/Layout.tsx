import React, { ReactNode } from "react";
import { useRouter } from "next/router";
import { Tabs, TabList, Tab } from "react-tabs";
import { IoMdHome } from "react-icons/io";
import { PlusIcon, UserIcon } from "@heroicons/react/outline";
import classNames from "classnames";
import styles from "./style.module.scss";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const router = useRouter();
  const isHomePage = router.pathname === "/" || router.pathname === "/home";
  const isSeisakuPage = router.pathname === "/seisaku_page2";
  const isMyPage = router.pathname === "/mypage_profile";

  return (
    <>
      <header>{/* 共通ヘッダー */}</header>
      <main className={styles.mainbox}>
        <Tabs>
          <div className={styles.tabmenu}>
            <TabList className={styles.tabbox}>
              <Tab
                className={isHomePage ? styles.homeMain : styles.menubox}
                onClick={() => router.push("/home")}
              >
                <IoMdHome
                  className={styles.iconhome}
                  color={isHomePage ? "#000" : "#ccc"} // アクティブなら黒、非アクティブならグレー
                />
              </Tab>
              <Tab
                className={isSeisakuPage ? styles.homeMain : styles.menubox}
                onClick={() => router.push("/seisaku_page2")}
              >
                <PlusIcon
                  className={classNames(styles.icon, {
                    [styles.iconActive]: isSeisakuPage,
                  })}
                />
              </Tab>
              <Tab
                className={isMyPage ? styles.homeMain : styles.menubox}
                onClick={() => router.push("/mypage_profile")}
              >
                <UserIcon
                  className={classNames(styles.icon, {
                    [styles.iconActive]: isMyPage,
                  })}
                />
              </Tab>
            </TabList>
          </div>
        </Tabs>
        <div>{children}</div>
      </main>
    </>
  );
};

export default Layout;
