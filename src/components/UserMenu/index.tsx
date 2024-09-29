import { Menu, Transition } from "@headlessui/react";
import { Fragment, ReactNode } from "react";
import { useAuth } from "../../context/auth";
import Avatar from "../Avatar";
import { CogIcon, LogoutIcon, UserIcon } from "@heroicons/react/solid";
import MenuLink from "../Menu-link.tsx";
import { logout } from "../../lib/auth";
import { useRouter } from "next/router";
import styles from "./style.module.scss"; // SCSSスタイルをインポート

const links = [
  {
    label: "β機能",
    icon: <UserIcon />,
    path: "https://navygoat27.sakura.ne.jp/video-streaming-site/", // 外部リンク
    external: true, // 外部リンクの場合はフラグを立てる
  },
  {
    label: "マイページ",
    icon: <UserIcon />,
    path: "/mypage",
    external: false, // 内部リンクの場合はfalse
  },
  {
    label: "設定",
    icon: <CogIcon />,
    path: "/settings",
    external: false,
  },
];

const ListItem = ({
  active,
  icon,
  label,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
}) => {
  return (
    <span className={`${styles.listItem} ${active ? styles.active : ""}`}>
      <span
        className={`${styles.icon} ${
          active ? styles.iconActive : styles.iconInactive
        }`}
      >
        {icon}
      </span>
      <span className={styles.label}>{label}</span>
    </span>
  );
};

const UserMenu = () => {
  const user = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout(); // ログアウト処理を待機
    router.push("/"); // ホームページにリダイレクト
  };

  if (!user) {
    return null;
  }

  return (
    <Menu as="div" className={styles.userMenu}>
      <Menu.Button className={styles.menuButton}>
        <Avatar src={user?.photoURL} />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className={styles.menuItems}>
          <div className={styles.menuLinks}>
            {links.map((link) => (
              <Menu.Item key={link.path}>
                {({ active }) =>
                  link.external ? (
                    <a
                      href={link.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      <ListItem
                        icon={link.icon}
                        label={link.label}
                        active={active}
                      />
                    </a>
                  ) : (
                    <MenuLink href={link.path}>
                      <ListItem
                        icon={link.icon}
                        label={link.label}
                        active={active}
                      />
                    </MenuLink>
                  )
                }
              </Menu.Item>
            ))}
          </div>
          <div className={styles.logout}>
            <Menu.Item>
              {({ active }) => (
                <button className={styles.logoutButton} onClick={handleLogout}>
                  <ListItem
                    icon={<LogoutIcon />}
                    label="ログアウト"
                    active={active}
                  />
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default UserMenu;
