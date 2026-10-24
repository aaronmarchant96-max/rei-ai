declare module "*/sourceIndex.json" {
  const value: {
    generatedAt: string;
    files: { path: string; content: string; size: number }[];
  };
  export default value;
}
