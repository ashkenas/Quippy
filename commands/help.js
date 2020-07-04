/*****************************************************************************
 * Copyright (C) 2020 Jacob Ashkenas
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
const { prefix } = require('../config.json');

module.exports = {
    name: "help",
    aliases: ["h"],
    description: "List available commands. Provide a command name for more information.",
    syntax: "[optional:command]",
    execute(msg, args) {
        if(!args.length) {
            const description = ["The following commands are available at this time:"];
            description.push(msg.client.commands.map(command => ` • ${command.name}`).join('\n'));
            description.push("Get more info about a command with:```" + `${prefix + this.name} [command name]` + "```");

            msg.channel.send({
                embed: {
                    title: "Commands",
                    description: description.join('\n'),
                    color: 16751158
                }
            });
        } else {
            const command = msg.client.commands.get(args[0].toLowerCase()) || msg.client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(args[0].toLowerCase()));

            if(command) {
                const embed = {
                    title: command.name,
                    description: command.description,
                    fields: [
                        {
                            name: "Syntax",
                            value: "```" + prefix + command.name + (command.syntax ? ` ${command.syntax}` : '') + "```"
                        }
                    ],
                    color: 16751158
                };
                if(command.aliases) {
                    embed.fields.unshift({
                            name: `Aliases${command.aliases.length > 1 ? "es" : ""}`,
                            value: `\`${command.aliases.join("`, `")}\``
                    });
                }
                if(command.guildOnly) {
                    embed.footer = {text: "Guild-only"};
                }
    
                msg.channel.send({embed: embed});
            } else {
                msg.reply("that command doesn't exist!");
            }
        }
    }
}