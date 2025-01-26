import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';
import colors from '@colors/colors';

export const shellExecute = tool(
  async ({ command, needsRootAccess }) => {
    console.log(colors.cyan('⌨️ Executando comando no terminal'));
    //, command, needsRootAccess);

    if (needsRootAccess) command = `echo "<password>" | sudo -S ${command}`;
    const timeout = 30 * 1000; // 30 segundos
    try {
      // Executa o comando usando a função baseada em Promise
      const { stdout, stderr, error } = await execCommand(command, timeout);

      if (error) {
        if (error.message.includes('timed out')) {
          console.error('Command timed out:', command);
          return `Execution timeout exceeded`;
        }
        console.error('Error executing shell command:', error);
        return stderr.trim(); // Retorna apenas o erro
      }

      return stdout.trim(); // Retorna apenas o resultado
    } catch (error: any) {
      console.error('Error executing shell command:', error);
      return error.message || 'Unknown error';
    }
  },
  {
    name: 'shellExec',
    description: 'Executa um comando no shell/terminal do mac',
    schema: z.object({
      command: z.string().describe('Comando a ser executado'),
      needsRootAccess: z
        .boolean()
        .describe('Se é preciso executar com sudo')
        .optional(),
    }),
  },
);

function execCommand(
  command: string,
  timeout: number,
): Promise<{ stdout: string; stderr: string; error?: Error }> {
  return new Promise((resolve) => {
    const child = exec(command, { timeout }, (error, stdout, stderr) => {
      if (error) {
        return resolve({ stdout, stderr, error });
      }
      resolve({ stdout, stderr });
    });

    child.on('error', (error) => {
      resolve({
        stdout: '',
        stderr: `Command execution failed: ${error.message}`,
        error,
      });
    });
  });
}
