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
const { version } = require('../package.json');

function humanizeTime(time) {
    const weeks = Math.floor(time / (1000 * 60 * 60 * 24 * 7));
    const days = Math.floor(time / (1000 * 60 * 60 * 24)) % 7;
    const hours = Math.floor(time / (1000 * 60 * 60)) % 24;
    const minutes = Math.floor(time / (1000 * 60)) % 60;
    const seconds = Math.floor(time / 1000) % 60;
    return (weeks > 0 ? `${weeks} week${weeks !== 1 ? "s" : ""}${days || hours || minutes ? "," : ""} ` : "") + (days > 0 ? `${days} day${days !== 1 ? "s" : ""}${weeks || hours || minutes ? "," : ""} ` : "") + (hours > 0 ? `${hours} hour${hours !== 1 ? "s" : ""}${weeks || days || minutes ? "," : ""} ` : "") + (minutes > 0 ? `${minutes} minute${minutes !== 1 ? "s" : ""}${weeks || days || hours ? "," : ""} ` : "") + (weeks || days || hours || minutes ? "and " : "") + `${seconds} second${seconds !== 1 ? "s" : ""}`;
}

module.exports = {
    name: "statistics",
    aliases: ["stats"],
    description: "Display statistics about the bot.",
    execute(msg, args) {
        msg.channel.send({
            embed: {
                title: "Stats",
                fields: [
                    {
                        name: "Ongoing Games",
                        value: msg.client.games.size
                    },
                    {
                        name: "Guild Count",
                        value: msg.client.guilds.cache.size
                    },
                    {
                        name: "Uptime",
                        value: humanizeTime(msg.client.uptime)
                    },
                    {
                        name: "Version",
                        value: version
                    }
                ],
                color: 16751158
            }
        });
    }
}