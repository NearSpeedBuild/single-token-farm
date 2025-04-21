import { ReactNode } from "react";

type Props = {
  maxW?: string;
  gradientText: string;
  bigText: string;
  bottomDescription: string;
  renderAsset?: JSX.Element;
  content?: JSX.Element;
  children?: ReactNode;
  onClick?: () => void;
  small?: boolean;
  actions?: JSX.Element;
  tooltip?: boolean;
  tooltipContent?: React.ReactNode;
};

export const TopCard = ({
  gradientText,
  bigText,
  bottomDescription,
}: Props) => {
  return (
    <div className="launchpad top-card flex">
      <div
        className={
          "py-7 pb-10 gap-1.5 overflow-hidden flex flex-wrap align-middle justify-between w-full color-white font-extrabold px-6 h-full rounded-lg bg-white-600 relative"
        }
      >
        <div className="flex flex-col relative flex-grow z-20 gap-y-4">
          <p className="text-base tracking leading-4 mb-0.5">{gradientText}</p>
          <h1 className="text-2xl tracking-tighter font-bolder leading-6">
            {bigText}
          </h1>
          <p className="font-semibold max-w-3xl text-3.5 tracking leading-4.5">
            {bottomDescription}
          </p>
        </div>
      </div>
    </div>
  );
};
