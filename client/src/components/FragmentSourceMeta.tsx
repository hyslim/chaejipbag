import { Globe, Instagram, Pencil, Sparkles, Youtube } from "lucide-react";
import type { Fragment } from "@/data/fragments";

export type FragmentSourceKind =
  | "text"
  | "youtube"
  | "instagram"
  | "pinterest"
  | "chatgpt"
  | "website"
  | "record";

type FragmentSourceFields = Pick<Fragment, "source" | "sourceType" | "url" | "linkMetadata">;

export const getFragmentSourceMeta = (fragment: FragmentSourceFields): {
  kind: FragmentSourceKind;
  label: string;
} => {
  const sourceText = `${fragment.source ?? ""} ${fragment.url ?? ""}`.toLocaleLowerCase("en-US");
  const provider = fragment.linkMetadata?.provider?.toLocaleLowerCase("en-US") ?? "";

  if (fragment.sourceType === "text") return { kind: "text", label: "직접 입력" };
  if (
    fragment.sourceType === "youtube"
    || provider === "youtube"
    || sourceText.includes("youtube")
    || sourceText.includes("youtu.be")
  ) {
    return { kind: "youtube", label: "YouTube" };
  }
  if (provider === "instagram" || sourceText.includes("instagram")) {
    return { kind: "instagram", label: "Instagram" };
  }
  if (
    provider === "pinterest"
    || sourceText.includes("pinterest.com")
    || sourceText.includes("pin.it")
  ) {
    return { kind: "pinterest", label: "Pinterest" };
  }
  if (provider === "chatgpt" || sourceText.includes("chatgpt") || sourceText.includes("chat.openai")) {
    return { kind: "chatgpt", label: "ChatGPT" };
  }
  if (fragment.linkMetadata?.siteName) {
    return { kind: "website", label: fragment.linkMetadata.siteName };
  }
  if (fragment.sourceType === "link" || fragment.url) {
    return { kind: "website", label: "웹사이트" };
  }

  return { kind: "record", label: fragment.source || "기록" };
};

type FragmentSourceIconProps = {
  fragment: FragmentSourceFields;
  size: number;
  color: string;
  strokeWidth?: number;
  className?: string;
};

const PinterestIcon = ({
  size,
  color,
  className,
}: Omit<FragmentSourceIconProps, "fragment" | "strokeWidth">) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      fill={color}
      d="M7.6 21V3.2h5.3c4 0 6.5 2.3 6.5 5.9 0 3.7-2.7 6.2-6.7 6.2h-1.8V21H7.6Zm3.3-8.7h1.6c2.2 0 3.5-1.1 3.5-3.1 0-1.9-1.2-3-3.4-3h-1.7v6.1Z"
    />
  </svg>
);

export const FragmentSourceIcon = ({
  fragment,
  size,
  color,
  strokeWidth = 1.8,
  className,
}: FragmentSourceIconProps) => {
  const { kind } = getFragmentSourceMeta(fragment);
  const commonProps = { size, color, strokeWidth, className, "aria-hidden": true as const };

  if (kind === "text") return <Pencil {...commonProps} />;
  if (kind === "youtube") return <Youtube {...commonProps} />;
  if (kind === "instagram") return <Instagram {...commonProps} />;
  if (kind === "pinterest") return <PinterestIcon size={size} color={color} className={className} />;
  if (kind === "chatgpt") return <Sparkles {...commonProps} />;
  return <Globe {...commonProps} />;
};
