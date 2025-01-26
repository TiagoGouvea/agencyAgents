// Função para instanciar o modelo com base no nome do modelo
import { z } from 'zod';

export function getAnthropicMessages(messages: any[]) {
  const returnMessages = messages
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))
    .filter((m) => m.role !== 'system');
  if (returnMessages.length == 0)
    returnMessages.push({ role: 'user', content: 'Iniciar' });
  if (returnMessages[returnMessages.length - 1].role !== 'user')
    returnMessages[returnMessages.length - 1].role = 'user';
  return returnMessages;
}

export function getAnthropicSystem(messages: any[], responseSchema: string) {
  return `${messages
    .filter((m) => m.role === 'system')
    .map((msg) => msg.content)
    .join('\n\n')}\r\n\
      Retorne no formato JSON especificado:
      ${responseSchema}
    `;
}

export function getAnthropicTools(tools: any[]): any[] {
  return tools.map((tool) => {
    tool.input_schema = tool.parameters;
    delete tool.parameters;
    return tool;
  });
}

export function getResponseSchema(validTargetAgentNodes: string[]) {
  // JSON.stringify(
  //     zodResponseFormat(
  return z.object({
    response: z
      .string()
      .describe(
        'A human readable response to the original question. Does not need to be a final response.',
      ),
    goto: z
      .enum(validTargetAgentNodes as [string, ...string[]])
      .describe(
        "The next agent to call, or 'endWorkflow' if the user's query has been resolved.",
      ),
  });
}
