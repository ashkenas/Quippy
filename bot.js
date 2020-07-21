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
const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');

client.on('ready', () => {
    console.log(`[Status] Bot logged in as ${client.user.tag}!`)
    client.user.setPresence({
        activity: {
            type: 'WATCHING',
            name: `for ${config.prefix}help`
        },
        status: 'online'
    }).catch(console.error);

    // Load prompt packs
    client.packs = new Discord.Collection();
    const packFiles = fs.readdirSync('./prompts').filter((file) => file.endsWith('.json'));
    for(const file of packFiles) {
        const pack = require(`./prompts/${file}`);
        client.packs.set(pack.name.toLowerCase(), pack);
    }

    // Load commands
    client.commands = new Discord.Collection();
    const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));
    for(const file of commandFiles) {
        const command = require(`./commands/${file}`);
        client.commands.set(command.name, command);
    }

    client.games = new Discord.Collection();
    client.game = 0;
});

client.on('message', (msg) => {
    if(!msg.author.bot && msg.content.toLowerCase().startsWith(config.prefix)) {
        const args = msg.content.substring(config.prefix.length).split(' ');
        const cmdName = args.shift().toLowerCase();

        const command = client.commands.get(cmdName) || client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(cmdName));
        if(command) {
            if(command.guildOnly && !msg.guild) {
                msg.channel.send("That command can only be run in a server!");
                return;
            } else if(command.guildOnly && command.botPerms && !msg.guild.me.hasPermission(command.botPerms)) {
                msg.reply("the bot doesn't have the necessary permissions to do that! Please contact the server owner or admins.");
                return;
            } else if(command.guildOnly && command.memberPerms && ! msg.member.hasPermission(command.memberPerms)) {
                msg.reply("you don't have the necessary permissions to do that!");
                return;
            }

            try {
                command.execute(msg, args);
            } catch(error) {
                console.error(error);
                msg.reply("a problem occured while running that command!");
            }

            if(msg.channel.type !== "dm")
                msg.delete({timeout: 1000});
        }
    }
});

client.login(process.env.TOKEN);
