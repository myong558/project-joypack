// 조이필드 설정 창 공통 조각(허브·모든 게임, 기준서 1.4). import '@joyfield/shared/settings' + '@joyfield/shared/settings.css'
//   choiceGroup()  : 하나 고르기(컬러 모드·언어·스킨) — role="radiogroup" + 단추마다 role="radio" aria-checked
//   switchRow()    : 켜기/끄기(소리·진동) — 이름 줄 + 스위치(<input type="checkbox" role="switch">)
//   devSection()   : 개발자 모드 TEST 칸 — 맨 위, 제목 TEST → 안내 → 게임 도구 → "출시 화면" 단추 순서
//   bindSettings() : 위 조각에 동작을 붙인다(고른 표시·스위치 아이콘은 여기서 바꾸고, 저장·적용은 앱이 함)
// 짜임(태그·role·클래스·data-*)만 맞추고 모양은 앱마다 자기 styles.css 에 둔다(묶음 클래스는 cls 로: 'seg' · 'skins' · 'chip-row' …).
// 스위치는 settings.css 의 기본 모양을 쓰고 색·크기만 변수(--jp-switch-*)로 앱 것에 맞춘다.
// 이 파일은 문구를 갖지 않는다(앱이 자기 i18n 문구를 넘김 → 글꼴 서브셋이 앱 문구에서 글자를 모음).

export interface ChoiceOption {
  value: string;
  /** 단추 글자(HTML 가능, 앱이 이스케이프) */
  label: string;
  /** 글자 앞 아이콘 SVG */
  icon?: string;
  /** 글자의 언어(언어 단추: 그 언어로 써서 글꼴 위치 보정) */
  lang?: string;
  /** 마우스 올림 이름·읽어 주는 이름(글자를 숨기는 좁은 화면용) */
  title?: string;
}

export interface ChoiceGroupOptions {
  /** 묶음 클래스(앱 모양). 기본 'seg' */
  cls?: string;
  /** 단추마다 더할 클래스(업다운 'chip' 등) */
  itemCls?: string;
  /** 묶음을 읽어 주는 이름(보통 칸 제목과 같음) */
  label?: string;
}

const attr = (s: string) => s.replace(/"/g, '&quot;');

/**
 * 하나 고르기 묶음. 고른 단추만 aria-checked="true"(모양은 앱 css 의 [aria-checked='true']).
 * 아이콘이 있으면 글자를 .label 로 감싼다(좁은 화면에서 글자만 숨기는 앱 css 용). 아이콘이 없으면 글자 그대로(숨기면 빈 단추가 됨)
 */
export function choiceGroup(name: string, options: readonly ChoiceOption[], current: string, o: ChoiceGroupOptions = {}): string {
  const items = options
    .map((op) => {
      const extra = `${op.lang ? ` lang="${op.lang}"` : ''}${op.title ? ` title="${attr(op.title)}" aria-label="${attr(op.title)}"` : ''}`;
      return `<button type="button"${o.itemCls ? ` class="${o.itemCls}"` : ''} role="radio" data-value="${op.value}" aria-checked="${op.value === current}"${extra}>${op.icon ? `${op.icon}<span class="label">${op.label}</span>` : op.label}</button>`;
    })
    .join('');
  return `<div class="${o.cls ?? 'seg'}" role="radiogroup" data-choice="${name}"${o.label ? ` aria-label="${attr(o.label)}"` : ''}>${items}</div>`;
}

/** 켜기/끄기 한 줄: 왼쪽 [아이콘] 이름, 오른쪽 스위치. 줄 어디를 눌러도 바뀐다(label). icons 는 [켜짐, 꺼짐] */
export function switchRow(name: string, on: boolean, label: string, icons?: readonly [string, string]): string {
  const icon = icons ? `<span class="jp-switch-icon" data-on>${icons[0]}</span><span class="jp-switch-icon" data-off>${icons[1]}</span>` : '';
  return `<label class="jp-switch" data-state="${on ? 'on' : 'off'}"><span class="jp-switch-name">${icon}<span class="label">${label}</span></span><input type="checkbox" role="switch" data-switch="${name}"${on ? ' checked' : ''} /><i aria-hidden="true"></i></label>`;
}

export interface DevSectionOptions {
  /** 안내 한 줄(무엇을 할 수 있는지) */
  note?: string;
  /** 게임 도구(판 바로가기 단추 등) */
  tools?: string;
  /** "출시 화면" ↔ "개발 화면" 단추(미리보기·판 바로가기가 있는 게임). on = 지금 출시 화면 보기 */
  release?: { on: boolean; label: string };
  /** 칸에 더할 클래스(앱 모양) */
  cls?: string;
}

/**
 * 개발자 모드 TEST 칸. 부르는 곳에서 꼭 `!__JOYFIELD_PROD__ && Joyfield.devMode() ? devSection(…) : ''` 로 감싸 운영 빌드에서 빠지게 한다(기준서 11.5).
 * 안내·도구·단추가 하나도 없으면 칸을 만들지 않는다(빈 TEST 칸 금지)
 */
export function devSection(o: DevSectionOptions): string {
  if (!o.note && !o.tools && !o.release) return '';
  return `<section class="dev-section${o.cls ? ` ${o.cls}` : ''}"><h3>TEST</h3>${o.note ? `<p class="note dev-note">${o.note}</p>` : ''}${o.tools ?? ''}${
    o.release ? `<button type="button" class="dev-toggle" data-release aria-pressed="${o.release.on}">${o.release.label}</button>` : ''
  }</section>`;
}

export interface SettingsHandlers {
  /** 하나 고르기에서 다른 것을 골랐을 때(같은 것을 다시 누르면 부르지 않음) */
  onChoice?: (name: string, value: string) => void;
  /** 스위치를 바꿨을 때 */
  onSwitch?: (name: string, on: boolean) => void;
}

/** choiceGroup·switchRow 에 동작을 붙인다. 고른 표시(aria-checked)와 스위치 아이콘은 여기서 바꾼다 */
export function bindSettings(root: HTMLElement, h: SettingsHandlers): void {
  root.querySelectorAll<HTMLElement>('[data-choice]').forEach((group) => {
    const buttons = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    buttons.forEach((b, i) => {
      b.addEventListener('click', () => {
        if (b.getAttribute('aria-checked') === 'true') return;
        buttons.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        h.onChoice?.(group.dataset.choice!, b.dataset.value!);
      });
      // 방향 키로 옆 단추에 초점(고르기는 누를 때만: 언어처럼 고르면 창을 다시 그리는 칸이 있음)
      b.addEventListener('keydown', (e) => {
        const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        buttons[(i + step + buttons.length) % buttons.length].focus();
      });
    });
  });
  root.querySelectorAll<HTMLInputElement>('input[data-switch]').forEach((input) =>
    input.addEventListener('change', () => {
      input.closest<HTMLElement>('.jp-switch')!.dataset.state = input.checked ? 'on' : 'off';
      h.onSwitch?.(input.dataset.switch!, input.checked);
    }),
  );
}
