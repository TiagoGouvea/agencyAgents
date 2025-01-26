import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import fs from 'node:fs';
import colors from '@colors/colors';
import slugify from 'slugify';

export const writeMarkdown = tool(
  async ({ fileName, content }: { fileName: string; content: string }) => {
    // console.log('fileName', fileName);
    // console.log('content', content);

    try {
      const finalFileName =
        './results/' + Date.now() + '-' + slugify(fileName) + '.md';
      fs.writeFileSync(finalFileName, content);

      console.log(
        colors.cyan(
          `💾 Conteúdo final salvo em arquivo Markdown: ${finalFileName}`,
        ),
      );

      return 'Arquivo salvo com sucesso.';
    } catch (error: any) {
      console.error('Error during file writing:', error.message);
      return {
        error: 'Failed to save file',
        details: error.message,
      };
    }
  },
  {
    name: 'writeMarkdown',
    description: 'Grava um arquivo markdown',
    schema: z.object({
      fileName: z
        .string()
        .describe(
          'Simple last fraction of the fileName, like "AI Blog Post" .',
        ),
      content: z.string().describe('File content in markdown format'),
    }),
  },
);
