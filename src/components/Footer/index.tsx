import React from "react";
import { useRouter } from "next/router";
import styles from "./style.module.scss";
import Link from "next/link";
import { HomeIcon, PlusIcon, UserIcon } from "@heroicons/react/outline";

const Footer = () => {
  const router = useRouter();

  return (
    <ul className={styles.menubox}>
      <li>
        <Link href={"/"}>
          <HomeIcon
            className={
              router.pathname === "/" ? styles.iconActive : styles.icon
            }
          />
        </Link>
      </li>
      <li>
        <Link href={"/seisaku_page2"}>
          <PlusIcon
            className={
              router.pathname === "/seisaku_page2"
                ? styles.iconActive
                : styles.icon
            }
          />
        </Link>
      </li>
      <li>
        <Link href="/mypage_profile">
          <UserIcon
            className={
              router.pathname === "/mypage_profile"
                ? styles.iconActive
                : styles.icon
            }
          />
        </Link>
      </li>
    </ul>
  );
};

export default Footer;
