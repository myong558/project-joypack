# 명화 카드 그림 만들기

카드 앞면 명화 32장(`src/art/*.webp`)은 **메트로폴리탄 미술관 Open Access** 이미지로 만든다. Open Access 작품은 CC0(퍼블릭 도메인 헌정)이라 상업적 이용·수정·재배포에 허락이 필요 없다. 쓸 때마다 API 의 `isPublicDomain` 이 `true` 인 작품만 받는다(같은 미술관 작품이라도 false 면 쓰지 않는다).

- `meta.json`: 카드 id → 미술관 작품 번호·제목·작가·연도·작품 페이지 주소·이미지 주소(출처 기록)
- `spec.json`: 카드마다 자를 자리(가운데 `cx`·`cy`, 세로 비율 `hf`)와 처리(`pop` 4색 팝아트 팔레트, `ink` 흑백·대비)
- `dl.mjs`·`get.mjs`: 작품 번호로 이미지·정보 받기(퍼블릭 도메인이 아니면 건너뜀, 요청 사이 쉼)
- `crop.mjs`: 받은 이미지를 200×256 webp 로 자르고 처리(저장소 node_modules 의 sharp 사용)

다시 만들 때(게임 폴더에서):

```sh
node --use-system-ca art-src/dl.mjs <받을 폴더> <작품 번호...>
node art-src/crop.mjs <받은 폴더> src/art art-src/spec.json
```

카드 이름·작가·설명 글은 `src/cards.ts`.
