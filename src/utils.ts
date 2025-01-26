import * as readline from 'node:readline';
import colors from '@colors/colors';
import * as path from 'node:path';
import type { Agent, Agency } from './types.ts';
import { zodResponseFormat } from 'openai/helpers/zod';

export function rlQuestion(pergunta: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(colors.green(pergunta), (resposta) => {
      rl.close();
      resolve(resposta);
    });
  });
}

export function summarizeMessage(msg: any) {
  // Determina se é Human, AI ou Tool
  let messageType = 'Unknown';

  // Algumas implementações de mensagens têm um método interno _getType()
  if (typeof msg._getType === 'function') {
    const internalType = msg._getType();
    if (internalType === 'human') {
      messageType = 'HumanMessage';
    } else if (internalType === 'ai') {
      messageType = 'AIMessage';
    } else if (internalType === 'function') {
      messageType = 'ToolMessage';
    }
  }

  // Extração do role (podendo ser 'user', 'assistant' etc.)
  const role = msg.role ?? 'unknown';

  // Se houver chamadas de ferramenta, mapeia cada uma (nome e args)
  let toolCalls;
  if (
    msg.additional_kwargs &&
    Array.isArray(msg.additional_kwargs.tool_calls)
  ) {
    toolCalls = msg.additional_kwargs.tool_calls.map((tc) => ({
      function: tc.name,
      arguments: tc.args,
    }));
  }

  return {
    type: messageType,
    role,
    content: msg.content,
    ...(toolCalls ? { toolCalls } : {}), // só inclui se existir
  };
}

export function summarizeMessages(messages: any[]) {
  console.log('Messages length', messages.length);
  return messages.map((msg) => summarizeMessage(msg));
}

export async function loadModule(modulePath: string) {
  const __dirname = path.resolve();

  const imported = await import(path.join(__dirname, modulePath));
  return imported;
}

type Message = {
  role: 'assistant' | 'system' | 'user';
  content: string;
};

export function convertToOpenAiMessages(messages: any): Message[] {
  return messages.map((message: any) => {
    let role: 'assistant' | 'system' | 'user';

    if (typeof message._getType === 'function') {
      const internalType = message._getType();
      if (internalType == 'SystemMessage' || internalType == 'system') {
        role = 'system';
      } else if (internalType == 'HumanMessage' || internalType == 'human') {
        role = 'user';
      } else if (internalType == 'AIMessage' || internalType == 'ai') {
        role = 'assistant';
      } else {
        throw new Error(`Unknown message type: ${JSON.stringify(message)}`);
      }
    } else {
      role = message.role;
    }

    return {
      role,
      content: message.content.trim(),
    };
  });
}

export function getAgentTargetNodes(
  workflowDefinition: Agency,
  workflowAgents: Agent[],
  agent: Agent,
) {
  let targetAgentNodes = workflowAgents.map((a) => a.id);
  if (!agent.allowEndWorkflow)
    targetAgentNodes = targetAgentNodes.filter((a) => a != 'endWorkflow');
  if (!workflowDefinition.allowUserInput && !agent.allowUserInput)
    targetAgentNodes = targetAgentNodes.filter((a) => a != 'userInput');
  return targetAgentNodes;
}
