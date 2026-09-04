// 비밀번호 생성 길이 범위. src/main/vault.ts 의 GEN_MIN_LENGTH / GEN_MAX_LENGTH 와 같아야 한다.
export const GEN_MIN = 8;
export const GEN_MAX = 64;
export const GEN_DEFAULT = 20;

export const clampGenLength = (n: number): number =>
  Number.isFinite(n)
    ? Math.min(GEN_MAX, Math.max(GEN_MIN, Math.round(n)))
    : GEN_DEFAULT;
