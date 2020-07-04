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
const Discord = require('discord.js');
const { categoryPrefix } = require('../config.json');

module.exports = {
    name: "clean",
    description: "Remove all broken game channels.",
    guildOnly: true,
    botPerms: 1040,
    memberPerms: Discord.Permissions.FLAGS.MANAGE_CHANNELS,
    execute(msg, args) {
        msg.guild.channels.cache.forEach((channel, id) => {
            if(channel.name.startsWith(categoryPrefix)) {
                if(!msg.client.games.has(id)) {
                    if(channel.children) {
                        channel.children.forEach((c, i) => c.delete());
                    }
                    channel.delete();
                }
            }
        });
    }
}