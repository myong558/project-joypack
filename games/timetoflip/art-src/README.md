# 명화 카드 그림 만들기

카드 앞면 명화 32장(`src/art/*.webp`)은 **상업 이용이 명시된 미술관 공개 이미지**로만 만든다. 작품마다 받을 때 권리 표시를 확인하고, 아니면 건너뛴다.

| 출처 | 라이선스 | 받을 때 확인 | 표시 의무 |
| --- | --- | --- | --- |
| 메트로폴리탄 미술관 Open Access | CC0 | API `isPublicDomain` 이 `true` | 없음 |
| 시카고 미술관(Art Institute of Chicago) | CC0 | API `is_public_domain` 이 `true` | 없음 |
| 암스테르담 국립미술관(Rijksmuseum) | Public Domain Mark 1.0 | 작품 데이터에 `creativecommons.org/publicdomain/` 표시 | 없음 |
| 국립중앙박물관 | 공공누리 제1유형(출처표시) | 상세 페이지에 "공공누리 1유형" 표시(2~4유형은 쓰지 않음) | **있음**: 도감 작가 줄에 "국립중앙박물관", 배포본 `public/art-credits.txt` |

쓰지 않는 것: 상업 이용이 명시되지 않은 소장처의 그림(루브르 모나리자, 마우리츠하위스 진주 귀걸이를 한 소녀, 뉴욕 현대미술관 별이 빛나는 밤, 간송·리움 소장품 등), 위키백과 사본, 저작권이 남은 근현대 작품(팝아트 등).

고를 때: 미술을 잘 몰라도 "본 적 있다" 싶은 유명한 그림, 색이 선명한 그림을 먼저 고른다. 4색 팝아트(`pop`)는 얼굴이 크게 나온 초상에서만 알아보기 쉽다(어두운 군중 그림은 덩어리가 된다). 묶음마다 난이도(1~6판 순서)를 지킨다.

- `meta.json`: 카드 id → 소장처 작품 번호·제목·작가·연도·작품 페이지 주소·이미지 주소·라이선스(출처 기록)
- `spec.json`: 카드마다 자를 자리(가운데 `cx`·`cy`, 세로 비율 `hf`, 족자·화첩처럼 테두리·색표·종이 여백이 있으면 그림 부분 `box` [왼쪽, 위, 폭, 높이])와 처리(`pop` 4색 팝아트 팔레트, `ink` 흑백·대비)
- `dl.mjs`·`get.mjs`: 작품 번호로 이미지·정보 받기(권리 표시가 없으면 건너뜀, 요청 사이 쉼). 메트로폴리탄은 번호만, 나머지는 `aic:27992`·`rijks:SK-A-2344`·`nmk:551`(국립중앙박물관 relicId)
- `crop.mjs`: 받은 이미지를 200×256 webp 로 자르고 처리(저장소 node_modules 의 sharp 사용). 중요한 부분(얼굴·주제)이 카드 가운데 오도록 `cx`·`cy`·`hf` 를 맞춘다
- `credits.mjs`: `meta.json` → `public/art-credits.txt`(배포본 출처 목록)

다시 만들 때(게임 폴더에서):

```sh
node --use-system-ca art-src/dl.mjs <받을 폴더> <작품 번호...>
node art-src/crop.mjs <받은 폴더> src/art art-src/spec.json
node art-src/credits.mjs
```

카드를 바꾸면 `src/game/faces.ts` 의 `RENAMED_FACES` 에 예전 id → 새 id 를 더해 모은 도감이 이어지게 한다. 카드 이름·작가·설명 글은 `src/cards.ts`.
