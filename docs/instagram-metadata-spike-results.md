# Instagram 공개 메타데이터 spike 결과

실행일: 2026-07-17 (Asia/Seoul)

실제 URL은 저장소에 기록하지 않고 환경변수로만 전달했다. 공개 기관/공개 계정의 post, Reel, carousel 후보를 일반 HTTP GET으로 각 2회 호출했다. Cookie, 로그인, token, browser automation, proxy는 사용하지 않았고 썸네일 URL을 다시 다운로드하지 않았다.

## 결과 요약

| 대상 | HTTP | 대표 이미지 | 계정명 | 본문 | 종류 | 반복 결과 |
|---|---:|---|---|---|---|---|
| 공개 일반 사진 | 200 | 가능 | 가능 | 가능 | `post` (`post/carousel` 후보) | 값/존재 여부 2/2 일치 |
| 공개 Reel | 200 | 가능 | 가능 | 가능 | canonical 포함 `reel` | 값/존재 여부 2/2 일치 |
| 공개 carousel | 200 | 첫 대표 이미지 가능 | 가능 | 가능(긴 본문 포함) | 표준 metadata만으로 post와 구분 불가 | 값/존재 여부 2/2 일치 |
| 본문이 긴 게시물 | 200 | 가능 | 가능 | 긴 본문 가능 | post/carousel 후보 | 성공 |
| 본문이 없는 게시물 | 미실행 | 미확인 | 미확인 | 미확인 | 미확인 | 사용자 URL 필요 |
| 삭제/존재하지 않는 shortcode | 200 | 없음 | 없음 | 없음 | URL fallback | `metadata-not-available` 안전 실패 |
| 비공개 계정 게시물 | 미실행 | 미확인 | 미확인 | 미확인 | URL fallback 예정 | 사용자 URL 필요 |
| 잘못된 URL | 요청 안 함 | 없음 | 없음 | 없음 | 없음 | `invalid-url` |
| Instagram이 아닌 URL | 요청 안 함 | 없음 | 없음 | 없음 | 없음 | `hostname-not-allowed` |
| tracking query 포함 URL | 200 | 가능 | 가능 | 가능 | 정상 분류 | query/hash 제거 확인 |

선정한 사진/Reel/carousel의 성공 호출 6회 평균은 약 553ms였다(관측 범위 약 407~686ms). 로그인/challenge 페이지나 401/403은 이 세 대상에서 반환되지 않았다.

## 실제 한계

- 응답은 Open Graph와 Twitter Card가 중심이었고 JSON-LD는 관측한 성공 대상에서 없었다.
- carousel도 대표 이미지 한 장은 제공됐지만 표준 metadata에는 slide 개수가 없었다. 따라서 `/p`는 `type: post`, `typeCandidates: [post, carousel]`로만 안전하게 표현한다.
- 동일 게시물의 계정명, 본문, 제목, 이미지 존재 여부는 반복 호출에서 같았지만 Instagram CDN의 서명 query가 매번 달라져 `thumbnailUrl` 문자열은 일치하지 않았다. 장기 보존 가능한 영구 URL로 보면 안 된다.
- 별도 공개 `/p` 후보 하나는 HTTP 200이면서 Open Graph/Twitter/JSON-LD가 모두 없어 `metadata-not-available`이었다. 공개 게시물이라고 항상 성공하지 않는다.
- 존재하지 않는 shortcode도 HTTP 404가 아니라 metadata 없는 큰 HTML 200을 반환했다. HTTP status만으로 삭제 여부를 판정할 수 없다.
- 512 KiB 제한에서는 일부 정상 공개 페이지까지 잘렸으므로, SSRF 방어를 유지하면서 최종 제한을 1 MiB로 조정했다.
- 실제 비공개 permalink와 본문 없는 공개 게시물은 제공되지 않아 네트워크 검증하지 않았다. 구현은 metadata가 없으면 계정명을 추정하지 않고 URL/type 후보만 남긴다.

## 공식 oEmbed 확인

Meta Graph API v25.0의 `instagram_oembed`를 같은 공개 Reel로 확인했다.

- token과 fields가 없는 기본 요청: HTTP 200, `version/provider/type/width/html`만 반환
- `thumbnail_url,author_name,title` fields 요청: HTTP 403, `(#200) Provide valid app ID`

즉 무토큰 경로는 embed HTML 표시에 쓸 수 있지만 이번 목표인 썸네일/작성자/본문 보강에는 충분하지 않다. 확장 fields는 최소 Meta app ID/credential 설정이 필요하므로 이번 spike에서는 구현하지 않았다.

## 판정

**B. 제한적 가능**

선정한 공개 사진, Reel, carousel에서 대표 이미지/계정명/본문을 반복해서 가져왔지만 모든 공개 URL에 metadata가 보장되지 않고, carousel 확정이 불가능하며, 썸네일 URL도 호출마다 바뀐다. 프로덕션에서는 성공을 기대하되 `metadata-not-available`과 기존 `Instagram 조각` fallback을 정상 흐름으로 취급해야 한다.
