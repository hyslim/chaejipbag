import { useId, type SVGProps } from "react";

type FavoriteHeartIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  active: boolean;
};

export function FavoriteHeartIcon({ active, ...props }: FavoriteHeartIconProps) {
  const definitionId = useId().replace(/:/g, "");

  if (!active) {
    const glassGradientId = `${definitionId}-glass`;

    return (
      <svg width="22" height="18" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
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

  const filterId = `${definitionId}-shadow`;
  const pinkGradientId = `${definitionId}-pink`;
  const pinkLayerGradientId = `${definitionId}-pink-layer`;
  const goldStrokeGradientId = `${definitionId}-gold-stroke`;
  const glassGradientId = `${definitionId}-glass`;
  const whiteStrokeGradientId = `${definitionId}-white-stroke`;

  return (
    <svg width="22" height="19" viewBox="0 0 22 19" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g filter={`url(#${filterId})`}>
        <path d="M18.5272 3.48421C20.4443 5.40699 20.4432 8.52871 18.5272 10.4504L13.0138 15.9801C11.9026 17.0946 10.1 17.0946 8.98877 15.9801L4.05455 11.0313L11.5805 3.48308C13.4976 1.56029 16.6101 1.56142 18.5261 3.48308L18.5272 3.48421Z" fill={`url(#${pinkGradientId})`} />
        <path d="M18.1733 3.83743L18.174 3.83812C19.8961 5.56528 19.8951 8.37049 18.174 10.0967L12.6607 15.6263C11.7444 16.545 10.2582 16.5445 9.34203 15.6256L4.7609 11.031L11.9332 3.83743C13.6553 2.11027 16.4522 2.11124 18.1733 3.83743Z" fill={`url(#${pinkLayerGradientId})`} stroke={`url(#${goldStrokeGradientId})`} />
        <path data-figma-bg-blur-radius="10.7" d="M3.82612 3.83947L3.82681 3.83878C5.54888 2.11162 8.34582 2.1126 10.0669 3.83878L17.2392 11.0323L12.6581 15.627C11.7419 16.5459 10.2557 16.5464 9.33947 15.6277L3.82612 10.098C2.10406 8.37087 2.10503 5.56566 3.82612 3.83947Z" fill={`url(#${glassGradientId})`} stroke={`url(#${whiteStrokeGradientId})`} />
      </g>
      <defs>
        <filter id={filterId} x="-1" y="0" width="24" height="20" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="0.5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.705882 0 0 0 0 0.768627 0 0 0 0 0.956863 0 0 0 0.35 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_215_233" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_215_233" result="shape" />
        </filter>
        <linearGradient id={pinkGradientId} x1="19.191" y1="3.36575" x2="7.24404" y2="14.3301" gradientUnits="userSpaceOnUse"><stop stopColor="#F26DFF" /><stop offset="1" stopColor="#FF027A" /></linearGradient>
        <linearGradient id={pinkLayerGradientId} x1="19.191" y1="3.36575" x2="7.24404" y2="14.3301" gradientUnits="userSpaceOnUse"><stop stopColor="#F26DFF" /><stop offset="1" stopColor="#FF027A" /></linearGradient>
        <linearGradient id={goldStrokeGradientId} x1="14.6786" y1="1.3594" x2="17.4696" y2="15.7183" gradientUnits="userSpaceOnUse"><stop stopColor="#FFEF78" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient>
        <linearGradient id={glassGradientId} x1="10.77" y1="16.9839" x2="14.034" y2="2.57077" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity="0.2" /><stop offset="1" stopColor="white" stopOpacity="0.49" /></linearGradient>
        <linearGradient id={whiteStrokeGradientId} x1="1.35541" y1="7.34453" x2="15.6781" y2="4.57697" gradientUnits="userSpaceOnUse"><stop stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient>
      </defs>
    </svg>
  );
}