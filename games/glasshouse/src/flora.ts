/**
 * 도감에 실리는 꽃 24종(판 하나에 한 종). 글은 사실만 확인해 직접 썼다(위키백과 문장을 옮기지 않음).
 * 꽃말은 한국에서 널리 알려진 것을 적고 영어는 그 뜻을 옮겼다. checked: 출처 기사로 다시 확인한 꽃말(README 상업 기준 참고)
 */
export type FlowerId =
  | 'tulip' | 'daffodil' | 'hyacinth' | 'lily' | 'pansy' | 'peony'
  | 'forgetmenot' | 'hydrangea' | 'lavender' | 'iris' | 'balsam' | 'sunflower'
  | 'cosmos' | 'lycoris' | 'gujeolcho' | 'dahlia' | 'aster' | 'mum'
  | 'camellia' | 'cyclamen' | 'poinsettia' | 'hellebore' | 'snowdrop' | 'adonis';

/** 판 방 크기 단계(roomgen.ts·오늘의 정원 생성에만 씀, 꽃·스킨과는 상관없음) */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

interface Text {
  name: string;
  meaning: string;
  origin: string;
  desc: string;
}

export interface Flower {
  id: FlowerId;
  sci: string;
  /** 피는 달(시작, 끝). 끝이 시작보다 작으면 해를 넘김 */
  months: [number, number];
  ko: Text;
  en: Text;
}

const F = (id: FlowerId, sci: string, months: [number, number], ko: Text, en: Text): Flower => ({ id, sci, months, ko, en });

export const FLOWERS: Flower[] = [
  F('tulip', 'Tulipa gesneriana', [4, 5],
    { name: '튤립', meaning: '사랑의 고백', origin: '중앙아시아 · 튀르키예', desc: '알뿌리가 겨울 추위를 겪어야 봄에 꽃대를 올린다. 17세기 네덜란드에서는 알뿌리 하나가 집 한 채 값에 팔릴 만큼 귀했다.' },
    { name: 'Tulip', meaning: 'A declaration of love', origin: 'Central Asia · Türkiye', desc: 'The bulb needs a cold winter before it sends up a flower. In 17th-century Holland a single bulb could cost as much as a house.' }),
  F('daffodil', 'Narcissus pseudonarcissus', [3, 4],
    { name: '수선화', meaning: '자기 사랑', origin: '서유럽', desc: '가운데의 나팔처럼 생긴 덧꽃부리가 눈에 띈다. 물에 비친 제 모습에 반한 그리스 신화의 나르키소스에서 이름이 왔다.' },
    { name: 'Daffodil', meaning: 'Self-love', origin: 'Western Europe', desc: 'Its trumpet-shaped corona stands out at the centre. The name comes from Narcissus, the Greek youth who fell for his own reflection.' }),
  F('hyacinth', 'Hyacinthus orientalis', [3, 4],
    { name: '히아신스', meaning: '유희', origin: '지중해 동부', desc: '작은 종 모양 꽃이 꽃대를 빙 둘러 빽빽이 피고 향이 짙다. 알뿌리를 물병에 얹어 뿌리가 자라는 모습을 보며 키우기도 한다.' },
    { name: 'Hyacinth', meaning: 'Playfulness', origin: 'Eastern Mediterranean', desc: 'Small bell-shaped flowers crowd around the stalk with a strong scent. The bulb can be grown on a glass of water so the roots show.' }),
  F('lily', 'Convallaria majalis', [4, 5],
    { name: '은방울꽃', meaning: '틀림없이 행복해진다', origin: '유라시아 온대(한국 포함)', desc: '나무 그늘 아래 숲 바닥에서 땅속줄기로 퍼져 무리를 이룬다. 향은 좋지만 온 포기에 독이 있어 먹으면 안 된다.' },
    { name: 'Lily of the Valley', meaning: 'Happiness will surely come', origin: 'Temperate Eurasia (incl. Korea)', desc: 'It spreads by underground stems across shady woodland floors. The scent is sweet, but every part of the plant is poisonous.' }),
  F('pansy', 'Viola × wittrockiana', [3, 5],
    { name: '팬지', meaning: '나를 생각해 주세요', origin: '유럽(원예 교배종)', desc: '19세기 영국에서 야생 제비꽃 여러 종을 교배해 만들었다. 이름은 \'생각\'을 뜻하는 프랑스어 pensée에서 왔다.' },
    { name: 'Pansy', meaning: 'Think of me', origin: 'Europe (garden hybrid)', desc: 'Bred in 19th-century England by crossing several wild violets. The name comes from the French pensée, meaning "thought".' }),
  F('peony', 'Paeonia lactiflora', [5, 6],
    { name: '작약', meaning: '수줍음', origin: '중국 북부 · 몽골 · 시베리아', desc: '주먹만 한 꽃봉오리가 며칠에 걸쳐 천천히 벌어진다. 뿌리는 오래전부터 약재로 써 왔다.' },
    { name: 'Chinese Peony', meaning: 'Bashfulness', origin: 'Northern China · Mongolia · Siberia', desc: 'Fist-sized buds open slowly over several days. Its roots have been used as a herbal remedy for centuries.' }),

  F('forgetmenot', 'Myosotis scorpioides', [5, 7],
    { name: '물망초', meaning: '나를 잊지 마세요', origin: '유럽 · 아시아 온대', desc: '냇가처럼 늘 축축한 땅을 좋아한다. 꽃차례가 전갈 꼬리처럼 말려 있다가 피면서 차례로 풀린다.' },
    { name: 'Forget-me-not', meaning: 'Do not forget me', origin: 'Temperate Europe · Asia', desc: 'It loves ground that stays wet, like a stream bank. The flower spike is coiled like a scorpion tail and unrolls as it blooms.' }),
  F('hydrangea', 'Hydrangea macrophylla', [6, 7],
    { name: '수국', meaning: '진심', origin: '일본', desc: '크게 보이는 꽃잎은 사실 꽃받침이다. 흙이 산성이면 푸른빛, 알칼리성이면 붉은빛을 띤다.' },
    { name: 'Hydrangea', meaning: 'Heartfelt feelings', origin: 'Japan', desc: 'What look like petals are really sepals. Acidic soil turns the flowers blue; alkaline soil turns them pink.' }),
  F('lavender', 'Lavandula angustifolia', [6, 8],
    { name: '라벤더', meaning: '침묵', origin: '지중해 서부', desc: '햇볕이 강하고 메마른 땅에서 향이 더 짙어진다. 이름은 \'씻다\'를 뜻하는 라틴어 lavare와 이어진다고 알려져 있다.' },
    { name: 'Lavender', meaning: 'Silence', origin: 'Western Mediterranean', desc: 'Strong sun and dry soil make its scent richer. The name is thought to come from the Latin lavare, "to wash".' }),
  F('iris', 'Iris ensata', [6, 7],
    { name: '꽃창포', meaning: '우아한 마음', origin: '한국 · 일본 · 중국 동북부', desc: '물가나 습한 풀밭에서 자란다. 단오에 머리를 감던 창포와는 이름만 닮은 다른 식물이다.' },
    { name: 'Japanese Iris', meaning: 'A graceful heart', origin: 'Korea · Japan · NE China', desc: 'It grows by water and in damp meadows. Despite the similar Korean name, it is unrelated to the sweet flag used for washing hair.' }),
  F('balsam', 'Impatiens balsamina', [6, 8],
    { name: '봉선화', meaning: '나를 건드리지 마세요', origin: '인도 · 미얀마 · 중국 남부', desc: '잎겨드랑이마다 꽃이 매달리듯 핀다. 익은 열매는 살짝만 건드려도 터져 씨앗을 튕겨 내고, 꽃잎을 찧어 손톱을 물들이던 풍습이 있다.' },
    { name: 'Garden Balsam', meaning: 'Touch me not', origin: 'India · Myanmar · southern China', desc: 'Its flowers hang from the leaf joints. Ripe pods burst at the slightest touch and fling out their seeds, and the petals were crushed to dye fingernails.' }),
  F('sunflower', 'Helianthus annuus', [7, 9],
    { name: '해바라기', meaning: '숭배', origin: '북아메리카', desc: '큰 꽃 한 송이처럼 보이지만 작은 꽃 수백 송이가 모인 꽃차례다. 씨앗은 서로 엇갈린 나선 무늬로 빽빽이 들어선다.' },
    { name: 'Sunflower', meaning: 'Adoration', origin: 'North America', desc: 'What looks like one flower is a head of hundreds of tiny florets. Its seeds pack tightly in crossing spirals.' }),

  F('cosmos', 'Cosmos bipinnatus', [9, 10],
    { name: '코스모스', meaning: '순정', origin: '멕시코', desc: '낮이 짧아져야 꽃을 피우는 식물이다. 이름은 \'질서와 조화\'를 뜻하는 그리스어 kosmos에서 왔다.' },
    { name: 'Cosmos', meaning: 'A pure heart\'s love', origin: 'Mexico', desc: 'It blooms only when the days grow short. The name comes from the Greek kosmos, "order and harmony".' }),
  F('lycoris', 'Lycoris radiata', [9, 9],
    { name: '꽃무릇', meaning: '이룰 수 없는 사랑', origin: '중국', desc: '꽃이 진 뒤에야 잎이 돋아 꽃과 잎이 서로 만나지 못한다. 절 둘레 그늘진 숲에 무리 지어 심은 곳이 많다.' },
    { name: 'Red Spider Lily', meaning: 'Love that cannot be', origin: 'China', desc: 'The leaves appear only after the flowers fade, so the two never meet. It is often planted in shady groves around temples.' }),
  F('gujeolcho', 'Chrysanthemum zawadskii', [9, 11],
    { name: '구절초', meaning: '어머니의 사랑', origin: '한국 · 중국 · 몽골 · 시베리아', desc: '음력 9월 9일 무렵 꺾어야 약효가 좋다고 해서 이름이 붙었다고 전한다. 필 때는 연분홍이다가 활짝 피면 희어진다.' },
    { name: 'Siberian Chrysanthemum', meaning: 'A mother\'s love', origin: 'Korea · China · Mongolia · Siberia', desc: 'Its Korean name says it was best picked as medicine around the ninth day of the ninth lunar month. It opens pale pink and turns white.' }),
  F('dahlia', 'Dahlia pinnata', [7, 10],
    { name: '달리아', meaning: '감사', origin: '멕시코 · 중앙아메리카', desc: '멕시코의 나라꽃이다. 땅속 덩이뿌리로 겨울을 나며, 꽃잎이 겹겹이 포개진 품종이 수만 가지에 이른다.' },
    { name: 'Dahlia', meaning: 'Gratitude', origin: 'Mexico · Central America', desc: 'The national flower of Mexico. It overwinters as a tuber, and tens of thousands of layered varieties have been bred.' }),
  F('aster', 'Callistephus chinensis', [7, 9],
    { name: '과꽃', meaning: '추억', origin: '중국 북부 · 한국 북부', desc: '한 속에 한 종뿐인 식물이다. 18세기에 중국에서 유럽으로 건너가 여러 빛깔의 원예종이 만들어졌다.' },
    { name: 'China Aster', meaning: 'Memories', origin: 'Northern China · Northern Korea', desc: 'It is the only species in its genus. Taken from China to Europe in the 18th century, it was bred into many colours.' }),
  F('mum', 'Chrysanthemum morifolium', [10, 11],
    { name: '국화', meaning: '고결', origin: '중국', desc: '밤이 길어져야 꽃눈이 생겨, 밤에 불을 비추면 피는 때를 늦출 수 있다. 서리를 견디며 늦게까지 피어 사군자의 하나로 꼽힌다.' },
    { name: 'Chrysanthemum', meaning: 'Nobility', origin: 'China', desc: 'Buds form only as nights lengthen, so night lighting delays blooming. It flowers late through frost and is one of the Four Gentlemen of East Asian painting.' }),

  F('camellia', 'Camellia japonica', [12, 4],
    { name: '동백', meaning: '그 누구보다 당신을 사랑합니다', origin: '한국 · 일본 · 중국 동부 바닷가', desc: '벌과 나비가 드문 겨울에는 동박새가 꿀을 먹으며 꽃가루를 옮긴다. 질 때는 꽃잎이 흩어지지 않고 송이째 떨어진다.' },
    { name: 'Camellia', meaning: 'I love you more than anyone', origin: 'Coasts of Korea · Japan · E China', desc: 'In winter, when bees are scarce, white-eye birds carry its pollen while sipping nectar. The flower falls whole rather than shedding petals.' }),
  F('cyclamen', 'Cyclamen persicum', [11, 3],
    { name: '시클라멘', meaning: '수줍음', origin: '지중해 동부', desc: '꽃잎이 위로 젖혀져 날아오르는 나비처럼 보인다. 서늘하고 밝은 곳을 좋아해 겨울 창가에서 오래 핀다.' },
    { name: 'Cyclamen', meaning: 'Shyness', origin: 'Eastern Mediterranean', desc: 'Its swept-back petals look like butterflies taking off. It likes cool, bright places and blooms for weeks on a winter windowsill.' }),
  F('poinsettia', 'Euphorbia pulcherrima', [12, 2],
    { name: '포인세티아', meaning: '축복', origin: '멕시코', desc: '붉은 부분은 꽃잎이 아니라 잎이 변한 포엽이고, 진짜 꽃은 가운데 작은 노란 알갱이다. 밤이 길어져야 포엽이 물든다.' },
    { name: 'Poinsettia', meaning: 'Blessing', origin: 'Mexico', desc: 'The red parts are bracts, modified leaves; the true flowers are the small yellow beads at the centre. Long nights bring out the colour.' }),
  F('hellebore', 'Helleborus niger', [12, 3],
    { name: '크리스마스로즈', meaning: '나의 불안을 달래 주세요', origin: '유럽 중부 · 남부 산지', desc: '이름과 달리 장미가 아니라 미나리아재비과 식물이다. 눈 덮인 산의 그늘진 숲에서 한겨울에 흰 꽃을 피운다.' },
    { name: 'Christmas Rose', meaning: 'Ease my anxiety', origin: 'Mountains of central · southern Europe', desc: 'Despite the name it is no rose but a buttercup relative. It opens white flowers in midwinter in shady, snowy mountain woods.' }),
  F('snowdrop', 'Galanthus nivalis', [1, 3],
    { name: '설강화', meaning: '희망', origin: '유럽', desc: '눈이 채 녹기 전에 땅을 뚫고 올라온다. 고개 숙인 흰 꽃의 안쪽 꽃잎에 초록 무늬가 있다.' },
    { name: 'Snowdrop', meaning: 'Hope', origin: 'Europe', desc: 'It pushes up through the ground before the snow has melted. The inner petals of its nodding white flower carry a green mark.' }),
  F('adonis', 'Adonis amurensis', [2, 4],
    { name: '복수초', meaning: '영원한 행복', origin: '한국 · 일본 · 중국 동북부 · 러시아 극동', desc: '눈 속에서 노란 꽃을 피워 \'얼음새꽃\'이라고도 한다. 오목한 꽃이 햇빛을 모아 꽃 안이 바깥보다 따뜻하다.' },
    { name: 'Amur Adonis', meaning: 'Everlasting happiness', origin: 'Korea · Japan · NE China · Russian Far East', desc: 'It blooms yellow through the snow. Its bowl-shaped flower gathers sunlight, keeping the inside warmer than the air.' }),
];

export const FLOWER = Object.fromEntries(FLOWERS.map((f) => [f.id, f])) as Record<FlowerId, Flower>;
