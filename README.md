# Table of Contents
- [About](#about)
- [Get Quippy](#get-quippy)
- [Commands](#commands)
- [Providing Prompts](#providing-prompts)
- [Help](#help)
# About
Quippy is an attempt at re-envisioning [Jackbox Games](https://www.jackboxgames.com/)'s *Quiplash* series as a [Discord](https://discord.com/) bot.  Using expressive embedded messages and a reaction-based voting system, Quippy allows players to game from the comfort of their favorite chatting platform.
# Get Quippy
You can add Quippy to the guild of your choice [here](https://discord.com/api/oauth2/authorize?client_id=728076304271802439&permissions=268725328&scope=bot), or you can host a copy yourself.
### Self-hosting
If you choose to host the bot yourself, you'll need a [Node.js](https://nodejs.org/en/) environment of at least version `12.0.0`.  This repository doesn't include any prompts so, you will need to provide your own.  For more information on making prompts, check out [Providing Prompts](#providing-prompts). For more information on creating a Discord bot, check out [this guide](https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token). You'll want to use `268725328` as your permissions integer.
# Commands
The following table details the commands available to users. These commands can be executed using the syntax `<prefix><command> <arguments>`, where `prefix` has been set in `config.json`. Commands are *not* case sensitive.
Name|Alias(es)|Arguments*|Description
----|---------|-------|-----------
Help|h|[command name]|Lists all commands, or provides additional information about one when optionally specified.
Statistics|stats||Lists stats about the bot.
Packs||[pack name]|Lists all loaded packs, or provides additional information about one when optionally specified.
Rules|||DMs the triggering user instructions on how to play the game.
Create|c|[pack name]|Creates a new instance of the game. If no pack is specified, the default (set in the config) will be used.
Clean|||Deletes any channels the bot created that are no longer linked to a game (these usually result from a mid-game crash).

\*Arguments surrounded in brackets (`[]`) are optional.
# Providing Prompts
Prompts are supplied as a `JSON` file referred to as a "pack".  Packs can be made available to the bot by placing them in a folder named `prompts`, located at the project root. Packs use the following structure:
```json
{
    "name": "",
    "desciption": "",
    "prompts": []
}
```
Key|Type|Expected Value
---|----|-----
name|string|A single, user-typeable word.  This will be used for pack selection.
description|string|A brief description of the pack. Limited to 2048 characters. Supports Discord markdown.
prompts|string[]|Each prompt in the pack, provided as separate string elements. Supports Discord markdown. Default blanks can be inserted using `<BLANK>`.

When creating your own prompts, keep [these tips](https://www.jackboxgames.com/the-science-of-creating-a-quiplash-prompt/) in mind.
# Help
Please open an issue if you've found any bugs or have suggestions for the bot.