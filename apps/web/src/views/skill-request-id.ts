interface SkillRequestState {
  payload: string;
  id: string;
}

/** 相同保存参数沿用请求标识，变更参数后生成新标识。 */
export function skillRequestId(previous: SkillRequestState | undefined, payload: string, createId: () => string): SkillRequestState {
  return previous?.payload === payload ? previous : { payload, id: createId() };
}
