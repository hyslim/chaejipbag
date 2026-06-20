import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const recentTags = [
  { label: "글쓰기", color: "bg-[#eec4d066]" },
  { label: "수조", color: "bg-[#a8dce866]" },
  { label: "조명", color: "bg-[#eed89866]" },
  { label: "웹앱", color: "bg-[#b8ccf266]" },
  { label: "블렌더", color: "bg-[#b2e2f866]" },
];

const navItems = [
  {
    key: "home",
    label: "홈",
    icon: "/figmaAssets/chart-pie-portfolio-no-coral.svg",
    iconClassName: "w-6 h-6",
    active: false,
  },
  {
    key: "record",
    label: "기록",
    icon: "/figmaAssets/heart.png",
    iconClassName: "w-[43.14px] h-[41.43px] -my-[3px]",
    active: false,
  },
];

export const Element = (): JSX.Element => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (label: string) => {
    setSelectedTags((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label],
    );
  };

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f3f3] px-4 py-12">
      <section className="flex min-h-[844px] w-full max-w-[390px] flex-col overflow-hidden bg-[#faf8f4] shadow-[0px_4px_16px_#0000000f,0px_16px_64px_#0000001f]">
        <header className="border-b border-[#faf7f20d] bg-[#fcfbf8] px-5 pb-4 pt-6">
          <p className="[font-family:'Pretendard_Variable-SemiBold',Helvetica] text-sm font-semibold leading-[15px] tracking-[0.80px] text-[#787064b2]">
            조각 담기
          </p>
          <h1 className="pt-1 [font-family:'Pretendard_Variable-Medium',Helvetica] text-[22px] font-medium leading-[30.8px] text-[#353a69b2]">
            어떤 조각을 주웠나요?
          </h1>
        </header>
        <div className="flex flex-1 flex-col px-5 py-4">
          <div className="flex flex-1 flex-col">
            <Card className="rounded-[18px] border border-[#ffffffe6] bg-white shadow-[0px_2px_10px_#0000000f]">
              <CardContent className="p-0">
                <section className="px-4 pb-2 pt-3.5">
                  <p className="[font-family:'Inter',Helvetica] text-sm font-normal leading-[22.4px] text-[#99a1af]">
                    링크, 텍스트, 짧은 생각
                    <br />
                    지금 이 순간의 발견을 담아두세요
                  </p>
                </section>
                <div className="px-2.5 pb-2.5 pt-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full rounded-[10px] bg-[#00000008] px-4 py-3 hover:bg-[#00000010]"
                  >
                    <img
                      className="h-3.5 w-3.5"
                      alt="Icon"
                      src="/figmaAssets/icon.svg"
                    />
                    <span className="[font-family:'Inter',Helvetica] text-xs font-medium leading-[18px] text-[#8c8478b8]">
                      이미지
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
            <section className="pt-4">
              <div className="flex flex-col gap-2.5">
                <header className="flex flex-col">
                  <div className="flex items-start gap-1">
                    <img
                      className="h-4 w-3"
                      alt="Glass"
                      src="/figmaAssets/glass.svg"
                    />
                    <h2 className="[font-family:'Pretendard_Variable-SemiBold',Helvetica] text-sm font-semibold leading-[18px] text-[#787064bf]">
                      기억 조각
                    </h2>
                  </div>
                  <p className="pt-0.5 [font-family:'Pretendard_Variable-Regular',Helvetica] text-xs font-normal leading-[16.5px] text-[#a0988c99]">
                    지금 남기지 않아도 괜찮아요.
                  </p>
                </header>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start gap-2 rounded-[14px] border-[#0000000f] bg-white px-3 py-[9px] shadow-[0px_1px_4px_#0000000a] hover:bg-white"
                >
                  <span className="[font-family:'Inter',Helvetica] text-[13px] font-normal leading-[19.5px] text-[#a0988cb2]">
                    +
                  </span>
                  <span className="[font-family:'Inter',Helvetica] text-[13px] font-normal leading-normal text-[#99a1af]">
                    새로운 조각이름 달기
                  </span>
                </Button>
                <div className="flex flex-col gap-2">
                  <p className="pt-1 [font-family:'Pretendard_Variable-Medium',Helvetica] text-xs font-medium leading-[15px] tracking-[0.80px] text-[#a0988c8c]">
                    최근 사용
                  </p>
                  <div className="flex flex-wrap gap-x-1 gap-y-2">
                    {recentTags.map((tag) => {
                      const selected = selectedTags.includes(tag.label);

                      return (
                        <Badge
                          key={tag.label}
                          asChild
                          className={`h-[30px] cursor-pointer rounded-[71px] border border-[#ffffff8c] px-3.5 py-1.5 shadow-[inset_0px_1px_0px_#ffffff94,0px_1px_4px_#eec4d059] ${tag.color} ${
                            selected ? "ring-1 ring-[#8c84784d]" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleTag(tag.label)}
                            className="h-[30px] [font-family:'Pretendard-Medium',Helvetica] text-xs font-medium leading-[16.5px] text-[#322c22b2]"
                          >
                            {tag.label}
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
            <div className="mt-auto pt-16">
              <Button
                type="button"
                disabled
                className="h-auto w-full rounded-[999px] border border-[#ffffffb2] bg-[#c8c4bc80] px-6 py-4 [font-family:'Pretendard_Variable-Medium',Helvetica] text-base font-medium leading-[22.5px] text-[#a0988c99] opacity-100 hover:bg-[#c8c4bc80]"
              >
                기억 남기기
              </Button>
            </div>
          </div>
        </div>
        <footer className="px-5 pb-6 pt-2">
          <nav
            aria-label="하단 내비게이션"
            className="flex items-center justify-between gap-3 rounded-full border border-[#ffffff7a] bg-[#ffffff24] px-2.5 py-[7px] shadow-[0px_8px_14.7px_-5px_#0000001a] backdrop-blur-[4.45px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(4.45px)_brightness(100%)]"
          >
            {navItems.map((item, _index) => (
              <Button
                key={item.key}
                type="button"
                variant="ghost"
                className="h-auto rounded-full bg-[#ffffff9e] px-3 py-3 shadow-[inset_0px_1px_0px_#fffffff2,0px_1px_6px_#0000000f] hover:bg-[#ffffffb5]"
              >
                <img
                  className={item.iconClassName}
                  alt={item.label}
                  src={item.icon}
                />
                <span className="px-2.5 [font-family:'Pretendard-Medium',Helvetica] text-sm font-medium leading-[13.5px] tracking-[0.72px] text-[#645e54a6]">
                  {item.label}
                </span>
              </Button>
            ))}

            <Button
              type="button"
              variant="ghost"
              className="h-auto shrink-0 rounded-full p-0 hover:bg-transparent"
              aria-label="추가"
            >
              <img
                className="h-[98px] w-[98px] -my-[25px]"
                alt="Button"
                src="/figmaAssets/button.svg"
              />
            </Button>
          </nav>
        </footer>
      </section>
    </main>
  );
};
