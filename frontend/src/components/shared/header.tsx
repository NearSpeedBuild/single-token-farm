import { useEffect, useState } from "react";
import { Wallet } from "./wallet";
import { Link } from "react-router-dom";
const SCROLL_TOLERANCE = 8;
export function Header() {
  const [isHeaderFloating, setHeaderFloating] = useState(
    window.scrollY > SCROLL_TOLERANCE,
  );

  useEffect(() => {
    // Add/remove scrolling listener to isHeaderFloating
    const onScroll = () => setHeaderFloating(window.scrollY > SCROLL_TOLERANCE);

    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const classes =
    "transition-all fixed inset-0 bottom-auto z-50 flex items-center justify-between px-3 md:px-8 h-[74px]";
  const floatingClasses = " shadow-lg backdrop-blur bg-white-600";

  return (
    <div className="fixed w-full h-[74px] z-50 ">
      <header className={classes + (isHeaderFloating ? floatingClasses : "")}>
        <div className="flex gap-x-4 items-center">
          <Link to="/">
            <div className="sm:flex hidden">
              <img src="/steak.png" width={40} height={40} />
              <h1 className="text-white text-4xl font-bold ml-2">Steak</h1>
            </div>
          </Link>
        </div>

        <div className="flex gap-x-6 items-center">
          {/* Wallet Button/Menu */}
          <Wallet />
        </div>
      </header>
    </div>
  );
}
