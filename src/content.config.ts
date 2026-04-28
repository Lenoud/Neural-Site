import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
  schema: z.object({
    title: z.string().optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    order: z.number().optional(),
    作者: z.any().optional(),
    创建日期: z.any().optional(),
    修改日期: z.any().optional(),
  }),
});

export const collections = { notes };
