import type { Agency } from '../src/types.ts';
import { runAgency } from '../src/agency.ts';
import { webSearch } from '../src/tools/webSearch.ts';
import { webScrap } from '../src/tools/webScrap.ts';

export const agency: Agency = {
  title: 'Equipe produtora de resumo diário de notícias',
  baseSystemPrompt: `Vocês produzem um diário de notícias sobre o assunto especificado.`,
  allowUserInput: false,
  agents: [
    {
      id: 'webScrapper',
      name: 'Web Scrapper guy',
      shortDescription: 'Acessa um site e retorna a informação a ser obtida',
      fullPrompt: `
        Você faz o web scrapping do site https://benhoyt.com/writings/the-small-web-is-beautiful/ e retorna todo o conteúdo da home`,
      tools: [webScrap],
    },
  ],
};

// Run!
runAgency(agency).then();
