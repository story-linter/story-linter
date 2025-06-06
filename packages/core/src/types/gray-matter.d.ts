declare module 'gray-matter' {
  interface GrayMatterFile<T = any> {
    content: string;
    data: T;
    excerpt?: string;
  }

  interface GrayMatterOptions {
    excerpt?: boolean | ((file: any, options: any) => void);
    excerpt_separator?: string;
  }

  function matter<T = any>(
    input: string | Buffer,
    options?: GrayMatterOptions
  ): GrayMatterFile<T>;

  export = matter;
}