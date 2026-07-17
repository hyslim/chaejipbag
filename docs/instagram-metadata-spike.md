# Instagram 공개 메타데이터 spike

이 코드는 QuickSave나 저장 구조에 연결되지 않은 독립 기술 실험이다. 로그인 쿠키, Instagram 세션, 브라우저 자동화, CAPTCHA 우회, 프록시, 외부 scraping 서비스는 사용하지 않는다.

## 구조

- `api/instagram-metadata.ts`: `GET /api/instagram-metadata?url=...` Vercel Function
- `api/_instagram-metadata.ts`: URL 검증, 제한된 HTTP fetch, 공개 HTML metadata 파서
- `script/instagram-metadata-spike.ts`: 사용자 제공 URL 목록을 반복 호출하는 로컬 runner
- `api/_instagram-metadata.test.ts`: parser 및 SSRF/redirect/timeout/크기 제한 테스트

현재 Vercel 설정은 정적 Vite 산출물을 `dist/public`에서 제공한다. Vercel은 프로젝트 루트의 `api` 파일을 별도 Function으로 만들며 filesystem route를 rewrite보다 먼저 처리하므로 기존 SPA rewrite나 Express 골격을 바꾸지 않는다.

## 실행

PowerShell에서 URL을 직접 넘길 수 있다.

```powershell
npm.cmd run spike:instagram -- "https://www.instagram.com/p/SHORTCODE/" "https://www.instagram.com/reel/SHORTCODE/"
```

레이블과 함께 JSON 환경변수로 넘길 수도 있다. 실제 URL이나 토큰은 저장소에 커밋하지 않는다.

```powershell
$env:INSTAGRAM_SPIKE_URLS='[{"label":"public-photo","url":"https://www.instagram.com/p/SHORTCODE/"},{"label":"public-reel","url":"https://www.instagram.com/reel/SHORTCODE/"}]'
$env:INSTAGRAM_SPIKE_REPEAT='2'
npm.cmd run spike:instagram
```

또는 같은 JSON 배열/한 줄당 URL 형식의 로컬 파일 경로를 `INSTAGRAM_SPIKE_URLS_FILE`에 지정한다. 반복 횟수는 대량 호출을 막기 위해 1~5로 제한된다. 각 호출은 JSON 한 줄, 마지막 줄은 평균 응답 시간과 반복 결과 일관성 요약이다.

테스트용 목록은 다음 레이블을 권장한다.

1. `public-photo`
2. `public-reel`
3. `public-carousel`
4. `long-caption`
5. `empty-caption`
6. `deleted`
7. `private`
8. `invalid-url`
9. `non-instagram`
10. `tracking-parameters`

단위 검증은 다음과 같다.

```powershell
npm.cmd run test:instagram-spike
npm.cmd run check
npm.cmd run build
git diff --check
```

## 응답과 추출 순서

정규 URL은 `https://www.instagram.com/{p|reel}/{shortcode}/` 형태다. `reels`와 `tv`는 `reel`로 통합하며 query/hash는 모두 제거한다.

필드 우선순위:

- 대표 이미지: JSON-LD image → `og:image` → `twitter:image`
- 계정명: JSON-LD author → 공개 title/description의 명시적 `@username`/`username on Instagram` 패턴
- 본문: JSON-LD articleBody/caption/description → 공개 description 안의 인용 본문
- 제목: 본문 첫 문장 → JSON-LD headline/name → `og:title` → `twitter:title`
- canonical: 같은 shortcode의 지원 URL일 때만 결과 URL에 반영
- 종류: `/reel`, `/reels`, `/tv`는 reel, `/p`는 `typeCandidates: ["post", "carousel"]`, JSON-LD에 복수 image가 명시되면 carousel로 확정

계정명은 URL 경로에서 추정하지 않는다. `/p`만으로 carousel 여부를 항상 알 수 없으므로 structured data가 없으면 `type`은 post로 두되 post/carousel 두 후보를 함께 반환한다.

## 안전 제한

- 입력 hostname은 `instagram.com`, `www.instagram.com`, `m.instagram.com`만 허용
- 입력 HTTP는 HTTPS로 승격하고, 실제 fetch/redirect는 HTTPS만 허용; credentials, 명시적 port, 지원하지 않는 path 거부
- redirect 수동 처리 후 매 단계 hostname 재검증
- 4초 timeout, HTML 1 MiB 제한, HTML content-type 확인
- 쿠키/토큰을 전송하지 않고 썸네일을 다운로드하지 않음
- 응답과 Function에 `no-store` 적용
- 로그인/challenge HTML, 401/403, 404/410, metadata 부재를 명시적 실패 reason으로 반환

## 공식 경로 메모

Meta의 Instagram oEmbed는 공개 post/reel을 embed하거나 thumbnail/author metadata를 받는 공식 후보지만 Access Token과 Meta 앱/oEmbed 기능 설정이 필요하다. 현재 앱에는 관련 토큰과 검토 상태가 없으므로 이 spike에는 구현하지 않았다. 일반 Instagram Graph API는 로그인한 Professional 계정 중심이며 임의의 소비자 공개 게시물 URL을 범용 저장하는 대체 경로가 아니다.

- [Meta Instagram oEmbed](https://developers.facebook.com/docs/instagram-platform/oembed/)
- [Meta 공식 Instagram API 컬렉션](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)
- [Vercel Functions](https://vercel.com/docs/functions)

## 해석 기준

- A: public photo/reel/carousel 여러 유형에서 이미지와 텍스트가 반복 호출에도 안정적
- B: 일부 공개 게시물에서만 확보되어 URL fallback과 실패 허용이 필수
- C: 로그인/challenge/차단 또는 metadata 부재가 우세해 일반 HTTP metadata 방식이 부적합

실제 A/B/C 판정은 사용자 제공 공개 URL 세트를 runner로 실행한 결과에 근거해 갱신한다.
