import type { StructuredToolInterface } from '@langchain/core/tools';
import type { RunnableToolLike } from '@langchain/core/runnables';

export type Agency = {
  title: string;
  baseSystemPrompt: string;
  allowUserInput?: boolean;
  agents: Agent[];
  tools?: (StructuredToolInterface | RunnableToolLike)[];
  model?: string;
};

export type Agent = {
  id: string;
  name: string;
  shortDescription?: string;
  fullPrompt?: string;
  allowEndWorkflow?: boolean;
  allowUserInput?: boolean;
  model?: string;
  tools?: (StructuredToolInterface | RunnableToolLike)[];
};

export function getAgentTools(
  workflow: Agency,
  agent: Agent,
): (StructuredToolInterface | RunnableToolLike)[] | null {
  const tools = workflow.tools || [];
  if (agent.tools) tools.push(...agent.tools);
  if (tools.length === 0) return null;
  return tools;
}

export function getWorkflowTools(
  workflow: Agency,
): (StructuredToolInterface | RunnableToolLike)[] | null {
  const tools = workflow.agents.reduce((acc: any[], agent: any) => {
    if (agent.tools) {
      acc.push(...agent.tools);
    }
    return acc;
  }, workflow.tools || []);
  if (tools.length === 0) return null;
  return tools;
}
