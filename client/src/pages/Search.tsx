import { useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Link } from "wouter";
import { getPokachipColor, normalizePokachipName, type Fragment } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";

const SearchCard = ({ fragment }: { fragment: Fragment }) => (
  <Link href={`/fragment/${fragment.id}`}>
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_5px_18px_rgba(74,63,48,0.06)]">
      <h2
        className="line-clamp-2 break-words text-[14px] font-medium leading-snug text-[#3a3228]"
        style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
      >
        {fragment.title}
      </h2>
      {fragment.memo && <p className="mt-2 line-clamp-2 break-words text-[12px] leading-[18px] text-[#78706499]">{fragment.memo}</p>}
      <div className="mt-3 flex min-w-0 flex-wrap gap-1.5 overflow-hidden">
        {(fragment.pokachips ?? []).map((chip) => {
          const name = normalizePokachipName(chip);
          if (!name) return null;
          return (
            <span
              key={chip}
              className="max-w-full truncate rounded-full px-2.5 py-1 text-[10px] font-medium text-[#5a5248b0]"
              style={{ backgroundColor: getPokachipColor(name) }}
            >
              {name}
            </span>
          );
        })}
      </div>
    </div>
  </Link>
);

export const Search = () => {
  const { fragments } = useFragments();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const recentMemoryPieces = Array.from(
    new Set(
      fragments
        .flatMap((fragment) => fragment.pokachips ?? [])
        .map(normalizePokachipName)
        .filter(Boolean)
    )
  ).slice(0, 8);
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    inputRef.current?.blur();
  };

  const clearQuery = () => {
    setQuery("");
  };

  const results = normalizedQuery
    ? fragments.filter((fragment) => {
        const searchable = [
          fragment.title,
          fragment.memo,
          fragment.source,
          fragment.url,
          ...(fragment.pokachips ?? []).map(normalizePokachipName),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("ko-KR");
        return searchable.includes(normalizedQuery);
      })
    : [];

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#FAF8F4] sm:bg-[#f3f0ec]">
      <section className="min-h-screen w-full bg-[#FAF8F4] px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-6 sm:max-w-[390px]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
        <header className="-mx-4 -mt-6 border-b border-[#F5F2ED] bg-[#FFFEFB] px-4 pb-4 pt-6">
          <h1 className="text-[24px] font-medium text-[#353a69cc]">조각 찾기</h1>
        </header>
        <form onSubmit={handleSearchSubmit} className="mt-5 flex items-center gap-2 rounded-2xl border border-[#FAF7F2] bg-white px-4 py-3 shadow-[0_4px_14px_rgba(74,63,48,0.05)]">
          <span aria-hidden="true" className="text-[#a0988c80]">⌕</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="그 파란 거, 조명, 블렌더..."
            autoComplete="off"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[#3a3228] outline-none placeholder:text-[#a0988c80]"
          />
          {query && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={clearQuery}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#a0988c80]"
              aria-label="Clear search"
            >
              <X size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </form>

        {!normalizedQuery ? (
          <div className="mt-6">
            <p className="text-[12px] font-medium text-[#78706499]">최근 기억 조각</p>
            {recentMemoryPieces.length > 0 ? (
              <div className="mt-3 flex min-w-0 flex-wrap gap-2 overflow-hidden">
                {recentMemoryPieces.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setQuery(chip)}
                    className="max-w-full truncate rounded-full border border-white/70 px-3.5 py-1.5 text-[12px] font-medium text-[#5a5248b0]"
                    style={{ backgroundColor: getPokachipColor(chip) }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 break-words text-[13px] leading-[20px] text-[#a0988c]">아직 최근 기억 조각이 없어요. 조각을 담으면 여기에서 빠르게 찾아볼 수 있어요.</p>
            )}
          </div>
        ) : results.length > 0 ? (
          <div className="mt-6 flex min-w-0 flex-col gap-3">
            {results.map((fragment) => <SearchCard key={fragment.id} fragment={fragment} />)}
          </div>
        ) : (
          <div className="mt-10 text-center">
            <p className="text-[14px] font-medium text-[#787064]">찾는 조각이 아직 없어요.</p>
            <p className="mt-2 text-[12px] text-[#a0988c]">다른 기억 단서로 다시 찾아보세요.</p>
          </div>
        )}
      </section>
    </main>
  );
};
