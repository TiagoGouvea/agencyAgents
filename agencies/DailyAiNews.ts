import type { Agency } from '../src/types.ts';
import { runAgency } from '../src/agency.ts';
import { webSearch } from '../src/tools/webSearch.ts';
import { webScrap } from '../src/tools/webScrap.ts';
import { writeMarkdown } from '../src/tools/writeMarkdown.ts';

export const agency: Agency = {
  title: 'Equipe produtora de resumo diário de notícias',
  baseSystemPrompt: `Vocês produzem um diário de notícias sobre o assunto especificado.`,
  allowUserInput: false,
  agents: [
    {
      id: 'journalist',
      name: 'Jornalista',
      shortDescription:
        'Você é um jornalista especializado em identificar as noticias mais relevantes do dia.',
      fullPrompt: `
        Você realiza uma pesquisa detalhada sobre o assunto em questão e elabora uma lista com as principais notícias.
        
        # Pesquisar
        Acontecimentos mais recentes sobre Inteligência Artificial, publicadas em fontes internacionais.
        Assunto: Novidades na Inteligência Artificial
        Foco: Inovação e tecnologia
        Publico alvo: Desenvolvedores/Profissionais de tecnologia
        Pesquisar conteúdos: notícias em inglês (IMPORTANTE)
        Período de pesquisa: Últimas 24 horas

        # Processo
        1 - Comece o trabalho chamando o agente Pesquisador para encontrar os possíveis conteúdos.
        2 - Em seguida chame o agente Leitor para extrair as informações de cada notícia, para que tenha o conteúdo detalhado.
        3 - Com todo o conteúdo em mãos retorne o resultado final.
                
        # Retorno final
        Lista com 5 notícias mais relevantes, contendo o nome da fonte, o título da notícia, link, e resumo em um paragrafo.
        Escrever conteúdo final em: português
        `,
      allowEndWorkflow: true,
    },
    {
      id: 'pesquisador',
      name: 'Pesquisador da Web',
      shortDescription: 'Procura nos buscadores e retorna uma lista de links',
      fullPrompt: `
        Você procura os termos necessários, e o objetivo da busca, para então selecionar os melhores resultados.
        Você sempre retorna uma lista com sites e urls, e demais informações obtidas.`,
      tools: [webSearch],
    },
    {
      id: 'leitor',
      name: 'Leitor de sites',
      shortDescription: 'Acessa um site e retorna a informação a ser obtida',
      fullPrompt: `
        Você faz o web scrapping do site solicitado e obtém as informações de acordo com os parâmetros fornecidos.`,
      tools: [webScrap],
    },
    {
      id: 'publisher',
      name: 'Publicador',
      shortDescription: 'Publica o conteúdo final produzido pelo jornalista',
      fullPrompt: `
        Você publica o conteúdo final produzido em formato de Markdown, usando a tool writeMarkdown.
        
        Seguir o exemplo de formato abaixo:
        
        \`\`\`
        # Daily AI News - 26 de Janeiro de 2025
        
        [**Noticia 1**](https://www.site.com/noticia1) - Nome da fonte
        Resumo da notícia.
        
        [**Noticia 2**](https://www.site.com/noticia2) - Nome da fonte
        Resumo da notícia.
        \`\`\`
        `,
      tools: [writeMarkdown],
    },
  ],
};

// Run!
runAgency(agency).then();
