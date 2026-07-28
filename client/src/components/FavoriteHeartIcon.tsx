import { useId, type AriaAttributes, type AriaRole } from "react";
import favoriteHeartActive from "@/assets/favorite-heart-active.png";

type FavoriteHeartIconProps = {
  active: boolean;
  className?: string;
  role?: AriaRole;
  "aria-hidden"?: AriaAttributes["aria-hidden"];
  "aria-label"?: string;
};

export function FavoriteHeartIcon({ active, className, role, "aria-hidden": ariaHidden, "aria-label": ariaLabel }: FavoriteHeartIconProps) {
  const definitionId = useId().replace(/:/g, "");
  const accessibilityProps = { role, "aria-hidden": ariaHidden, "aria-label": ariaLabel };

  if (!active) {
    const glassGradientId = `${definitionId}-glass`;

    return (
      <svg width="22" height="18" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...accessibilityProps}>
        <path d="M18.1733 3.83743L18.174 3.83812C19.8961 5.56528 19.8951 8.37049 18.174 10.0967L12.6607 15.6263C11.7444 16.545 10.2582 16.5445 9.34203 15.6256L4.7609 11.031L11.9332 3.83743C13.6553 2.11027 16.4522 2.11124 18.1733 3.83743Z" stroke="#787064" strokeOpacity="0.68" />
        <path data-figma-bg-blur-radius="10.7" d="M3.82613 3.83947L3.82682 3.83878C5.54889 2.11162 8.34582 2.1126 10.0669 3.83878L17.2392 11.0323L12.6581 15.627C11.742 16.5459 10.2557 16.5464 9.33948 15.6277L3.82613 10.098C2.10407 8.37087 2.10504 5.56566 3.82613 3.83947Z" fill={`url(#${glassGradientId})`} stroke="#787064" strokeOpacity="0.68" />
        <defs>
          <linearGradient id={glassGradientId} x1="10.77" y1="16.9839" x2="14.034" y2="2.57077" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.2" />
            <stop offset="1" stopColor="white" stopOpacity="0.49" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  return <img src={favoriteHeartActive} alt="" className={`${className ?? ""} scale-[1.09]`} draggable={false} {...accessibilityProps} />;
}