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
const fetch = require('node-fetch');
const { prefix } = require('../config.json');

module.exports = {
    name: "packs",
    description: "List available builtin prompt packs. Provide a pack name or attach a custom pack for more information.",
    syntax: "[optional:pack]",
    execute(msg, args) {
        if(!args.length && !msg.attachments.size) {
            const description = ["The following prompt packs are available at this time:"];
            description.push(msg.client.packs.map(pack => ` • ${pack.name}`).join('\n'));
            description.push('Get more info about a pack by attaching it or with:```' + `${prefix + this.name} [pack name]` + '```');
            description.push('Create a custom pack [here](https://quippybot.ml/).');

            msg.channel.send({
                embed: {
                    title: "Prompt Packs",
                    description: description.join('\n'),
                    color: 16751158
                }
            });
        } else if(args.length && msg.client.packs.has(args[0].toLowerCase())) {
            const pack = msg.client.packs.get(args[0].toLowerCase());
            msg.channel.send({
                embed: {
                    title: pack.name,
                    description: pack.description,
                    footer: {
                        text: `${pack.prompts.length} prompts`
                    },
                    color: 16751158
                }
            });
        } else if(msg.attachments.size && msg.attachments.first()) {
            fetch(msg.attachments.first().url).then((res) => res.json()).then((json) => {
                msg.channel.send({
                    embed: {
                        title: json.name || "<Missing Name>",
                        description: json.description || "<Missing Description>",
                        footer: {
                            text: `${json.prompts ? json.prompts.length : 0} prompts`
                        },
                        color: 16751158
                    }
                });
            });
        } else {
            msg.reply("that pack doesn't exist!");
        }
    }
}
