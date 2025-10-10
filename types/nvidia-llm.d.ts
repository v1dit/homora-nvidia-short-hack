declare module '@nvidia/llm' {
  export function chat(opts: any): Promise<any>;
  export function generate(opts: any): Promise<any>;
}
