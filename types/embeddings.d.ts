declare module '@nvidia/embeddings' {
  export function embed(text: string | string[]): Promise<number[] | number[][]>;
  export function getEmbedding(text: string): Promise<number[]>;
}
