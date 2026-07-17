import { useLayoutEffect, useRef, type ChangeEvent, type KeyboardEvent, type TextareaHTMLAttributes } from "react";

export const normalizeSingleLineText = (value: string): string =>
  value.replace(/[\r\n]+/g, " ");

type AutoGrowingSingleLineTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "rows" | "value"
> & {
  value: string;
  onChange: (value: string) => void;
  minHeight: number;
  maxHeight: number;
};

export const AutoGrowingSingleLineTextarea = ({
  value,
  onChange,
  minHeight,
  maxHeight,
  style,
  onKeyDown,
  ...props
}: AutoGrowingSingleLineTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [maxHeight, minHeight, value]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(normalizeSingleLineText(event.target.value));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Enter") return;
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;

    event.preventDefault();
    event.currentTarget.blur();
  };

  return (
    <textarea
      {...props}
      ref={textareaRef}
      rows={1}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      enterKeyHint="done"
      style={{ ...style, minHeight, maxHeight }}
    />
  );
};
