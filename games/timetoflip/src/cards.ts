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
  circle: joke('먹색 동그라미', '모서리가 없어 굴러다니다 작가를 잃어버린 전설의 작품.', 'Charcoal Circle', 'Not one corner. It rolled away and lost its artist, they say.'),
  triangle: joke('파란 세모', '세 변이 서로 자기가 밑변이라며 아직도 다투는 중.', 'Blue Triangle', 'All three sides still argue over which one is the bottom.'),
  square: joke('초록 네모', '네 변이 똑같아 자를 든 비평가들이 눈물을 흘렸다.', 'Green Square', 'Four equal sides. Critics with rulers wept openly.'),
  diamond: joke('빨간 마름모', '네모가 고개를 45도 갸웃했을 뿐인데 몸값이 두 배.', 'Red Diamond', 'A square tilted its head 45° and doubled its price.'),
  hexagon: joke('보라 육각형', '벌들이 "우리 집 설계도를 베꼈다"며 소송 준비 중.', 'Purple Hexagon', 'The bees are suing. They say it copied their floor plan.'),
  ring: joke('분홍 고리', '가운데가 비었다. 작가는 도넛을 먹다 멈췄다고 해명.', 'Pink Ring', 'The middle is empty. The artist says they stopped mid-donut.'),
  plus: joke('청록 더하기', '더하기 같지만 작가는 빼기를 두 번 그렸을 뿐이라 주장.', 'Teal Plus', 'Looks like a plus. The artist insists it is two minuses.'),
  moon: joke('노란 초승달', '보름달이 되려다 누가 한 입 베어 먹었다. 범인은 아직 안 잡혔다.', 'Yellow Crescent', 'It was on its way to full moon until someone took a bite.'),

  /* ---------- 팝아트: 작가 미상 우스개 ---------- */
  lips: joke('쪽!', '키스 자국을 가장 많이 받은 그림. 대부분 관람객 것.', 'Smack!', 'The most-kissed painting in the gallery. Mostly by visitors.'),
  bolt: joke('번쩍!', '그리는 데 0.1초, 액자에 넣는 데는 3년 걸렸다고 한다.', 'Zap!', 'Painted in 0.1 seconds. Framing it took three years.'),
  eye: joke('눈', '지나가면 눈동자가 따라온다는 소문이 있다. 확인 금지.', 'The Eye', 'They say it follows you around the room. Don’t check.'),
  pow: joke('쾅!', '만화책 한 칸에서 탈출한 효과음. 주인공이 찾는 중.', 'POW!', 'A sound effect that escaped a comic. Its hero is still looking.'),
  heart: joke('하트', '고백에 실패한 날 완성했다. 그래서 빨강이 더 진하다.', 'Heart', 'Finished the day the artist got turned down. Hence the red.'),
  shades: joke('선글라스', '너무 멋져서 작가 본인도 눈이 부셨다는 자화상(추정).', 'Shades', 'A self-portrait, probably. Too cool even for the artist.'),
  cone: joke('녹는 중', '그림 속 아이스크림인데 여름이면 액자 아래가 끈적하다.', 'Melting', 'Only a painted ice cream, yet each summer the frame gets sticky.'),
  crown: joke('왕관', '주인 미상, 사이즈 프리. 써 본 사람 모두 "조금 크다".', 'Crown', 'Owner unknown, one size fits all. Everyone says “a bit big.”'),

  /* ---------- 명화 팝: 실제 명화를 4색 팝아트로 ---------- */
  berceuse: art(
    { title: '자장가(룰랭 부인)', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1889').ko, desc: '우체부 룰랭의 아내. 손에 쥔 끈으로 보이지 않는 요람을 흔든다.' },
    { title: 'La Berceuse', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1889').en, desc: 'The postman’s wife rocks an unseen cradle with the rope she holds.' },
  ),
  strawhat: art(
    { title: '밀짚모자를 쓴 자화상', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1887').ko, desc: '모델 살 돈이 없던 파리 시절, 자신을 그렸다. 뒷면에도 그림이 있다.' },
    { title: 'Self-Portrait with a Straw Hat', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1887').en, desc: 'Too poor for models in Paris, he painted himself. More art on the back.' },
  ),
  rembrandt: art(
    { title: '자화상', by: pop('렘브란트', 'Rembrandt', '1660').ko, desc: '평생 자화상을 수십 점 남긴 렘브란트의 54세. 주름도 그대로 그렸다.' },
    { title: 'Self-Portrait', by: pop('렘브란트', 'Rembrandt', '1660').en, desc: 'Rembrandt at 54, one of dozens of self-portraits. Every wrinkle kept.' },
  ),
  madamex: art(
    { title: '마담 X', by: pop('존 싱어 사전트', 'John Singer Sargent', '1883–84').ko, desc: '흘러내린 어깨끈이 스캔들이 되어 작가가 끈을 다시 그려 올렸다.' },
    { title: 'Madame X', by: pop('존 싱어 사전트', 'John Singer Sargent', '1883–84').en, desc: 'A slipped strap caused a scandal, so Sargent painted it back up.' },
  ),
  arlesienne: art(
    { title: '아를의 여인', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1888–89').ko, desc: '아를의 카페 주인 마리 지누. 고흐와 고갱이 함께 그린 모델이다.' },
    { title: 'L’Arlésienne', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1888–89').en, desc: 'Marie Ginoux, a café owner in Arles, painted by Van Gogh and Gauguin.' },
  ),
  wave: art(
    { title: '가나가와 앞바다의 파도', by: pop('가쓰시카 호쿠사이', 'Katsushika Hokusai', 'c.1831').ko, desc: '「후지산 36경」 목판화. 거대한 파도 뒤에 작은 후지산이 숨어 있다.' },
    { title: 'Under the Wave off Kanagawa', by: pop('가쓰시카 호쿠사이', 'Katsushika Hokusai', 'c.1831').en, desc: 'From “Thirty-six Views of Mount Fuji.” A tiny Fuji hides behind the wave.' },
  ),
  baby: art(
    { title: '룰랭 부인과 아기', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1888').ko, desc: '룰랭 부인이 갓난 딸 마르셀을 안았다. 아기가 튀어나올 듯 또렷하다.' },
    { title: 'Madame Roulin and Her Baby', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1888').en, desc: 'Madame Roulin holds newborn Marcelle, who almost pops off the canvas.' },
  ),
  sunflowers: art(
    { title: '해바라기', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1887').ko, desc: '파리 시절, 꺾은 해바라기를 크게 그렸다. 아를의 꽃병보다 먼저다.' },
    { title: 'Sunflowers', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1887').en, desc: 'Cut sunflowers painted up close in Paris, before the vases of Arles.' },
  ),

  /* ---------- 서양화 · 풍경 ---------- */
  cypress: art(
    { title: '사이프러스가 있는 밀밭', by: '빈센트 반 고흐 · 1889', desc: '생레미 시절 작품. 고흐는 사이프러스가 오벨리스크처럼 아름답다 했다.' },
    { title: 'Wheat Field with Cypresses', by: 'Vincent van Gogh · 1889', desc: 'From Saint-Rémy. He found cypresses as beautiful as an obelisk.' },
  ),
  olive: art(
    { title: '올리브 나무', by: '빈센트 반 고흐 · 1889', desc: '생레미에서 열다섯 점 가까이 그린 올리브 숲. 보랏빛 그림자가 특징.' },
    { title: 'Olive Trees', by: 'Vincent van Gogh · 1889', desc: 'One of some fifteen olive groves from Saint-Rémy, with violet shadows.' },
  ),
  orchard: art(
    { title: '꽃 핀 과수원', by: '빈센트 반 고흐 · 1888', desc: '아를의 첫봄, 꽃이 지기 전에 서둘러 그린 과수원 연작 가운데 하나.' },
    { title: 'The Flowering Orchard', by: 'Vincent van Gogh · 1888', desc: 'His first spring in Arles, racing to paint before the blossoms fell.' },
  ),
  harvest: art(
    { title: '추수하는 사람들', by: '피터르 브뤼헐 · 1565', desc: '한 해의 때를 그린 연작. 배나무 그늘에서 점심 먹고 낮잠 자는 농부들.' },
    { title: 'The Harvesters', by: 'Pieter Bruegel the Elder · 1565', desc: 'Workers lunch and nap under a pear tree, from a series on the year.' },
  ),
  gulfstream: art(
    { title: '멕시코 만류', by: '윈즐로 호머 · 1899', desc: '돛대 부러진 배와 상어, 멀리 회오리바람. 그래도 선원은 담담하다.' },
    { title: 'The Gulf Stream', by: 'Winslow Homer · 1899', desc: 'Broken mast, circling sharks, a far waterspout. The sailor stays calm.' },
  ),
  matterhorn: art(
    { title: '마테호른의 해돋이', by: '앨버트 비어스타트 · 1875년 이후', desc: '알프스 봉우리가 아침 햇빛을 받아 분홍빛으로 물드는 순간을 담았다.' },
    { title: 'Sunrise on the Matterhorn', by: 'Albert Bierstadt · after 1875', desc: 'The Alpine peak blushes pink in the very first light of dawn.' },
  ),
  boating: art(
    { title: '뱃놀이', by: '에두아르 마네 · 1874', desc: '아르장퇴유의 여름 한낮. 수평선 없이 물이 화면을 가득 채운다.' },
    { title: 'Boating', by: 'Edouard Manet · 1874', desc: 'A summer day at Argenteuil. No horizon, only water everywhere.' },
  ),
  oxbow: art(
    { title: '홀리요크산에서 본 풍경(옥스보)', by: '토머스 콜 · 1836', desc: '왼쪽은 폭풍 치는 숲, 오른쪽은 햇빛 든 들판. 강이 멍에처럼 휜다.' },
    { title: 'The Oxbow', by: 'Thomas Cole · 1836', desc: 'Storm on the left, sunny fields on the right, and a bending river.' },
  ),

  /* ---------- 서양화 · 인물과 정물 ---------- */
  apples: art(
    { title: '사과와 앵초 화분이 있는 정물', by: '폴 세잔 · 1890년 무렵', desc: '사과 하나로 파리를 놀라게 하겠다던 세잔. 사과가 굴러떨어질 듯하다.' },
    { title: 'Still Life with Apples and a Pot of Primroses', by: 'Paul Cézanne · c.1890', desc: 'Cézanne wanted to astonish Paris with an apple. They seem to roll.' },
  ),
  roses: art(
    { title: '장미', by: '빈센트 반 고흐 · 1890', desc: '원래 분홍이던 꽃잎이 세월에 바래 지금은 하얗게 보이는 장미.' },
    { title: 'Roses', by: 'Vincent van Gogh · 1890', desc: 'These roses were pink once. The color has faded to white over time.' },
  ),
  oleanders: art(
    { title: '협죽도', by: '빈센트 반 고흐 · 1888', desc: '탁자 위 노란 책은 졸라의 소설 「삶의 기쁨」. 꽃만큼 밝은 그림.' },
    { title: 'Oleanders', by: 'Vincent van Gogh · 1888', desc: 'The yellow book is Zola’s “The Joy of Life,” as bright as the flowers.' },
  ),
  shoes: art(
    { title: '신발', by: '빈센트 반 고흐 · 1888', desc: '아를의 붉은 바닥 위 닳은 작업화 한 켤레. 고흐는 신발을 여러 번 그렸다.' },
    { title: 'Shoes', by: 'Vincent van Gogh · 1888', desc: 'A worn pair of work boots on a red floor in Arles. He painted shoes often.' },
  ),
  dancers: art(
    { title: '무용 수업', by: '에드가 드가 · 1874', desc: '쉬고 기다리고 몸을 푸는 무용수들. 드가는 무대보다 연습실을 그렸다.' },
    { title: 'The Dance Class', by: 'Edgar Degas · 1874', desc: 'Dancers rest, wait and stretch. Degas loved rehearsals more than shows.' },
  ),
  cardplayers: art(
    { title: '카드놀이 하는 사람들', by: '폴 세잔 · 1890–92', desc: '엑상프로방스 농부들이 모델이 된 연작. 아무도 말이 없다.' },
    { title: 'The Card Players', by: 'Paul Cézanne · 1890–92', desc: 'Farmhands from Aix posed for this series. Nobody says a word.' },
  ),
  tahiti: art(
    { title: '이아 오라나 마리아', by: '폴 고갱 · 1891', desc: '타히티에서 그린 첫 대작. 아기를 어깨에 태운 엄마로 성모자를 그렸다.' },
    { title: 'Ia Orana Maria (Hail Mary)', by: 'Paul Gauguin · 1891', desc: 'His first great Tahitian work: the Madonna and Child, reimagined.' },
  ),
  garden: art(
    { title: '아르장퇴유 정원의 모네 가족', by: '에두아르 마네 · 1874', desc: '친구 모네의 아내와 아들. 옆에서 르누아르도 같은 장면을 그렸다.' },
    { title: 'The Monet Family in Their Garden', by: 'Edouard Manet · 1874', desc: 'Camille Monet and her son. Renoir painted the same scene beside him.' },
  ),

  /* ---------- 동양화 · 수묵 ---------- */
  bamboo: art(
    { title: '풍죽(바람 속 대나무)', by: '탄은 이정 · 17세기 초', desc: '조선 왕족 화가 탄은의 대나무. 바람에 휘는 잎이 금빛 비단 위에서 흔들린다.' },
    { title: 'Bamboo in the Wind', by: 'Yi Jeong (Taneun) · early 17th c.', desc: 'By the Joseon royal painter Taneun. Leaves bend in the wind on gold-flecked silk.' },
  ),
  plum: art(
    { title: '매화', by: '김농(진눙) · 1757', desc: '청나라 양주팔괴 가운데 한 사람. 겨울 끝에 피는 매화를 빽빽하게.' },
    { title: 'Plum Blossoms', by: 'Jin Nong · 1757', desc: 'One of the Eight Eccentrics of Yangzhou, painting late-winter plums.' },
  ),
  orchid: art(
    { title: '난초와 바위', by: '마수진(마서우전) · 1572', desc: '명나라의 여성 화가. 난초 잎 몇 획으로 바람과 향기를 담았다.' },
    { title: 'Orchid and Rock', by: 'Ma Shouzhen · 1572', desc: 'A Ming woman painter. A few orchid strokes carry wind and scent.' },
  ),
  lotus: art(
    { title: '부용·연꽃과 바위', by: '석도(스타오) · 1705~07 무렵', desc: '틀에 얽매이지 않던 승려 화가. 젖은 먹을 번지게 해 큰 잎을 단숨에 그렸다.' },
    { title: 'Hibiscus, Lotus, and Rock', by: 'Shitao · c.1705–07', desc: 'A free-spirited monk painter who let wet ink bloom into broad leaves.' },
  ),
  eagles: art(
    { title: '독수리 두 마리', by: '팔대산인(주탑) · 1702', desc: '명 왕족 출신의 괴짜 화가. 바위 위 독수리가 날카롭게 아래를 노려본다.' },
    { title: 'Two Eagles', by: 'Bada Shanren (Zhu Da) · 1702', desc: 'An eccentric painter of Ming royal blood. The eagles glare down from the rock.' },
  ),
  riverbank: art(
    { title: '강가 나무 사이의 바람', by: '예찬(니찬) · 1363', desc: '원나라 4대가의 한 사람. 텅 빈 강과 마른 나무 몇 그루로 고요를 그렸다.' },
    { title: 'Wind among the Trees on the Riverbank', by: 'Ni Zan · 1363', desc: 'A Yuan master who painted stillness with an empty river and a few bare trees.' },
  ),
  peaks: art(
    { title: '비 오는 밤 배를 대다', by: '심주(선저우) · 1477', desc: '명나라 오파를 연 화가. 빗속 바위산 아래 작은 배가 쉬어 간다.' },
    { title: 'Anchorage on a Rainy Night', by: 'Shen Zhou · 1477', desc: 'A founder of the Wu School. A small boat rests below rainy cliffs.' },
  ),
  huangshan: art(
    { title: '황산 36봉을 떠올리며', by: '석도(스타오) · 1705 무렵', desc: '젊은 날 오른 황산을 늙어서 기억으로 그렸다. 봉우리가 구름처럼 솟는다.' },
    { title: 'Thirty-six Peaks of Mount Huang', by: 'Shitao · c.1705', desc: 'Painted from memory of a youthful climb. The peaks rise like clouds.' },
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
