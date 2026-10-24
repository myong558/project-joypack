import type { FaceId, SetId, SpecialId } from './game/faces';
import { getLang, t } from './i18n';

/**
 * 도감 설명: 묶음 이름과 카드마다 제목·작가·한두 줄 설명(한국어·영어).
 * 도형·팝아트(조이팩이 직접 그린 그림)는 "작가 미상"의 지어낸 우스개 설명,
 * 명화는 실제 작가·연도·짧은 이야기. 명화 그림은 모두 메트로폴리탄 미술관 Open Access(CC0) 이미지다(art-src/meta.json)
 */
interface Text {
  title: string;
  by: string;
  desc: string;
}
type Entry = { ko: Text; en: Text };

const SETS: Record<SetId, { ko: string; en: string }> = {
  shape: { ko: '도형', en: 'Shapes' },
  pop: { ko: '팝아트', en: 'Pop Art' },
  popart: { ko: '명화 팝', en: 'Masterpiece Pop' },
  landscape: { ko: '서양화 · 풍경', en: 'Western Landscapes' },
  life: { ko: '서양화 · 인물과 정물', en: 'Western Figures & Still Life' },
  ink: { ko: '동양화 · 수묵', en: 'Ink Painting' },
};

const anon = { ko: '작가 미상 · 연도 미상', en: 'Artist unknown · date unknown' };
const joke = (koTitle: string, ko: string, enTitle: string, en: string): Entry => ({
  ko: { title: koTitle, by: anon.ko, desc: ko },
  en: { title: enTitle, by: anon.en, desc: en },
});
const art = (ko: Text, en: Text): Entry => ({ ko, en });
const pop = (koArtist: string, enArtist: string, year: string) => ({
  ko: `원작 ${koArtist}(${year}) · 팝아트 편집 조이팩`,
  en: `After ${enArtist} (${year}) · pop edit by Joypack`,
});

const CARDS: Record<FaceId, Entry> = {
  /* ---------- 도형: 작가 미상 우스개 ---------- */
  circle: joke('빨간 동그라미', '모서리가 하나도 없어 굴러다니다 작가를 잃어버렸다는 전설의 작품.', 'Red Circle', 'Not a single corner. It rolled away and lost its artist, legend says.'),
  triangle: joke('파란 세모', '세 변이 서로 자기가 밑변이라고 아직도 다투는 중.', 'Blue Triangle', 'All three sides still argue about which one is the bottom.'),
  square: joke('초록 네모', '네 변 길이가 똑같아 자를 든 비평가들이 눈물을 흘렸다.', 'Green Square', 'Four perfectly equal sides. Critics with rulers wept.'),
  diamond: joke('노란 마름모', '네모가 고개를 45도 갸웃했을 뿐인데 몸값이 두 배가 됐다.', 'Yellow Diamond', 'A square tilted its head 45° and doubled its price.'),
  hexagon: joke('보라 육각형', '벌들이 "우리 집 설계도를 베꼈다"며 소송을 준비 중이다.', 'Purple Hexagon', 'The bees are suing. They say it copied their floor plan.'),
  ring: joke('분홍 고리', '가운데가 비어 있다. 작가는 "도넛을 먹다 멈췄다"고 해명했다.', 'Pink Ring', 'The middle is empty. The artist claims they stopped mid-donut.'),
  plus: joke('청록 더하기', '더하기처럼 보이지만 작가는 "빼기를 두 번 그렸을 뿐"이라고 주장한다.', 'Teal Plus', 'Looks like a plus. The artist insists it is two minuses.'),
  arch: joke('주황 반원', '해가 뜨는 건지 지는 건지 작가 본인도 아직 모른다.', 'Orange Arch', 'Sunrise or sunset? Even the artist hasn’t decided.'),

  /* ---------- 팝아트: 작가 미상 우스개 ---------- */
  lips: joke('쪽!', '전시장에서 키스 자국을 가장 많이 받은 그림. 대부분 관람객 것이다.', 'Smack!', 'The most-kissed painting in the gallery. Mostly by visitors.'),
  bolt: joke('번쩍!', '그리는 데 0.1초 걸렸다고 한다. 액자에 넣는 데는 3년.', 'Zap!', 'Painted in 0.1 seconds. Framing it took three years.'),
  eye: joke('눈', '지나가면 눈동자가 따라온다는 소문이 있다. 확인하지 마세요.', 'The Eye', 'Rumor says it follows you around the room. Don’t check.'),
  pow: joke('쾅!', '만화책 한 칸에서 탈출한 효과음. 주인공은 아직도 찾는 중.', 'POW!', 'A sound effect that escaped from a comic. The hero is still looking for it.'),
  heart: joke('하트', '작가가 고백에 실패한 날 완성했다. 그래서 빨간색이 더 진하다.', 'Heart', 'Finished the day the artist got turned down. Hence the extra red.'),
  shades: joke('선글라스', '너무 멋져서 작가 본인도 눈이 부셨다는 자화상(으로 추정).', 'Shades', 'A self-portrait, probably. Too cool even for the artist’s own eyes.'),
  cone: joke('녹는 중', '그림 속 아이스크림인데 여름만 되면 액자 아래가 끈적하다.', 'Melting', 'It’s only a painted ice cream, yet every summer the frame gets sticky.'),
  crown: joke('왕관', '주인 미상, 사이즈 프리. 써 본 사람은 모두 "조금 크다"고 했다.', 'Crown', 'Owner unknown, one size fits all. Everyone who tried it said “a bit big.”'),

  /* ---------- 명화 팝: 실제 명화를 4색 팝아트로 ---------- */
  berceuse: art(
    { title: '자장가(룰랭 부인)', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1889').ko, desc: '우체부 룰랭의 아내 오귀스틴. 손에 쥔 끈은 보이지 않는 요람을 흔드는 줄이다. 고흐는 이 구도를 다섯 번 그렸다.' },
    { title: 'La Berceuse', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1889').en, desc: 'Augustine Roulin, the postman’s wife. The rope in her hands rocks a cradle we can’t see. Van Gogh painted it five times.' },
  ),
  strawhat: art(
    { title: '밀짚모자를 쓴 자화상', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1887').ko, desc: '파리 시절, 모델 살 돈이 없어 자신을 그렸다. 캔버스 뒷면에는 「감자 깎는 사람」이 그려져 있다.' },
    { title: 'Self-Portrait with a Straw Hat', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1887').en, desc: 'Too poor to pay models in Paris, he painted himself. The back of the canvas holds “The Potato Peeler.”' },
  ),
  rembrandt: art(
    { title: '자화상', by: pop('렘브란트', 'Rembrandt', '1660').ko, desc: '평생 수십 점의 자화상을 남긴 렘브란트의 54세 모습. 꾸밈없는 주름까지 그대로 그렸다.' },
    { title: 'Self-Portrait', by: pop('렘브란트', 'Rembrandt', '1660').en, desc: 'Rembrandt at 54. He painted dozens of self-portraits and never hid a wrinkle.' },
  ),
  madamex: art(
    { title: '마담 X', by: pop('존 싱어 사전트', 'John Singer Sargent', '1883–84').ko, desc: '파리 살롱에 걸렸을 때 흘러내린 어깨끈이 스캔들이 되어, 사전트는 나중에 끈을 올려 다시 그렸다.' },
    { title: 'Madame X', by: pop('존 싱어 사전트', 'John Singer Sargent', '1883–84').en, desc: 'A slipped shoulder strap caused a scandal at the Paris Salon, so Sargent later painted it back up.' },
  ),
  arlesienne: art(
    { title: '아를의 여인', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1888–89').ko, desc: '아를의 카페 주인 마리 지누. 고흐와 고갱이 같은 모델을 함께 그린 그림 가운데 하나다.' },
    { title: 'L’Arlésienne', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1888–89').en, desc: 'Marie Ginoux, who ran a café in Arles. Van Gogh and Gauguin both painted her.' },
  ),
  wave: art(
    { title: '가나가와 앞바다의 파도', by: pop('가쓰시카 호쿠사이', 'Katsushika Hokusai', 'c.1831').ko, desc: '「후지산 36경」 목판화. 거대한 파도 뒤로 작은 후지산이 숨어 있다.' },
    { title: 'Under the Wave off Kanagawa', by: pop('가쓰시카 호쿠사이', 'Katsushika Hokusai', 'c.1831').en, desc: 'From “Thirty-six Views of Mount Fuji.” A tiny Mount Fuji hides behind the giant wave.' },
  ),
  baby: art(
    { title: '룰랭 부인과 아기', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1888').ko, desc: '룰랭 부인이 갓난 딸 마르셀을 안고 있다. 아기는 그림에서 나올 듯 또렷하다.' },
    { title: 'Madame Roulin and Her Baby', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1888').en, desc: 'Madame Roulin holds her newborn Marcelle, who almost pops out of the canvas.' },
  ),
  sunflowers: art(
    { title: '해바라기', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1887').ko, desc: '파리 시절, 꺾어 놓은 해바라기를 크게 그린 연작 가운데 하나. 아를의 꽃병 해바라기보다 먼저다.' },
    { title: 'Sunflowers', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1887').en, desc: 'Cut sunflowers painted up close in Paris, before the famous vases in Arles.' },
  ),

  /* ---------- 서양화 · 풍경 ---------- */
  cypress: art(
    { title: '사이프러스가 있는 밀밭', by: '빈센트 반 고흐 · 1889', desc: '생레미 요양원 시절. 고흐는 불꽃처럼 솟은 사이프러스를 "이집트 오벨리스크처럼 아름답다"고 했다.' },
    { title: 'Wheat Field with Cypresses', by: 'Vincent van Gogh · 1889', desc: 'Painted at Saint-Rémy. He called cypresses “beautiful as an Egyptian obelisk.”' },
  ),
  olive: art(
    { title: '올리브 나무', by: '빈센트 반 고흐 · 1889', desc: '생레미에서 올리브 숲을 열다섯 점 가까이 그렸다. 땅의 보랏빛 그림자가 눈에 띈다.' },
    { title: 'Olive Trees', by: 'Vincent van Gogh · 1889', desc: 'One of some fifteen olive-grove paintings from Saint-Rémy. Note the violet shadows.' },
  ),
  orchard: art(
    { title: '꽃 핀 과수원', by: '빈센트 반 고흐 · 1888', desc: '아를에 온 첫봄, 꽃이 지기 전에 서둘러 과수원 연작을 그렸다.' },
    { title: 'The Flowering Orchard', by: 'Vincent van Gogh · 1888', desc: 'His first spring in Arles. He raced to paint the orchards before the blossoms fell.' },
  ),
  harvest: art(
    { title: '추수하는 사람들', by: '피터르 브뤼헐 · 1565', desc: '한 해의 때를 그린 연작 가운데 하나. 나무 그늘에서 점심을 먹고 낮잠 자는 농부들이 있다.' },
    { title: 'The Harvesters', by: 'Pieter Bruegel the Elder · 1565', desc: 'From a series on the times of the year. Workers lunch and nap under a pear tree.' },
  ),
  gulfstream: art(
    { title: '멕시코 만류', by: '윈즐로 호머 · 1899', desc: '돛대가 부러진 배, 둘레를 도는 상어, 멀리 회오리바람. 그래도 선원은 담담하다.' },
    { title: 'The Gulf Stream', by: 'Winslow Homer · 1899', desc: 'A broken mast, circling sharks and a distant waterspout, yet the sailor stays calm.' },
  ),
  matterhorn: art(
    { title: '마테호른의 해돋이', by: '앨버트 비어스타트 · 1875년 이후', desc: '알프스 봉우리가 아침 햇빛을 받아 분홍빛으로 물든다. 미국 서부 풍경으로 유명한 화가의 알프스.' },
    { title: 'Sunrise on the Matterhorn', by: 'Albert Bierstadt · after 1875', desc: 'The Alpine peak blushes pink at dawn, by a painter famous for the American West.' },
  ),
  boating: art(
    { title: '뱃놀이', by: '에두아르 마네 · 1874', desc: '아르장퇴유에서 그린 여름 한낮. 수평선 없이 물이 화면을 가득 채운다.' },
    { title: 'Boating', by: 'Edouard Manet · 1874', desc: 'A summer day at Argenteuil. No horizon, just water filling the whole picture.' },
  ),
  oxbow: art(
    { title: '홀리요크산에서 본 풍경(옥스보)', by: '토머스 콜 · 1836', desc: '왼쪽은 폭풍 치는 숲, 오른쪽은 햇빛 비치는 들판. 그 사이를 강이 소 멍에처럼 휘감아 흐른다.' },
    { title: 'The Oxbow', by: 'Thomas Cole · 1836', desc: 'Storm-tossed wilderness on the left, sunny farmland on the right, and a river bending like an oxbow.' },
  ),

  /* ---------- 서양화 · 인물과 정물 ---------- */
  apples: art(
    { title: '사과와 앵초 화분이 있는 정물', by: '폴 세잔 · 1890년 무렵', desc: '"사과 하나로 파리를 놀라게 하겠다"고 했다는 세잔. 사과가 굴러떨어질 듯 기울어 있다.' },
    { title: 'Still Life with Apples and a Pot of Primroses', by: 'Paul Cézanne · c.1890', desc: 'Cézanne reportedly wanted to “astonish Paris with an apple.” The table tilts as if they might roll off.' },
  ),
  roses: art(
    { title: '장미', by: '빈센트 반 고흐 · 1890', desc: '생레미를 떠나기 직전에 그렸다. 원래 분홍이던 꽃잎이 세월에 바래 지금은 하얗게 보인다.' },
    { title: 'Roses', by: 'Vincent van Gogh · 1890', desc: 'Painted just before leaving Saint-Rémy. The roses were pink; the color has faded to white.' },
  ),
  oleanders: art(
    { title: '협죽도', by: '빈센트 반 고흐 · 1888', desc: '탁자 위 노란 책은 에밀 졸라의 소설 「삶의 기쁨」. 꽃처럼 밝은 기운을 담았다.' },
    { title: 'Oleanders', by: 'Vincent van Gogh · 1888', desc: 'The yellow book is Zola’s “The Joy of Life,” as cheerful as the flowers.' },
  ),
  shoes: art(
    { title: '신발', by: '빈센트 반 고흐 · 1888', desc: '닳은 작업화 한 켤레. 고흐는 신발을 여러 번 그렸는데, 이 그림은 아를의 붉은 바닥 위에 있다.' },
    { title: 'Shoes', by: 'Vincent van Gogh · 1888', desc: 'A worn pair of work boots on a red Arles floor. Van Gogh painted shoes several times.' },
  ),
  dancers: art(
    { title: '무용 수업', by: '에드가 드가 · 1874', desc: '발레 선생님 앞에서 쉬고, 기다리고, 몸을 푸는 무용수들. 드가는 무대보다 연습실을 즐겨 그렸다.' },
    { title: 'The Dance Class', by: 'Edgar Degas · 1874', desc: 'Dancers rest, wait and stretch before the ballet master. Degas loved rehearsals more than shows.' },
  ),
  cardplayers: art(
    { title: '카드놀이 하는 사람들', by: '폴 세잔 · 1890–92', desc: '엑상프로방스 농부들이 모델. 세잔은 같은 주제를 여러 점 그렸다. 아무도 말이 없다.' },
    { title: 'The Card Players', by: 'Paul Cézanne · 1890–92', desc: 'Local farmhands from Aix posed for this series. Nobody says a word.' },
  ),
  tahiti: art(
    { title: '이아 오라나 마리아', by: '폴 고갱 · 1891', desc: '타히티에서 그린 첫 대작. 아기를 어깨에 태운 타히티 여인으로 성모자를 다시 그렸다.' },
    { title: 'Ia Orana Maria (Hail Mary)', by: 'Paul Gauguin · 1891', desc: 'His first major Tahitian painting: the Madonna and Child reimagined as a Tahitian mother and son.' },
  ),
  garden: art(
    { title: '아르장퇴유 정원의 모네 가족', by: '에두아르 마네 · 1874', desc: '친구 모네의 아내 카미유와 아들 장. 옆에서 르누아르도 같은 장면을 그렸다.' },
    { title: 'The Monet Family in Their Garden', by: 'Edouard Manet · 1874', desc: 'Camille Monet and her son Jean. Renoir painted the same scene right beside him.' },
  ),

  /* ---------- 동양화 · 수묵 ---------- */
  bamboo: art(
    { title: '대나무', by: '가쓰시카 호쿠사이 · 18~19세기', desc: '파도 판화로 유명한 호쿠사이의 붓 그림. 먹 하나로 마디와 잎의 힘을 그렸다.' },
    { title: 'Bamboo', by: 'Katsushika Hokusai · 18th–19th c.', desc: 'A brush painting by the master of the Great Wave: strength of stalk and leaf in ink alone.' },
  ),
  plum: art(
    { title: '매화', by: '김농(진눙) · 1757', desc: '청나라 양주팔괴 가운데 한 사람. 겨울 끝에 피는 매화를 빽빽하게 그렸다.' },
    { title: 'Plum Blossoms', by: 'Jin Nong · 1757', desc: 'One of the “Eight Eccentrics of Yangzhou,” painting plum blossoms that bloom at winter’s end.' },
  ),
  orchid: art(
    { title: '난초와 바위', by: '마수진(마서우전) · 1572', desc: '명나라의 여성 화가. 난초 잎 몇 획으로 바람과 향기를 그렸다.' },
    { title: 'Orchid and Rock', by: 'Ma Shouzhen · 1572', desc: 'A Ming dynasty woman painter. A few strokes of orchid leaf carry wind and scent.' },
  ),
  grapes: art(
    { title: '포도', by: '보쿠사이(모쓰린 조토) · 1480~92 무렵', desc: '선종 승려 화가. 먹의 짙고 옅음만으로 잎과 알을 구분했다.' },
    { title: 'Grapes', by: 'Motsurin Jōtō (Bokusai) · c.1480–92', desc: 'A Zen monk painter who told leaf from grape by ink tone alone.' },
  ),
  swallows: art(
    { title: '대나무와 작은 새', by: '가와바타 교쿠쇼 · 1887~92', desc: '바람을 가르는 새 두 마리. 빈 바탕이 하늘이 된다.' },
    { title: 'Small Birds and Bamboo', by: 'Kawabata Gyokushō · 1887–92', desc: 'Two birds cutting through the wind. The empty paper becomes the sky.' },
  ),
  mist: art(
    { title: '산수', by: '가노 모토노부 · 16세기', desc: '안개 속에 봉우리와 숲이 떠오른다. 그리지 않은 곳이 더 많은 그림.' },
    { title: 'Landscape', by: 'Kano Motonobu · 16th c.', desc: 'Peaks and trees float in the mist. More is left unpainted than painted.' },
  ),
  peaks: art(
    { title: '산수 병풍', by: '셋손 슈케이 · 16세기', desc: '여섯 폭 병풍의 한 부분. 가파른 바위산 사이로 마을과 물길이 이어진다.' },
    { title: 'Landscape Screen', by: 'Sesson Shūkei · 16th c.', desc: 'Part of a six-panel screen: villages and streams wind between steep peaks.' },
  ),
  tiger: art(
    { title: '호랑이', by: '호쿠사이 화파 · 19세기', desc: '먹선 수천 개로 털을 세운 호랑이. 이 묶음에서 가장 무섭게 생겼지만 가장 찾기 쉬울지도.' },
    { title: 'Tiger', by: 'Hokusai School · 19th c.', desc: 'Thousands of ink strokes for its fur. The scariest card here, and maybe the easiest to spot.' },
  ),
};

export function cardInfo(face: FaceId): Text {
  return CARDS[face][getLang()];
}

/** 카드 이름(특수 카드는 문구 사전) */
export function faceName(face: FaceId | SpecialId): string {
  return face === 'clock' || face === 'peek' ? t(`face.${face}`) : CARDS[face][getLang()].title;
}

export function setName(set: SetId): string {
  return SETS[set][getLang()];
}
