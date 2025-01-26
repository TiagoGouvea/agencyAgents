# AgencyAgents

This repository was made as a study of LangGraph, and trying to create a simpler layer above it, to make it easy to create a Agency with some Agents and Tools, and spend more time on prompts and instructions than in code. 

# How to run
```
nvm use
yarn install
yarn start
```

# Samples
## BlogPostGenerationTeam
A simple team with agents to generate a lot of blog posts.
Each agent has a different role with specific instructions to follow.
The main agent will interact with the user (`allowUserInput: true`)

## DailyAiNews
A team that use tools (`webSearcher`, `webScrap`, `writeMarkdown`) to search on the web to create his daily news, without interacting with the user.
The subjects are hardcoded (simulating an automated process).

# How to create an agency
- Take a look into some of the agencies files in `/agencies` folder
- Duplicate (or create a new file) with the same structure
- Execute it!

# Providing Tools
You can provide tools to the agents by putting them in the `agent.tools` array.

Available tools:
- `webSearch` - Search on Google
- `webScrap` - Scrap content from a web page
- `writeMarkdown` - Save content to a Markdown file
- `shellExecute` - Execute commands on computer terminal

To create new tools, just follow the structure of the `writeMarkdown` (the simpler one). A good source of tools is [LangChain tools](https://js.langchain.com/docs/integrations/tools/)

# Todo
## Agency
- [ ] List agencies with Title
- [ ] Use some lib to select the agency
- [ ] Log the conversation better, showing actions and tools
- [ ] Add npm/debug to make it easy to debug 
## Tools
### webScrap
- [ ] Allow to use other models on `simplifyContent`

# Caveats
- When an agent has a tool, it often uses it before needed