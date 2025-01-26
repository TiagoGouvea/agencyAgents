import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import colors from '@colors/colors';
import { CrawlingAPI } from 'crawlbase';
const api = new CrawlingAPI({ token: 'lZHW5vIGq1MFJnM32wVr0A' });
import OpenAI from 'openai';
import * as cheerio from 'cheerio';

export const webScrap = tool(
  async ({ urlToRead, lookFor }: { urlToRead: string; lookFor: string }) => {
    let url = urlToRead;
    console.log(colors.cyan(`🌐 Lendo página da web: ${url}`));

    try {
      // Return raw scraped content
      // Faz uma requisição GET para a URL fornecida
      const response = await api.get(url, { autoparse: true });

      if (response.statusCode === 200) {
        const content = response.body;

        // Se 'lookFor' estiver definido, você pode implementar lógica adicional aqui
        // para procurar por informações específicas no 'content'

        // console.log('Conteúdo da página:', content.length);

        console.log(
          colors.cyan(
            `🌐 Extraindo informação útil da página, procurando por ${lookFor}`,
          ),
        );

        // console.log('--------------------------------------');
        const stripedContent = stripHtml(content);
        // console.log('stripedContent', stripedContent);

        // console.log('--------------------------------------');
        const simplifiedContent = await simplifyContent(
          stripedContent,
          lookFor,
        );

        // console.log('simplifiedContent', simplifiedContent);

        return simplifiedContent;
      } else {
        console.error(
          'Erro ao acessar a página:',
          response.statusCode,
          response.originalStatus,
          response.pcStatus,
        );
        return {
          error: 'Falha ao acessar a página',
          details: `Status Code: ${response.statusCode}`,
        };
      }
    } catch (error: any) {
      console.error(
        'Error during web scraping or embedding processing:',
        error.message,
      );
      return {
        error: 'Failed to execute web scraping or embeddings processing',
        details: error.message,
      };
    }
  },
  {
    name: 'webScrap',
    description: 'Fetches content from a web page',
    schema: z.object({
      urlToRead: z.string().describe('URL of the web page to scrape'),
      lookFor: z.string().describe('Informações a serem extraídas'),
    }),
  },
);

export async function simplifyContent(
  htmlBody: string,
  lookFor: string,
): Promise<string> {
  const prompt = `
    Você é um assistente especializado em processar HTML. Eu fornecerei um corpo HTML, e sua tarefa será retornar o conteúdo principal em texto puro.
    Remova:
    - Todo o CSS
    - Tags HTML
    - Menus de navegação ou rodapés
    - Publicidade ou elementos irrelevantes
    
    Foque em:
    - Conteúdo relacionado ao tópico "${lookFor}"
    - Retorne apenas o texto que está diretamente relacionado ao que foi solicitado.
    
    Aqui está o HTML:
    ${htmlBody}`;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    console.log('repsonse', response.choices);

    if (response.choices?.[0]?.message?.content) {
      return response.choices[0].message.content.trim();
    } else {
      throw new Error('No response content from OpenAI.');
    }
  } catch (error: any) {
    console.error('Error while simplifying HTML content:', error.message);
    return `Error: ${error.message}`;
  }
}

function stripHtml(html: string) {
  const $ = cheerio.load(html);
  $('style, script, img, link, meta, noscript').remove();
  // Retira atributos como "class", "id", "style", etc.
  $('*').each((_, el) => {
    $(el).removeAttr('class').removeAttr('id').removeAttr('style');
  });
  // Retorna o HTML simplificado
  return $.html();
}
