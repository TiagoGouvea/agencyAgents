import {
  convertToOpenAiMessages,
  getAgentTargetNodes,
  rlQuestion,
} from './utils.ts';
import { Command, MemorySaver, MessagesAnnotation } from '@langchain/langgraph';
import { StateGraph, START } from '@langchain/langgraph';
import colors from '@colors/colors';
import * as fs from 'node:fs';
import { AudioManager, audioToText, generateSpeech } from './audio.ts';
import type { Agent, Agency } from './types.ts';
import { getWorkflowTools, getAgentTools } from './types.ts';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { convertToOpenAITool } from '@langchain/core/utils/function_calling';
import type { StructuredToolInterface } from '@langchain/core/dist/tools';
import { callModel } from './callModel.ts';
import { saveOutput } from './helpers.ts';
import slugify from 'slugify';

export const runAgency = async (workflowDefinition: Agency) => {
  let outputLog: string = '';

  // 1 - Setup agency - stateGraph
  const workflow = new StateGraph(MessagesAnnotation);

  const workflowAgents: Agent[] = [
    ...workflowDefinition.agents,
    { id: 'endWorkflow', name: 'Finaliza todo o processo' },
  ];

  if (
    workflowDefinition.allowUserInput ||
    workflowDefinition.agents.find((a) => a.allowUserInput)
  )
    workflowAgents.push({ id: 'userInput', name: 'Humano' });

  for (const agent of workflowAgents) {
    workflow.addNode(agent.id, actionNode, {
      ends: workflowAgents.filter((a) => a.id != agent.id).map((a) => a.id),
    });
  }

  // console.log('workflowAgents', workflowAgents);

  const allWorkflowTools = getWorkflowTools(workflowDefinition);
  // console.log('allWorkflowTools', allWorkflowTools);
  const toolNode = allWorkflowTools ? new ToolNode(allWorkflowTools) : null;
  // console.log('toolNode', toolNode);
  // if (toolNode) workflow.addNode('tools', toolNode, { ends: ['endWorkflow'] });

  // workflow.addEdge('mac-technician', 'tools');
  // workflow.addConditionalEdges('mac-technician', shouldContinue);

  workflow.addEdge(START, workflowAgents[0].id);

  const checkpointer = new MemorySaver();
  const graph = workflow.compile({ checkpointer });

  const logFileName =
    './logs/' + Date.now() + '-' + slugify(workflowDefinition.title) + '.txt';

  function findAgent(agentId: any) {
    return workflowAgents.find((a) => a.id == agentId) as Agent;
  }

  async function callLlm(
    agent: Agent,
    state: typeof MessagesAnnotation.State,
    targetAgentNodes: string[],
    tools?: StructuredToolInterface[],
  ) {
    try {
      // @todo criar o schema com os targetAgentNodes

      // console.log('🛜 callLlm');
      // console.log('🛜 messages', summarizeMessages(state.messages));
      // console.log('🛜 state messages', convertToOpenAiMessages(state.messages));
      // console.log('🛜 messages', state.messages);
      // console.log(state.messages);
      //
      const openAiTools =
        tools && tools?.length > 0
          ? tools.map((tool: StructuredToolInterface) =>
              convertToOpenAITool(tool, {
                strict: true,
              }),
            )
          : null;
      // if (openAiTools) {
      //   console.log('🛜 openAiTools');
      //   console.dir(openAiTools, { depth: null });
      // }

      const model = agent.model || workflowDefinition.model || 'gpt-4o-mini';

      const llmResult = await callModel(
        agent.id,
        convertToOpenAiMessages(state.messages),
        targetAgentNodes,
        model,
        toolNode,
        openAiTools,
      );
      // console.log('🛜 llmResult ', llmResult);

      return llmResult;
    } catch (error: any) {
      console.error('🛜🚨 callLlm error');
      console.error(error);
    }
  }
  //
  // // Função para chamar a OpenAI diretamente
  // async function callOpenAI(
  //   currentAgentId: string,
  //   messages: any[],
  //   targetAgentNodes: string[],
  //   model?: string,
  //   tools?: any[],
  // ) {
  //   try {
  //     const clientOptions: ClientOptions = {
  //       apiKey: process.env.OPENAI_API_KEY,
  //     };
  //     let openai = null;
  //     if (model?.includes('gpt')) {
  //       clientOptions.apiKey = process.env.OPENAI_API_KEY;
  //       openai = new OpenAi(clientOptions);
  //     }
  //     // if (model?.includes('claude')) {
  //     //   clientOptions.apiKey = process.env.ANTHROPIC_API_KEY;
  //     //   clientOptions.baseURL = 'https://api.anthropic.com/v1/completions';
  //     //   openai =
  //     // }
  //
  //     const validTargetAgentNodes =
  //       targetAgentNodes.length > 0 ? targetAgentNodes : ['endWorkflow'];
  //     // console.log(validTargetAgentNodes);
  //
  //     const responseSchema = z.object({
  //       response: z
  //         .string()
  //         .describe(
  //           'A human readable response to the original question. Does not need to be a final response.',
  //         ),
  //       goto: z
  //         .enum(validTargetAgentNodes as [string, ...string[]])
  //         .describe(
  //           "The next agent to call, or 'endWorkflow' if the user's query has been resolved.",
  //         ),
  //     });
  //
  //     // console.log('openai tools');
  //     // console.dir(tools ? tools : false, { depth: null });
  //     // if tools calls
  //
  //     let firstCall = true;
  //     let hasToolCalls = false;
  //     let completion;
  //     let toolsCalled = false;
  //     let result;
  //
  //     let options = {
  //       model,
  //       messages: messages.map((msg) => ({
  //         role: msg.role,
  //         content: msg.content,
  //       })),
  //       response_format: zodResponseFormat(responseSchema, 'parsed_response'),
  //       tools: tools,
  //     };
  //
  //     while (firstCall || hasToolCalls) {
  //       console.log('🛜 Chamando OpenAI....');
  //       completion = await openai.beta.chat.completions.parse(options);
  //       // console.log('🛜 done');
  //       // console.log(
  //       //   '🛜 OpenAI completion message:',
  //       //   completion.choices[0].message,
  //       // );
  //       // debugOAI('completion', completion);
  //
  //       hasToolCalls = completion.choices[0].message.tool_calls?.length > 0;
  //
  //       if (hasToolCalls) {
  //         // console.log('Executando...');
  //         toolsCalled = true;
  //         const toolCalls = completion.choices[0].message.tool_calls;
  //         // console.log('toolCalls', toolCalls);
  //         for (let toolCall of toolCalls) {
  //           // console.log(
  //           //   'toolCall:',
  //           //   toolCall!.function.name,
  //           //   toolCall!.function.arguments,
  //           // );
  //           // find the tool
  //           const callToolNode = toolNode.tools.find(
  //             (t) => t.name === toolCall!.function.name,
  //           );
  //           if (!callToolNode)
  //             throw new Error('Tool not found:' + toolCall!.function.name);
  //           try {
  //             const rr = await callToolNode.invoke(
  //               JSON.parse(toolCall!.function.arguments),
  //             );
  //             const rest = {
  //               role: 'function',
  //               name: toolCall!.function.name,
  //               content: JSON.stringify(rr),
  //               // tool_call_id: toolCall.id,
  //             };
  //             // debugOAI('⏩⏩👉 rest', rest);
  //             messages.push({ ...rest, functionCall: toolCall });
  //           } catch (error: any) {
  //             console.log(
  //               '🚨 Error calling tool:',
  //               toolCall!.function.name,
  //               toolCall!.function.arguments,
  //             );
  //             console.error(error);
  //             process.exit(1);
  //           }
  //         }
  //         options.tools = undefined;
  //         // Run completions again
  //         // @todo add to state
  //         options.messages = messages;
  //       } else {
  //         result = completion.choices[0].message.parsed;
  //         hasToolCalls = false;
  //       }
  //
  //       firstCall = false;
  //     }
  //
  //     if (result && toolsCalled) result.goto = currentAgentId;
  //
  //     return result;
  //   } catch (e) {
  //     console.log('🚨 Error calling OpenAI:');
  //     console.error(e);
  //     throw e;
  //   }
  // }

  async function userInputNode(
    state: typeof MessagesAnnotation.State,
  ): Promise<Command> {
    // console.log('👉 👉 userInputNode');

    let activeAgent: string | undefined = undefined;
    for (let i = state.messages.length - 1; i >= 0; i--) {
      if (state.messages[i].name) {
        activeAgent = state.messages[i].name;
        break;
      }
    }
    if (!activeAgent) throw new Error('Could not determine the active agent.');

    // return new Command({
    //   goto: activeAgent,
    //   update: {
    //     messages: [
    //       {
    //         role: 'user',
    //         content: 'liste os arquvios da pasta atual',
    //       },
    //     ],
    //   },
    // });

    let userInput: string = '';
    if (workflowDefinition.useAudio) {
      console.log('🛑 Te gravando...');
      const fileName = './tmp/' + Date.now() + '-recording.mp3';
      const audioManager = new AudioManager();
      await audioManager.recordAudio(fileName);
      // console.log('Recorded audio saved at:', fileName);
      userInput = await audioToText(fileName);
    } else {
      userInput = await rlQuestion('Você: ');
    }

    outputLog += 'Usuário: ' + userInput + '\n';

    return new Command({
      goto: activeAgent,
      update: {
        messages: [
          {
            role: 'user',
            content: userInput,
          },
        ],
      },
    });
  }

  async function actionNode(
    state: typeof MessagesAnnotation.State,
    params: any,
  ) {
    const agentId = params.metadata.langgraph_node;
    // console.log('👉 👉 actionNode', agentId);

    if (state.messages.length === 0) {
      const initialSystemPrompt = `${workflowDefinition.baseSystemPrompt}
      
      O usuário é quem deve responder toda e qualquer pergunta. Quando quiser perguntar ao usuário use 'userInput'.
      
      Cada agente realiza uma tarefa. Importante, não confundir os agentes com as tools.
      
      Agentes disponíveis (incluir por 'goto'):
      ${workflowDefinition.agents.map((a) => `- ${a.id} (${a.name}): ${a.shortDescription}`).join('\r\n')}
      
      Para incluir ivocar um agente retorne em 'goto' o id do agente. 
      
      Importante: O usuário está no terminal, então não retorne markdown, pode retornar o conteúdo indentado quando necessário, mas sem markdown.
      
      Quando toda a interação terminar e o objetivo tiver sido alcançado, chame o agente 'endWorkflow'.
      
      Agora são ${new Date().toLocaleString()}
      
      Retorne no formato JSON especificado.
      `;
      // console.log('🛜 initialSystemPrompt', initialSystemPrompt);
      state.messages.push({
        role: 'system',
        content: initialSystemPrompt,
      });
    }

    if (agentId === 'userInput') return userInputNode(state);
    if (agentId === 'endWorkflow') {
      // @todo move to somewhere else
      const newFileName =
        `./results/` +
        Date.now() +
        '-' +
        slugify(workflowDefinition.title) +
        '-content.txt';
      fs.renameSync(logFileName, newFileName);
      // console.log('Toda a conversa foi salva em ' + newFileName);
      console.log('');
      console.log('🎉🎉 Atividades concluídas! 🎉🎉');
      process.exit();
    }

    const agent: Agent = findAgent(agentId);
    if (!agent)
      throw new Error('Could not determine the active agent. id: ' + agentId);

    console.log(`🧠 ${agent.name} pensando...`);

    const agentFullPrompt = `# ${agent.id} - ${agent.name} \r\n ${agent.fullPrompt}`;
    if (!state.messages.find((m) => m.content === agentFullPrompt))
      state.messages.push({ role: 'system', content: agentFullPrompt });

    const targetAgentNodes = getAgentTargetNodes(
      workflowDefinition,
      workflowAgents,
      agent,
    );
    // console.log(
    //   '👀  targetAgentNodes',
    //   targetAgentNodes,
    //   'agentTools',
    //   agentTools,
    // );
    const agentTools = getAgentTools(workflowDefinition, agent);
    // console.log('👀 agentTools', agentTools);
    const response = await callLlm(agent, state, targetAgentNodes, agentTools);
    // console.log('👉  callLlm response', response);
    saveOutput(logFileName, `${agent.name}: ${response.response}`);

    if (workflowDefinition.useAudio) {
      const audioFile = await generateSpeech(response.response);
      console.log(`🗣️ ${agent.name} falando...`);
      await AudioManager.playAudio(audioFile);
    } else {
      console.log(colors.blue(`🧑‍💻${agent.name}: ${response.response}`));
    }

    // // summarizeMessage(response);
    const aiMsg = {
      role: 'assistant',
      content: `${agent.name}: ${response.response}`,
      name: agent.id,
    };

    let goto = response.goto;
    if (!goto) {
      console.log('🚨 !goto - response:', response);
    }
    if (goto !== agent.id && goto != 'userInput' && goto != 'endWorkflow') {
      console.log('');
      console.log('👉 Passando para o agente', findAgent(goto).name);
    }

    return new Command({ goto, update: { messages: [aiMsg] } });
  }

  // 4. Rodamos o loop no Grafo
  async function main() {
    let state = { messages: [] };
    while (true) {
      await graph.invoke(state, {
        configurable: { thread_id: '42' },
        recursionLimit: 40,
      });
    }
  }

  main().then(() => {
    console.log('Encerrando...');
    process.exit(0);
  });
};
