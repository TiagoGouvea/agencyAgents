import ClientOptions from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  getAnthropicMessages,
  getAnthropicSystem,
  getAnthropicTools,
  getResponseSchema,
} from './modelAnthropic.ts';
import { jsonrepair } from 'jsonrepair';
import OpenAi from 'openai';
// import { parseChatCompletion } from 'openai/src/lib/parser.ts';
import { parseChatCompletion } from 'openai/lib/parser';

export async function callModel(
  currentAgentId: string,
  messages: any[],
  targetAgentNodes: string[],
  modelName: string,
  toolNode: any,
  tools?: any[],
) {
  if (modelName.startsWith('gpt'))
    return callOpenAI(
      currentAgentId,
      messages,
      targetAgentNodes,
      modelName,
      toolNode,
      tools,
    );
  else if (modelName.startsWith('claude'))
    return callAnthropic(
      currentAgentId,
      messages,
      targetAgentNodes,
      modelName,
      toolNode,
      tools,
    );
}

async function callOpenAI(
  currentAgentId: string,
  messages: any[],
  targetAgentNodes: string[],
  modelName: string,
  toolNode: any,
  tools?: any[],
) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');

  try {
    const clientOptions: ClientOptions = {
      apiKey: process.env.OPENAI_API_KEY,
    };
    clientOptions.apiKey = process.env.OPENAI_API_KEY;
    const openai = new OpenAi(clientOptions);
    // if (model?.includes('claude')) {
    //   clientOptions.apiKey = process.env.ANTHROPIC_API_KEY;
    //   clientOptions.baseURL = 'https://api.anthropic.com/v1/completions';
    //   openai =
    // }

    const validTargetAgentNodes =
      targetAgentNodes.length > 0 ? targetAgentNodes : ['endWorkflow'];
    // console.log(validTargetAgentNodes);

    const responseSchema = getResponseSchema(validTargetAgentNodes);
    // console.log('responseSchema', responseSchema);
    // console.log(
    //   'response_format',
    //   zodResponseFormat(responseSchema, 'parsed_response'),
    // );

    // console.log('openai tools');
    // console.dir(tools ? tools : false, { depth: null });
    // if tools calls

    let firstCall = true;
    let hasToolCalls = false;
    let completion;
    let toolsCalled = false;
    let result;

    let options = {
      model: modelName,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      response_format: zodResponseFormat(responseSchema, 'parsed_response'),
      tools: tools,
    };

    while (firstCall || hasToolCalls) {
      // console.log(
      //   '🛜 Pensando ',
      //   tools?.length ? 'com ferramentas' : 'sem ferramentas',
      //   '...',
      // );
      // completion = await openai.beta.chat.completions.parse(options);
      completion = await openai.chat.completions.create(options);
      try {
        completion = parseChatCompletion(completion, options);
      } catch (error) {
        console.error('🚨 Error parsing completion:', error.split('\n')[0]);
        // console.log('completion:');
        // console.dir(completion.choices[0].message.content, { depth: null });

        function extractFirstJsonObject(input: string) {
          const startIndex = input.indexOf('{');
          const endIndex = input.indexOf('}', startIndex);
          if (startIndex !== -1 && endIndex !== -1)
            return input.substring(startIndex, endIndex + 1);
          return null;
        }

        const fixedContent = extractFirstJsonObject(
          jsonrepair(completion.choices[0].message.content),
        );
        console.log('(try) fix completion content:', fixedContent);
        completion.choices[0].message.content = fixedContent;
        completion = parseChatCompletion(completion, options);
      }
      // parseChatCompletion(a);
      // console.log(
      //   '🛜 OpenAI completion message:',
      //   completion.choices[0].message,
      // );
      // debugOAI('completion', completion);

      hasToolCalls = completion.choices[0].message.tool_calls?.length > 0;

      if (hasToolCalls) {
        // console.log('🛜 hasToolCalls...');
        if (!tools || !tools.length) throw new Error('No tools found');

        toolsCalled = true;
        const toolCalls = completion.choices[0].message.tool_calls;
        // console.log('🛜 toolCall', toolCalls[0]);
        for (let toolCall of toolCalls) {
          // Check if it's calling a agent as a tool (wrong way)
          if (!tools.find((t) => t.function.name === toolCall!.function.name)) {
            const rest = {
              role: 'function',
              name: toolCall!.function.name,
              content:
                toolCall!.function.name +
                ' não é uma tool válida (não confundir agentes com tools)',
            };
            messages.push({ ...rest, functionCall: toolCall });
            console.log('Wrong tool call: ' + toolCall!.function.name);
            console.log('tools');
            console.dir(tools, { depth: null });
            continue;
          } else {
            // console.log(
            //   '🛜 toolCall:',
            //   toolCall!.function.name,
            //   toolCall!.function.arguments,
            // );
            // find the tool
            const callToolNode = toolNode.tools.find(
              (t) => t.name === toolCall!.function.name,
            );
            if (!callToolNode)
              throw new Error('Tool not found:' + toolCall!.function.name);
            try {
              const rr = await callToolNode.invoke(
                toolCall!.function.parsed_arguments,
              );
              const rest = {
                role: 'function',
                name: toolCall!.function.name,
                content: JSON.stringify(rr),
                // tool_call_id: toolCall.id,
              };
              // debugOAI('⏩⏩👉 rest', rest);
              messages.push({ ...rest, functionCall: toolCall });
            } catch (error: any) {
              console.log(
                '🚨 Error calling tool:',
                toolCall!.function.name,
                'args: ',
                toolCall!.function.arguments,
              );
              console.error(error);
              process.exit(1);
            }
          }
        }
        options.tools = undefined;
        // Run completions again
        // @todo add to state
        options.messages = messages;
      } else {
        result = completion.choices[0].message.parsed;
        hasToolCalls = false;
      }

      firstCall = false;
    }

    if (result && toolsCalled) result.goto = currentAgentId;

    return result;
  } catch (e) {
    console.log('🚨 Error calling OpenAI:');
    console.error(e);
    throw e;
  }
}

async function callAnthropic(
  currentAgentId: string,
  messages: any[],
  targetAgentNodes: string[],
  modelName: string,
  toolNode: any,
  tools?: any[],
) {
  if (!process.env.ANTHROPIC_API_KEY)
    throw new Error('ANTHROPIC_API_KEY is not set');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const validTargetAgentNodes =
    targetAgentNodes.length > 0 ? targetAgentNodes : ['endWorkflow'];
  // console.log(validTargetAgentNodes);

  let firstCall = true;
  let hasToolCalls = false;
  let completion;
  let toolsCalled = false;
  let result;

  try {
    const responseSchema = getResponseSchema(validTargetAgentNodes);
    const system = getAnthropicSystem(messages, responseSchema);
    const claudeMessages = getAnthropicMessages(messages);
    let claudeTools = tools ? getAnthropicTools(tools) : [];
    // console.log('responseSchema', responseSchema);
    // console.log('system', system);
    // console.log('claudeMessages', claudeMessages);

    while (firstCall || hasToolCalls) {
      console.log('🛜 Chamando Anthropic....');
      completion = await client.messages.create({
        system,
        messages: claudeMessages,
        model: modelName,
        max_tokens: 5000,
        tools: claudeTools,
      });

      // console.log('🛜 Anthropic completion:', completion);
      // debugOAI('completion', completion);

      hasToolCalls = completion.content.some((c) => c.type == 'tool_use');

      if (hasToolCalls) {
        // console.log('Executando...');
        toolsCalled = true;
        const toolCalls = completion.content.filter(
          (c) => c.type == 'tool_use',
        );
        // console.log('toolCalls', toolCalls);
        for (let toolCall of toolCalls) {
          // console.log('toolCall:', toolCall!.name, toolCall!.input);
          // find the tool
          const callToolNode = toolNode.tools.find(
            (t) => t.name === toolCall!.name,
          );
          if (!callToolNode)
            throw new Error('Tool not found:' + toolCall!.name);
          try {
            const rr = await callToolNode.invoke(toolCall!.input);
            const rest = {
              role: 'user',
              content:
                'resultado de ' +
                toolCall!.name +
                ' com parametros ' +
                toolCall!.input +
                '\r\n\r\n' +
                JSON.stringify(rr),
            };
            claudeMessages.push(rest);
          } catch (error: any) {
            console.log('🚨 Error calling tool:', toolCall);
            console.error(error);
            process.exit(1);
          }
        }
        claudeTools = [];
        // Run completions again
        // @todo add to state
      } else {
        if (completion.content[0].text.startsWith('{')) {
          result = JSON.parse(jsonrepair(completion.content[0].text));
        } else {
          console.log('Not json returned');
          result = {
            response: completion.content[0].text,
            goto: currentAgentId,
          };
        }
        hasToolCalls = false;
      }

      firstCall = false;
    }

    if (result && toolsCalled) result.goto = currentAgentId;

    return result;
  } catch (e) {
    console.log('🚨 Error calling anthropic:');
    console.log('completion', completion);
    console.error(e);
    throw e;
  }
}
