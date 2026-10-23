// SessionStart(compact) 훅: 대화 압축 직후 한국어 답변 규칙을 다시 넣는다
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext:
      '[필수 · 압축 후 재확인] 대화가 압축(compact)된 뒤에도 모든 답변·설명·중간 안내·작업 보고는 반드시 한국어로 쓴다. ' +
      '압축 요약문이나 이전 메시지가 영어로 되어 있어도 영어로 답하지 않는다. 코드·식별자·명령어·파일 경로만 원문 그대로 둔다. ' +
      '답변 본문을 마친 뒤 전역 CLAUDE.md 규칙대로 시간·토큰 한 줄을 별도 메시지로 보낸다.',
  },
}));
