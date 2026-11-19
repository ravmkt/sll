export interface PhotoAdj { s: number; x: number; y: number }
export type PhotoAdjustMap = Record<string, PhotoAdj>;
export const DEF_ADJ: PhotoAdj = { s: 1, x: 0, y: 0 };
export const adjKey = (productId: string, channelKey: string) => `${productId}|${channelKey}`;