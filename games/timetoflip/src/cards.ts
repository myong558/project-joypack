import type { FaceId, SetId, SpecialId } from './game/faces';
import { getLang, t } from './i18n';

/**
 * 도감 설명: 묶음 이름과 카드마다 제목·작가·한두 줄 설명(한국어·영어).
 * 도형·팝아트(조이팩이 직접 그린 그림)는 작가 줄은 "그림 조이팩", 설명은 지어낸 우스개,
 * 명화는 실제 작가·연도·짧은 이야기. 명화 그림은 미술관 공개 이미지다(CC0·퍼블릭 도메인·공공누리 1유형, art-src/meta.json).
 * 공공누리 1유형(국립중앙박물관)은 출처 표시가 의무라 작가 줄에 소장처를 쓴다
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
  popart: { ko: '팝아트로 본 명화', en: 'Masterpieces in Pop' },
  landscape: { ko: '서양화 · 풍경', en: 'Western Landscapes' },
  life: { ko: '서양화 · 인물과 정물', en: 'Western Figures & Still Life' },
  ink: { ko: '동양화 · 수묵', en: 'Ink Painting' },
};

const anon = { ko: '그림 조이팩', en: 'Art by Joypack' };
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
  /* ---------- 도형: 조이팩 그림 + 우스개 ---------- */
  circle: joke('먹색 동그라미', '모서리가 없어 걸어 두면 자꾸 액자 밖으로 굴러 나간다.', 'Charcoal Circle', 'Not one corner. Hang it up and it keeps rolling out of the frame.'),
  triangle: joke('파란 세모', '세 변이 서로 자기가 밑변이라며 아직도 다투는 중.', 'Blue Triangle', 'All three sides still argue over which one is the bottom.'),
  square: joke('초록 네모', '네 변이 똑같아 자를 든 비평가들이 눈물을 흘렸다.', 'Green Square', 'Four equal sides. Critics with rulers wept openly.'),
  diamond: joke('빨간 마름모', '네모가 고개를 45도 갸웃했을 뿐인데 몸값이 두 배.', 'Red Diamond', 'A square tilted its head 45° and doubled its price.'),
  hexagon: joke('보라 육각형', '벌들이 "우리 집 설계도를 베꼈다"며 소송 준비 중.', 'Purple Hexagon', 'The bees are suing. They say it copied their floor plan.'),
  ring: joke('분홍 고리', '가운데가 비었다. 작가는 도넛을 먹다 멈췄다고 해명.', 'Pink Ring', 'The middle is empty. The artist says they stopped mid-donut.'),
  plus: joke('청록 더하기', '더하기 같지만 작가는 빼기를 두 번 그렸을 뿐이라 주장.', 'Teal Plus', 'Looks like a plus. The artist insists it is two minuses.'),
  moon: joke('노란 초승달', '보름달이 되려다 누가 한 입 베어 먹었다. 범인은 아직 안 잡혔다.', 'Yellow Crescent', 'It was on its way to full moon until someone took a bite.'),

  /* ---------- 팝아트: 조이팩 그림 + 우스개 ---------- */
  lips: joke('쪽!', '키스 자국을 가장 많이 받은 그림. 대부분 관람객 것.', 'Smack!', 'The most-kissed painting in the gallery. Mostly by visitors.'),
  bolt: joke('번쩍!', '그리는 데 0.1초, 액자에 넣는 데는 3년 걸렸다고 한다.', 'Zap!', 'Painted in 0.1 seconds. Framing it took three years.'),
  eye: joke('눈', '지나가면 눈동자가 따라온다는 소문이 있다. 확인 금지.', 'The Eye', 'They say it follows you around the room. Don’t check.'),
  pow: joke('쾅!', '만화책 한 칸에서 탈출한 효과음. 주인공이 찾는 중.', 'POW!', 'A sound effect that escaped a comic. Its hero is still looking.'),
  heart: joke('하트', '고백에 실패한 날 완성했다. 그래서 빨강이 더 진하다.', 'Heart', 'Finished the day the artist got turned down. Hence the red.'),
  shades: joke('선글라스', '너무 멋져서 작가 본인도 눈이 부셨다는 자화상(추정).', 'Shades', 'A self-portrait, probably. Too cool even for the artist.'),
  cone: joke('녹는 중', '그림 속 아이스크림인데 여름이면 액자 아래가 끈적하다.', 'Melting', 'Only a painted ice cream, yet each summer the frame gets sticky.'),
  crown: joke('왕관', '주인 미상, 사이즈 프리. 써 본 사람 모두 "조금 크다".', 'Crown', 'Owner unknown, one size fits all. Everyone says “a bit big.”'),

  /* ---------- 팝아트로 본 명화: 실제 명화를 4색 팝아트로 ---------- */
  girl: art(
    { title: '젊은 여인의 초상', by: pop('요하네스 페르메이르', 'Johannes Vermeer', '1665–67').ko, desc: '「진주 귀걸이를 한 소녀」를 그린 페르메이르의 또 다른 얼굴 그림.' },
    { title: 'Study of a Young Woman', by: pop('요하네스 페르메이르', 'Johannes Vermeer', '1665–67').en, desc: 'Another face by Vermeer, the painter of “Girl with a Pearl Earring.”' },
  ),
  strawhat: art(
    { title: '밀짚모자를 쓴 자화상', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1887').ko, desc: '모델 살 돈이 없던 파리 시절, 자신을 그렸다. 뒷면에도 그림이 있다.' },
    { title: 'Self-Portrait with a Straw Hat', by: pop('빈센트 반 고흐', 'Vincent van Gogh', '1887').en, desc: 'Too poor for models in Paris, he painted himself. More art on the back.' },
  ),
  rembrandt: art(
    { title: '자화상', by: pop('렘브란트', 'Rembrandt', '1660').ko, desc: '평생 자화상을 수십 점 남긴 렘브란트의 54세. 주름도 그대로 그렸다.' },
    { title: 'Self-Portrait', by: pop('렘브란트', 'Rembrandt', '1660').en, desc: 'Rembrandt at 54, one of dozens of self-portraits. Every wrinkle kept.' },
  ),
  modigliani: art(
    { title: '잔 에뷔테른', by: pop('아메데오 모딜리아니', 'Amedeo Modigliani', '1919').ko, desc: '긴 목과 갸름한 얼굴. 모딜리아니가 사랑한 아내를 그렸다.' },
    { title: 'Jeanne Hébuterne', by: pop('아메데오 모딜리아니', 'Amedeo Modigliani', '1919').en, desc: 'A long neck and an oval face: Modigliani’s beloved wife.' },
  ),
  hals: art(
    { title: '즐거운 술꾼', by: pop('프란스 할스', 'Frans Hals', '1628–30').ko, desc: '잔을 들고 말을 거는 듯한 웃음. 빠른 붓질로 한순간을 붙잡았다.' },
    { title: 'The Merry Drinker', by: pop('프란스 할스', 'Frans Hals', '1628–30').en, desc: 'Glass raised, he seems to talk to you. Quick strokes catch a moment.' },
  ),
  wave: art(
    { title: '가나가와 앞바다의 파도', by: pop('가쓰시카 호쿠사이', 'Katsushika Hokusai', 'c.1831').ko, desc: '「후지산 36경」 목판화. 거대한 파도 뒤에 작은 후지산이 숨어 있다.' },
    { title: 'Under the Wave off Kanagawa', by: pop('가쓰시카 호쿠사이', 'Katsushika Hokusai', 'c.1831').en, desc: 'From “Thirty-six Views of Mount Fuji.” A tiny Fuji hides behind the wave.' },
  ),
  stuart: art(
    { title: '조지 워싱턴', by: pop('길버트 스튜어트', 'Gilbert Stuart', '1795').ko, desc: '미국 1달러 지폐 속 워싱턴 초상을 그린 화가의 또 다른 워싱턴.' },
    { title: 'George Washington', by: pop('길버트 스튜어트', 'Gilbert Stuart', '1795').en, desc: 'By the painter of the Washington on the US one-dollar bill.' },
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
  jatte: art(
    { title: '그랑드자트섬의 일요일 오후', by: '조르주 쇠라 · 1884–86', desc: '작은 색 점을 셀 수 없이 찍어 그렸다. 완성까지 2년이 걸렸다.' },
    { title: 'A Sunday on La Grande Jatte', by: 'Georges Seurat · 1884–86', desc: 'Made of countless tiny dots of color. It took him two years.' },
  ),
  lilypond: art(
    { title: '수련 연못', by: '클로드 모네 · 1900', desc: '지베르니 집 정원에 모네가 직접 만든 일본식 다리와 수련 연못.' },
    { title: 'Water Lily Pond', by: 'Claude Monet · 1900', desc: 'The Japanese bridge and lily pond Monet built in his Giverny garden.' },
  ),
  harvest: art(
    { title: '추수하는 사람들', by: '피터르 브뤼헐 · 1565', desc: '한 해의 때를 그린 연작. 배나무 그늘에서 점심 먹고 낮잠 자는 농부들.' },
    { title: 'The Harvesters', by: 'Pieter Bruegel the Elder · 1565', desc: 'Workers lunch and nap under a pear tree, from a series on the year.' },
  ),
  haystacks: art(
    { title: '건초더미(늦여름)', by: '클로드 모네 · 1890–91', desc: '같은 건초더미를 계절과 시간마다 그린 연작. 주인공은 빛이다.' },
    { title: 'Stacks of Wheat (End of Summer)', by: 'Claude Monet · 1890–91', desc: 'One of a series of the same stacks at every hour. Light is the star.' },
  ),
  toledo: art(
    { title: '톨레도 풍경', by: '엘 그레코 · 1600 무렵', desc: '폭풍이 몰려오는 하늘 아래 스페인 톨레도. 그가 남긴 드문 풍경화다.' },
    { title: 'View of Toledo', by: 'El Greco · c.1600', desc: 'Toledo, Spain, under a stormy sky. One of his rare landscapes.' },
  ),
  rainyparis: art(
    { title: '파리의 거리, 비 오는 날', by: '귀스타브 카유보트 · 1877', desc: '새로 닦은 파리 대로를 우산 쓴 사람들이 걷는다. 젖은 돌길이 빛난다.' },
    { title: 'Paris Street; Rainy Day', by: 'Gustave Caillebotte · 1877', desc: 'Umbrellas on a new Paris boulevard. The wet cobbles shine.' },
  ),
  littlestreet: art(
    { title: '작은 거리', by: '요하네스 페르메이르 · 1658 무렵', desc: '델프트 골목의 집들. 실제 자리가 어디였는지 2015년에야 밝혀졌다.' },
    { title: 'The Little Street', by: 'Johannes Vermeer · c.1658', desc: 'Houses in Delft. Their real location was only found in 2015.' },
  ),
  /* ---------- 서양화 · 인물과 정물 ---------- */
  basket: art(
    { title: '사과 바구니', by: '폴 세잔 · 1893 무렵', desc: '기울어진 탁자와 바구니. 세잔은 사과 하나로 파리를 놀라게 하겠다 했다.' },
    { title: 'The Basket of Apples', by: 'Paul Cézanne · c.1893', desc: 'A tilted table and basket. He meant to astonish Paris with an apple.' },
  ),
  irises: art(
    { title: '붓꽃', by: '빈센트 반 고흐 · 1890', desc: '생레미를 떠나기 전에 그린 꽃병의 붓꽃. 분홍 바탕이 바래 하얘졌다.' },
    { title: 'Irises', by: 'Vincent van Gogh · 1890', desc: 'Painted before he left Saint-Rémy. The pink background faded to white.' },
  ),
  bedroom: art(
    { title: '아를의 침실', by: '빈센트 반 고흐 · 1889', desc: '아를 노란 집의 고흐 방. 같은 방을 세 번 그렸고 이것이 두 번째다.' },
    { title: 'The Bedroom', by: 'Vincent van Gogh · 1889', desc: 'His room in the Yellow House, Arles. Painted three times; this is the second.' },
  ),
  milkmaid: art(
    { title: '우유 따르는 여인', by: '요하네스 페르메이르 · 1660 무렵', desc: '창가 빛 속에서 하녀가 우유를 붓는다. 빵 위 반짝이는 빛 점까지 그렸다.' },
    { title: 'The Milkmaid', by: 'Johannes Vermeer · c.1660', desc: 'A maid pours milk in the window light. Even the bread glints with dots.' },
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
  sisters: art(
    { title: '두 자매(테라스에서)', by: '피에르오귀스트 르누아르 · 1881', desc: '센강 가 테라스의 두 소녀. 제목과 달리 사실 자매가 아니었다.' },
    { title: 'Two Sisters (On the Terrace)', by: 'Pierre-Auguste Renoir · 1881', desc: 'Two girls on a terrace by the Seine. Despite the title, not sisters.' },
  ),
  /* ---------- 동양화 · 수묵(한국 그림은 국립중앙박물관 공공누리 1유형이라 작가 줄에 출처를 밝힌다) ---------- */
  bamboo: art(
    { title: '풍죽(바람 속 대나무)', by: '탄은 이정 · 17세기 초', desc: '조선 왕족 화가 탄은의 대나무. 바람에 휘는 잎이 금빛 비단 위에서 흔들린다.' },
    { title: 'Bamboo in the Wind', by: 'Yi Jeong (Taneun) · early 17th c.', desc: 'By the Joseon royal painter Taneun. Leaves bend in the wind on gold-flecked silk.' },
  ),
  plum: art(
    { title: '매화', by: '김농(진눙) · 1757', desc: '청나라 양주팔괴 가운데 한 사람. 겨울 끝에 피는 매화를 빽빽하게.' },
    { title: 'Plum Blossoms', by: 'Jin Nong · 1757', desc: 'One of the Eight Eccentrics of Yangzhou, painting late-winter plums.' },
  ),
  sehando: art(
    { title: '세한도', by: '추사 김정희 · 국립중앙박물관', desc: '1844년 제주 유배 중, 변치 않은 제자에게 겨울 소나무를 그려 보냈다.' },
    { title: 'Sehando (Winter Scene)', by: 'Kim Jeong-hui · Natl. Museum of Korea', desc: '1844, in exile on Jeju: winter pines for a pupil who stayed loyal.' },
  ),
  inwang: art(
    { title: '인왕제색도', by: '겸재 정선 · 국립중앙박물관', desc: '1751년 비 갠 뒤의 인왕산. 젖은 바위를 먹으로 굵게 칠해 우뚝 세웠다.' },
    { title: 'Mount Inwang After Rain', by: 'Jeong Seon · Natl. Museum of Korea', desc: '1751: Mount Inwang after rain, its wet rocks in bold, heavy ink.' },
  ),
  eagles: art(
    { title: '독수리 두 마리', by: '팔대산인(주탑) · 1702', desc: '명 왕족 출신의 괴짜 화가. 바위 위 독수리가 날카롭게 아래를 노려본다.' },
    { title: 'Two Eagles', by: 'Bada Shanren (Zhu Da) · 1702', desc: 'An eccentric painter of Ming royal blood. The eagles glare down from the rock.' },
  ),
  ssireum: art(
    { title: '씨름', by: '단원 김홍도 · 국립중앙박물관', desc: '구경꾼이 빙 둘러앉은 씨름판. 누가 넘어갈지 표정을 보면 안다.' },
    { title: 'Ssireum (Wrestling)', by: 'Kim Hong-do · Natl. Museum of Korea', desc: 'Wrestlers ringed by onlookers. Their faces tell you who will fall.' },
  ),
  seodang: art(
    { title: '서당', by: '단원 김홍도 · 국립중앙박물관', desc: '훈장님께 혼난 아이가 훌쩍이고, 친구들은 웃음을 꾹 참는다.' },
    { title: 'Seodang (Village School)', by: 'Kim Hong-do · Natl. Museum of Korea', desc: 'A scolded boy sniffles while his classmates hold back their laughter.' },
  ),
  mudong: art(
    { title: '무동(춤추는 아이)', by: '단원 김홍도 · 국립중앙박물관', desc: '북·장구·피리 가락에 맞춰 아이가 신나게 춤춘다. 소리가 들리는 듯하다.' },
    { title: 'Dancing Boy', by: 'Kim Hong-do · Natl. Museum of Korea', desc: 'A boy dances to drums and pipes. You can almost hear the music.' },
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
