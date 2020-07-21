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
const Game = require('../game.js');
const { defaultPack } = require('../config.json');

module.exports = {
    name: "create",
    aliases: ["c"],
    description: "Create a new game. Attach a custom pack to use it.",
    syntax: "[optional:pack]",
    guildOnly: true,
    botPerms: 268725328,
    execute(msg, args) {
        if(args.length && args[0] !== "default" && msg.client.packs.has(args[0])) {
            new Game(msg.channel, msg.author, this.client.packs.get(args[0]), msg.client.game++);
        } else if(msg.attachments.size && msg.attachments.first().url.endsWith(".json")) {
            fetch(msg.attachments.first().url).then((res) => res.json()).then((json) => {
                const errors = [];
                if(!json.name) {
                    errors.push("That pack is missing a name!");
                }
                if(!json.description) {
                    errors.push("That pack is missing a description!");
                }
                if(!json.prompts || !json.prompts.length) {
                    errors.push("That pack is missing prompts!");
                }

                if(!errors.length) {
                    new Game(msg.channel, msg.author, json, msg.client.game++);
                } else {
                    msg.channel.send(errors.join("\n"));
                }
            });
        } else {
            new Game(msg.channel, msg.author, this.client.packs.get(defaultPack), msg.client.game++);
        }
    }
}
