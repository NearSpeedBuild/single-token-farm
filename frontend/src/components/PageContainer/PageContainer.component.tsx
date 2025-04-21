import { PropsWithChildren } from "react";
import { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export const PageContainer = (props: PropsWithChildren<PropsWithChildren>) => {
  return (
    <div className="flex p-4 md:p-6 flex-col w-full mx-auto max-w-[1512px]">
      <div className="space-y-[38px] animate-fadeIn">
        <SkeletonTheme baseColor="#FFFFFF00" highlightColor="#FFFFFF1A">
          {props.children}
        </SkeletonTheme>
      </div>
    </div>
  );
};

export default PageContainer;
