import fs from "fs";
import readline from "readline";
import { spawn } from "child_process";

const agenciesDir = "./agencies";

// Main
const files = listFiles();
if (files.length === 0) {
    console.error("Nenhum arquivo encontrado na pasta agencies.");
    process.exit(1);
}

askUser(files);

// Pergunta ao usuário qual arquivo ele deseja executar
function askUser(files: string[]) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log("Available Agencies:");
    console.log("");
    files.forEach((file, index) => console.log(`${index + 1}. ${file.replace('.ts', '')}`));
    console.log("");

    rl.question("Escolha um arquivo pelo número: ", answer => {
        const index = parseInt(answer, 10) - 1;

        if (isNaN(index) || index < 0 || index >= files.length) {
            console.error("Escolha inválida!");
            rl.close();
            process.exit(1);
        }

        const chosenFile = files[index];
        rl.close();
        runFile(chosenFile);
    });
}

// Executa o arquivo escolhido com Node.js
function runFile(file: string) {
    const command = "node";
    const args = [
        "--env-file=.env",
        "--experimental-strip-types",
        `${agenciesDir}/${file}`,
    ];
    console.log(`Iniciando ${file.replace('.ts', '')}...`);

    const child = spawn(command, args, {
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
        stdio: "inherit", // Permite passar a saída diretamente para o terminal
    });

    child.on("close", code => {
        console.log(`Processo finalizado com código ${code}`);
    });

    child.on("error", error => {
        console.error(`Erro ao executar o arquivo: ${error.message}`);
    });
}


function listFiles(): string[] {
    try {
        return fs.readdirSync(agenciesDir).filter(file => file.endsWith(".ts"));
    } catch (error) {
        console.error("Erro ao listar arquivos:", error);
        process.exit(1);
    }
}

