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
module.exports = {
    name: "rules",
    description: "Display the rules of the game.",
    execute(msg, args) {
        msg.author.send({
            embed: {
                title: "How to Play",
                description: "The rules are simple:\n**1**. Each player will be sent prompts to respond to.\n**2**. The players and spectators will then vote on which response they like best.\n**3**. Points are awarded based on percentage of votes earned, with bonuses.",
                color: 16751158
            }
        });
        msg.author.send({
            embed: {
                title: "Voting",
                description: "After the players finish submitting responses, each prompt will be put to a vote. Vote for the response you like best by reacting to the prompt with the emoji that correlates to it. Some rounds allow you to submit more than one vote.",
                color: 11751890
            }
        });
    }
}