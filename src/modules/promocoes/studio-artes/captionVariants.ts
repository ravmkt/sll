export type CaptionOverrides = Record<string, string>;

export const captionFor = (channelKey: string, base: string, overrides: CaptionOverrides) =>
  overrides[channelKey] ?? base;

export const bioVersion = (base: string) =>
  base.replace(/\{\{(site|link_produto)\}\}/g, 'link na bio');