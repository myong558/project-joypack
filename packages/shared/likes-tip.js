// 좋아요 첫 안내 문구(likes.ts likeTip). 글꼴 서브셋은 공통 모듈의 .js·.css 글자만 모으므로(scripts/font-text.mjs)
// 화면에 보이는 글은 .ts 가 아니라 이 파일에 둔다.
export const LIKE_TIP = {
  ko: '고마워요! 좋아요는 어떤 게임을 더 다듬고 키울지 정할 때 참고해요.',
  en: 'Thanks! Likes help us decide which games to polish and grow.',
};

// 게임 설정 창 좋아요 칸(likes.ts likeSection): 칸 제목 · 단추 옆 설명. title 은 위 메뉴 단추의 마우스 올림 이름으로도 쓴다
export const LIKE_TEXT = {
  ko: { title: '좋아요', note: '어떤 게임을 더 다듬고 키울지 정할 때 참고해요.' },
  en: { title: 'Like', note: 'Likes help us decide which games to polish and grow.' },
};
