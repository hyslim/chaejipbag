import type { SVGProps } from "react";

type PinterestIconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height" | "color"> & {
  size?: number;
  color?: string;
};

export const PinterestIcon = ({
  size = 16,
  color = "currentColor",
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}: PinterestIconProps) => (
  <svg
    {...props}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    color={color}
    className={className}
    aria-hidden={ariaHidden}
  >
    <path
      fill="currentColor"
      d="M12 2.5a9.5 9.5 0 0 0-3.4 18.37c-.08-1.54-.02-3.39.38-5.1l1.22-5.16s-.3-.62-.3-1.53c0-1.43.83-2.5 1.86-2.5.88 0 1.3.66 1.3 1.46 0 .89-.56 2.21-.85 3.43-.24 1.03.52 1.86 1.53 1.86 1.83 0 3.24-1.93 3.24-4.72 0-2.47-1.78-4.2-4.31-4.2-2.94 0-4.66 2.2-4.66 4.48 0 .89.34 1.84.77 2.36.08.1.1.18.07.29l-.29 1.18c-.05.19-.16.23-.36.14-1.34-.62-2.18-2.58-2.18-4.16 0-3.38 2.46-6.49 7.08-6.49 3.72 0 6.61 2.65 6.61 6.19 0 3.7-2.33 6.67-5.56 6.67-1.08 0-2.1-.56-2.45-1.23l-.67 2.54c-.24.93-.9 2.1-1.35 2.82.79.24 1.61.37 2.46.37A9.5 9.5 0 0 0 12 2.5Z"
    />
  </svg>
);