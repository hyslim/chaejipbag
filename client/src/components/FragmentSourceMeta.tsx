import { Globe, Instagram, Pencil, Sparkles, Youtube } from "lucide-react";
import { PinterestIcon } from "@/components/PinterestIcon";
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
  const siteName = fragment.linkMetadata?.siteName?.toLocaleLowerCase("en-US") ?? "";

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
    provider.includes("pinterest")
    || siteName.includes("pinterest")
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
