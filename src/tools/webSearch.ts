import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import colors from '@colors/colors';

export const webSearch = tool(
  async ({
    type,
    query,
    interval,
  }: {
    type: string;
    query: string;
    interval:
      | 'lastHour'
      | 'last24Hours'
      | 'lastWeek'
      | 'lastMonth'
      | 'lastYear'
      | 'allTime';
  }) => {
    console.log(colors.cyan(`🔎 Buscando no Google por: ${query} (${type})`));

    // Map user-friendly interval to `tbs` values
    const intervalMapping: Record<typeof interval, string> = {
      lastHour: 'qdr:h',
      last24Hours: 'qdr:d',
      lastWeek: 'qdr:w',
      lastMonth: 'qdr:m',
      lastYear: 'qdr:y',
      allTime: '',
    };

    const tbs = intervalMapping[interval];

    const data = JSON.stringify({
      q: query,
      num: 20,
      tbs: tbs !== '' ? tbs : null,
    });

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://google.serper.dev/' + type,
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY!,
        'Content-Type': 'application/json',
      },
      data,
    };

    try {
      const response = await axios.request(config);
      // console.log('resultados', response.data[type].length);
      if (!response.data) {
        console.log('🚨🚨🚨');
        console.log(response);
      }
      return response.data || [];
    } catch (error: any) {
      console.error('Error during Serper search:', error.message);
      return {
        error: 'Failed to execute Serper search',
        details: error.message,
      };
    }
  },
  {
    name: 'webSearch',
    description: 'Realiza uma busca no Google.',
    schema: z.object({
      type: z
        .enum(['search', 'news', 'maps', 'images', 'reviews'])
        .describe('Tipo de conteúdo a ser buscado'),
      query: z.string().describe('Termo de busca'),
      interval: z
        .enum(['lastHour', 'last24Hours', 'lastWeek', 'lastMonth', 'lastYear'])
        .describe('Intervalo de tempo para a busca'),
    }),
  },
);
