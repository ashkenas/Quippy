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
const config = require('./config.json');

const numbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']

const emojiFilterBase = (reaction, user, filter) => filter.includes(reaction.emoji.name) && !user.bot;
const inviteFilter = (reaction, user) => emojiFilterBase(reaction, user, [config.reactions.joinPlayer, config.reactions.joinSpectator]);
const voteFilter = (reaction, user) => emojiFilterBase(reaction, user, [config.reactions.vote1, config.reactions.vote2]);

/**
 * Pause an async function.
 * @param {number} ms - Milliseconds to wait for.
 */
async function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}
Array.prototype.shuffle = function() { // Modified Fisher–Yates shuffle
    let copy = this.slice(0);
    for(let i = copy.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

/** Class representing a game. */
class Game {
    /**
     * Create a game.
     * @param {Discord.Channel} inviteChannel - Channel to put the game invitation in.
     * @param {Discord.User} host - User that created the game.
     * @param {string} pack - Name of the prompt pack to use.
     * @param {number} id - ID of this game (appended to all channel names).
     */
    constructor(inviteChannel, host, pack, id) {
        this.host = host;
        this.pack = pack;
        this.id = id;
        this.client = inviteChannel.client;
        this.waiting = [this.host];
        this.running = false;
        this.history = [];
        this.setup(inviteChannel);
    }

    /**
     * Creates a game invitation and populates the game channel.
     * @param {Discord.Channel} inviteChannel - Channel to place the invitation in.
     */
    async setup(inviteChannel) {
        this.category = await inviteChannel.guild.channels.create(config.categoryPrefix + this.id, {
            type: "category",
            permissionOverwrites: [
                {
                    id: this.client.user,
                    allow: ['SEND_MESSAGES', 'VIEW_CHANNEL', 'ADD_REACTIONS']
                },
                {
                    id: inviteChannel.guild.roles.everyone,
                    deny: ['VIEW_CHANNEL', 'ADD_REACTIONS']
                }
            ]
        });
        this.client.games.set(this.category.id, this);

        this.channel = await inviteChannel.guild.channels.create(`game-${this.id}`, {parent: this.category});
        await this.channel.createOverwrite(this.host, {VIEW_CHANNEL: true, SEND_MESSAGES: true});

        this.invite = await inviteChannel.send({
            embed: {
                title: "New Quippy Game",
                description: `React with ${config.reactions.joinPlayer} to join as a player.\nReact with ${config.reactions.joinSpectator} to join as a spectator.\nSpectators can vote but can't answer prompts.\nGame channel: <#${this.channel.id}>`,
                author: {
                    name: this.host.username,
                    icon_url: this.host.displayAvatarURL()
                },
                color: config.colors.invite
            }
        });
        
        await this.invite.react(config.reactions.joinPlayer);
        await this.invite.react(config.reactions.joinSpectator);

        this.invitationWatcher = this.invite.createReactionCollector(inviteFilter);
        this.invitationWatcher.on('collect', (reaction, user) => {
            if(!this.playerList) {
                inviteChannel.send(`<@${user.id}>, the game is still setting up, please wait a second and try again.`).then((msg) => msg.delete({timeout: 3000}));
                reaction.users.remove(user);
                return;
            }
            this.channel.createOverwrite(user, {VIEW_CHANNEL: true}).then(() => {
                if(reaction.emoji.name == config.reactions.joinPlayer && !this.running && this.waiting.length < config.maxPlayers && !this.waiting.find((player) => player == user)) {
                    this.waiting.push(user);
                    this.updatePlayerList();
                }
            }).catch((e) => {
                console.error("[Error] Error occured while adding player.")
                console.error(e);
                inviteChannel.send(`<@${user.id}>, an error occured while adding you to the game, please try joining again.`).then((msg) => msg.delete({timeout: 3000}));
                reaction.users.remove(user);
            });
        });
        
        await this.channel.send({
            embed: {
                title: "How to Play",
                description: "The rules are simple:\n**1**. Each player will be sent prompts to respond to.\n**2**. The players and spectators will then vote on which response they like best.\n**3**. Points are awarded based on percentage of votes earned, with bonuses.",
                color: config.colors.rules
            }
        });
        await this.channel.send({
            embed: {
                title: "Voting",
                description: `Vote on prompts by reacting with the emoji that corresponds to the response you like best.\nFor prompts that all players share:\n • __Players__ have **${config.gameSequence.playerVotes}** vote${(config.gameSequence.playerVotes > 1 ? "s" : "")} and can vote multiple times for the same answer.\n • __Spectators__ have **${config.gameSequence.spectatorVotes}** vote${(config.gameSequence.spectatorVotes > 1 ? "s" : "")}.\nYou can't ever vote for yourself.`,
                color: config.colors.vote
            }
        });
        await this.channel.send({
            embed: {
                title: `Prompt Pack: ${this.pack.name}`,
                description: this.pack.description,
                color: config.colors.rules,
                footer: {
                    text: `${this.pack.prompts.length} prompts`
                }
            }
        });
        
        await this.channel.send(`<@${this.host.id}>, say \`start\` to start the game, or \`end\` to abort it at any time.`);
        await this.channel.send("Everyone else, say `quit` any time before the game starts to leave.");
        
        this.playerList = await this.channel.send({
            embed: {
                title: "Players",
                description: `<@${this.host.id}>`,
                color: config.colors.playerList
            }
        });
        
        this.commandWatcher = this.channel.createMessageCollector((msg) => !msg.author.bot);
        this.commandWatcher.on('collect', this.handleCommand.bind(this));
    }

    /** Edits the player list embed with the current list of waiting players. */
    updatePlayerList() {
        let playersMsg = "";
        this.waiting.forEach((player) => playersMsg += `<@${player.id}>\n`);
        this.playerList.edit({
            embed: {
                title: "Players",
                description: playersMsg,
                color: config.colors.playerList
            }
        });
    }

    /** Constructs a sorted scoreboard and sends it to the game channel. */
    printScoreboard() {
        this.players.sort((a, b) => a.score < b.score ? 1 : -1);
        let scoreMsg = "";
        for(let i = 0; i < this.players.length; i++)
            scoreMsg += `**${i+1}. ${this.players[i].player.displayName}**: ${this.players[i].score}\n`;

        this.channel.send({
            embed: {
                title: "Scoreboard",
                description: scoreMsg,
                color: config.colors.scoreboard
            }
        });
    }

    /** Selects a random prompt that hasn't been used yet in this game. */
    randomPrompt(prompts) {
        let prompt;
        do {prompt = Math.floor(Math.random() * prompts.length);}
        while (this.history.includes(prompt));
        this.history.push(prompt);
        return prompt;
    }

    /** Executes the game logic. Distributes prompts and manages voting. */
    async game() {
        const prompts = this.pack.prompts;
        for(let i = 0; i < config.gameSequence.rounds.length; i++) {
            const round = config.gameSequence.rounds[i];

            await this.channel.send({
                embed: {
                    title: `Round #${i + 1}`,
                    description: `Players, check your private channel for your prompt${round.prompts > 1 ? "s" : ""}.`,
                    color: config.colors.promptDelay
                }
            });

            if(round.prompts === 2) {
                let roundPrompts = [];
                this.players.forEach(() => roundPrompts.push(this.randomPrompt(prompts)));
                const secondPrompt = roundPrompts.shuffle();
                
                for(let j = 0; j < this.players.length; j++)
                    this.players[j].givePrompts(round.duration * 1000, i + 1, prompts[roundPrompts[j]].replace("<BLANK>", "`______`"), prompts[secondPrompt[j]].replace("<BLANK>", "`______`"));

                await wait((config.gameSequence.roundDelay + round.duration) * 1000 + 2000); // +2000 to accomodate for rate limits/latency (arbitrarily determined)
                if(this.ended) return;

                for(let j = 0; j < this.players.length; j++) {
                    const player2 = this.players[secondPrompt.indexOf(roundPrompts[j])];
                    // Printing
                    const promptInfo = {
                        title: `Round #${i + 1}, Prompt ${j + 1}/${this.players.length}`,
                        description: prompts[roundPrompts[j]].replace("<BLANK>", "`______`"),
                        fields: [
                            {
                                name: config.reactions.vote1,
                                value: this.players[j].responses[0] || config.noResponsePlaceholder,
                                inline: true
                            },
                            {
                                name: config.reactions.vote2,
                                value: player2.responses[1] || config.noResponsePlaceholder,
                                inline: true
                            }
                        ],
                        color: config.colors.prompt
                    };

                    const promptMsg = await this.channel.send({
                        embed: promptInfo
                    });
                    // Check for empty responses
                    if(!this.players[j].responses[0] && !player2.responses[1]) {
                        await this.channel.send({
                            embed: {
                                title: "No responses submitted!",
                                description: "No points for anyone!",
                                color: config.colors.promptsFailed
                            }
                        });

                        await wait(config.gameSequence.votingInterim * 1000);
                        if(this.ended) return;
                        continue;
                    } else if(!this.players[j].responses[0] || !player2.responses[1]) {
                        const winner = this.players[j].responses[0] ? this.players[j] : player2;
                        winner.score += 1000 * round.multiplier;
                        await this.channel.send({embed:
                            {
                                title: "Prompt Winner",
                                description: `**${this.players[j].player.displayName}**: ${this.players[j].score}\n**${player2.player.displayName}**: ${player2.score}`,
                                author: {
                                    name: winner.player.displayName,
                                    icon_url: winner.user.displayAvatarURL()
                                },
                                color: config.colors.playerList
                            }
                        });
    
                        await wait(config.gameSequence.votingInterim * 1000);
                        if(this.ended) return;
                        continue;
                    }
                    // Voting
                    await promptMsg.react(config.reactions.vote1);
                    await promptMsg.react(config.reactions.vote2);

                    const voters = [];
                    let vote1 = 0, vote2 = 0;
                    const voteCollector = promptMsg.createReactionCollector(voteFilter);
                    voteCollector.on('collect', (reaction, user) => {
                        if(!voters.includes(user.id) && !(user === this.players[j].user || user === player2.user)) {
                            voters.push(user.id);
                            if(reaction.emoji.name === config.reactions.vote1)
                                vote1++;
                            else
                                vote2++;
                        }
                        reaction.users.remove(user);
                    });

                    this.roundTimer = new GameTimer(this.channel, config.gameSequence.votingDuration * 1000, "Voting", "vote");
                    await this.roundTimer.init();
                    this.roundTimer.start();

                    await wait(config.gameSequence.votingDuration * 1000);
                    if(this.ended) return;
                    voteCollector.stop();
                    // Scoring
                    let score1 = 0, score2 = 0;
                    if(vote1 + vote2 > 0) {
                        score1 = Math.floor(vote1 / (vote1 + vote2) * 1000) * round.multiplier;
                        score2 = Math.floor(vote2 / (vote1 + vote2) * 1000) * round.multiplier;
                    }

                    promptInfo.fields[0].name += ` ${this.players[j].player.displayName}`;
                    promptInfo.fields[0].value += `\n**__Score__**\n${vote1 + vote2 > 0 ? Math.floor(vote1 / (vote1 + vote2) * 100) : 0}%, ${score1} points`;
                    promptInfo.fields[1].name += ` ${player2.player.displayName}`;
                    promptInfo.fields[1].value += `\n**__Score__**\n${vote1 + vote2 > 0 ? Math.floor(vote2 / (vote1 + vote2) * 100) : 0}%, ${score2} points`;
                    promptMsg.edit({embed: promptInfo});
                    
                    if(score1 > score2)
                        score1 += 100 * round.multiplier;
                    else if (score2 > score1)
                        score2 += 100 * round.multiplier;
                    this.players[j].score += score1;
                    player2.score += score2;

                    const winner = score1 === score2 ? undefined : (score1 > score2 ? this.players[j] : player2);
                    const winnerEmbed = {
                        title: winner ? `Prompt Winner (+${100 * round.multiplier} bonus points)` : "Tie",
                        description: `**${this.players[j].player.displayName}**: ${this.players[j].score}\n**${player2.player.displayName}**: ${player2.score}`,
                        color: config.colors.playerList
                    }
                    if(winner) {
                        winnerEmbed.author = {
                            name: winner.player.displayName,
                            icon_url: winner.user.displayAvatarURL()
                        }
                    }
                    
                    await this.channel.send({embed: winnerEmbed});

                    await wait(config.gameSequence.votingInterim * 1000);
                    if(this.ended) return;
                }
                
            } else if(round.prompts === 1) {
                const prompt = prompts[this.randomPrompt(prompts)].replace("<BLANK>", "`______`");
                this.players.forEach((player) => player.givePrompts(round.duration * 1000, i + 1, prompt));

                await wait((config.gameSequence.roundDelay + round.duration) * 1000 + 2000);
                if(this.ended) return;
                // Printing
                const promptInfo = {
                    title: `Round #${i + 1}`,
                    description: prompt,
                    fields: [],
                    color: config.colors.prompt
                };
                let reactions = {};
                for(let j = 0; j < this.players.length; j++) {
                    promptInfo.fields.push({
                        name: numbers[j + 1],
                        value: this.players[j].responses[0] || config.noResponsePlaceholder,
                        inline: true
                    });
                    if(this.players[j].responses[0])
                        reactions[numbers[j + 1]] = this.players[j];
                }
                const promptMsg = await this.channel.send({embed: promptInfo});
                const emojis = Object.keys(reactions);
                for(let j = 0; j < emojis.length; j++)
                    await promptMsg.react(emojis[j]);

                if(emojis.length) { // Only run voting if any players submitted a response.
                    // Voting
                    const voters = {};
                    const votes = {};
                    const voteCollector = promptMsg.createReactionCollector((reaction, user) => emojiFilterBase(reaction, user, emojis));
                    voteCollector.on('collect', (reaction, user) => {
                        if(!voters[user.id]) {
                            voters[user.id] = 0;
                        }
                        if(reactions[reaction.emoji.name].user !== user && voters[user.id] < (this.waiting.includes(user) ? config.gameSequence.playerVotes : config.gameSequence.spectatorVotes)) {
                            voters[user.id]++;
                            if(!votes[reaction.emoji.name])
                                votes[reaction.emoji.name] = 0;
                            votes[reaction.emoji.name]++;
                        }
                        reaction.users.remove(user);
                    });

                    await this.channel.send({
                        embed: {
                            title: "Special Vote",
                            description: `__Players__ have **${config.gameSequence.playerVotes}** vote${(config.gameSequence.playerVotes > 1 ? "s" : "")} and can vote multiple times for the same answer.\n__Spectators__ have **${config.gameSequence.spectatorVotes}** vote${(config.gameSequence.spectatorVotes > 1 ? "s" : "")}.\nYou can't vote for yourself.`,
                            color: config.colors.vote
                        }
                    });

                    this.roundTimer = new GameTimer(this.channel, config.gameSequence.votingDuration * 1000, "Voting", "vote");
                    await this.roundTimer.init();
                    this.roundTimer.start();

                    await wait(config.gameSequence.votingDuration * 1000);
                    if(this.ended) return;
                    voteCollector.stop();
                    
                    for(let j = 0; j < this.players.length; j++)
                        promptInfo.fields[j].name += ` ${this.players[j].player.displayName}`;
                    await promptMsg.edit({embed: promptInfo});
                    // Scoring
                    const orderedVotes = [];
                    Object.keys(votes).forEach((reaction) => orderedVotes.push({vote: reaction, count: votes[reaction]}));
                    orderedVotes.sort((a, b) => a.count > b.count ? 1 : -1);
                    let k = 0, l = 0;
                    for(let j = 0; j < orderedVotes.length; j++) {
                        k++;
                        if(orderedVotes[j].count === l) k--;
                        l = orderedVotes[j].count;
                        const response = promptInfo.fields.find((field) => field.name.startsWith(orderedVotes[j].vote));
                        const score = k * round.multiplier;
                        response.value += `\n**__Score__**\n${orderedVotes[j].count} votes, ${score} points`;
                        reactions[orderedVotes[j].vote].score += score;
                        await promptMsg.edit({embed: promptInfo});
                        await wait(1000);
                        if(this.ended) return;
                    }
                }
            }
            this.printScoreboard();
            await wait(config.gameSequence.votingInterim * 1000);
            if(this.ended) return;
        }

        await this.channel.send({
            embed: {
                title: "Winner",
                description: `${this.players[0].player.displayName}: ${this.players[0].score} points`,
                color: config.colors.promptsSuccess
            }
        });

        await wait(config.gameSequence.disbandDelay * 1000);
        this.endGame();
    }

    /**
     * Process input and take action accordingly.
     * @param {Discord.Message} msg - Message object containing the command to process
     */
    async handleCommand(msg) {
        if(msg.author != this.host) {
            if(msg.content.toLowerCase() === "quit" && !this.running) {
                const quitter = this.waiting.find((player) => player === msg.author);
                if(quitter) {
                    this.waiting.splice(this.waiting.indexOf(quitter), 1);
                    this.updatePlayerList();
                }
                this.channel.permissionOverwrites.get(msg.author.id).delete();
            }
        } else {
            if(msg.content.toLowerCase() === "start" && !this.running) {
                if(this.waiting.length < config.minPlayers) {
                    this.channel.send(`You need at least ${config.minPlayers} players to start!`).then((msg) => msg.delete({timeout: 3000}));
                } else if(this.pack.prompts.length < this.waiting.length * 2 + 1) {
                    this.channel.send(`For **${this.waiting.length}** players, you need a pack with at least **${this.waiting.length * 2 + 1}** prompts.  Either some players need to quit or a new game should be created with a different pack.`)                    
                } else {
                    this.running = true;
                    this.players = [];
                    this.waiting.forEach((player) => this.players.push(new GamePlayer(player, this.channel)));
                    for(let i = 0; i < this.players.length; i++)
                        await this.players[i].init();
                    this.channel.updateOverwrite(msg.guild.roles.everyone, {SEND_MESSAGES: false});
                    this.game();
                }
            } else if(msg.content.toLowerCase() === "end") {
                this.endGame();
            }
        }
        msg.delete();
    }

    /** Terminate all asynchronous code and delete all channels in use. */
    endGame() {
        if(this.invite)
            this.invite.delete();
        if(this.players)
            this.players.forEach((player) => player.dispose());
        if(this.invitationWatcher)
            this.invitationWatcher.stop();
        if(this.commandWatcher)
            this.commandWatcher.stop();
        if(this.roundTimer)
            this.roundTimer.cancel();
        if(this.channel)
            this.channel.delete();
        if(this.client.games.has(this.category.id))
            this.client.games.delete(this.category.id);
        if(this.category)
            this.category.delete();
        this.ended = true;
    }
}

/** Class representing a player. */
class GamePlayer {
    /**
     * Create a player.
     * @param {Discord.User} user - The user this player will represent.
     * @param {Discord.Channel} gameChannel - The channel to redirect players to when a round ends.
     */
    constructor(user, gameChannel) {
        this.user = user;
        this.gameChannel = gameChannel;
        this.score = 0;
        this.timedOut = true;
    }

    /** Create the channel this player will submit responses to. */
    async init() {
        this.player = this.gameChannel.guild.members.cache.get(this.user.id) || await this.gameChannel.guild.members.fetch(this.user.id);
        this.playerChannel = await this.gameChannel.guild.channels.create(`player-${this.player.displayName}`, {
            parent: this.gameChannel.parent,
            permissionOverwrites: [
                {
                    id: this.gameChannel.client.user,
                    allow: ['VIEW_CHANNEL']
                },
                {
                    id: this.user,
                    allow: ['VIEW_CHANNEL']
                },
                {
                    id: this.gameChannel.guild.roles.everyone,
                    deny: ['VIEW_CHANNEL']
                }
            ]
        });

        this.responseCollector = this.playerChannel.createMessageCollector((msg) => msg.author === this.user);
        this.responseCollector.on('collect', this.handleResponse.bind(this));
    }

    /**
     * 
     * @param {number} time - How long the player should have to submit responses, in seconds.
     * @param {number} round - Which round these prompts belong to.
     * @param {string} prompt1 - First prompt the player should answer.
     * @param {string} [prompt2] - Second prompt the player should answer.
     */
    async givePrompts(time, round, prompt1, prompt2) {
        this.responses = [];
        this.timedOut = false;
        this.max = prompt2 === undefined ? 1 : 2;
        if(this.max > 1) {
            this.prompt2 = prompt2;
            this.round = round;
        }

        await this.playerChannel.send(`<@${this.user.id}>`, {
            embed: {
                title: `Round #${round}`,
                description: `Beginning in ${config.gameSequence.roundDelay} seconds.`,
                color: config.colors.promptDelay
            }
        });

        await wait(config.gameSequence.roundDelay * 1000);
        if(this.disposed) return;

        this.roundTimer = new GameTimer(this.playerChannel, time, "Creative Writing", `complete the prompt${(prompt2 ? "s" : "")}`);
        await this.roundTimer.init();
        this.roundTimer.start();

        await this.playerChannel.send({
            embed: {
                title: `Round #${prompt2 === undefined ? round : (round + ", Prompt #1")}`,
                description: prompt1,
                color: config.colors.prompt
            }
        });

        this.timer = setTimeout(() => {
            this.timedOut = true;

            this.playerChannel.send({
                embed: {
                    title: "You ran out of time to answer!",
                    description: `Click here to return to the game: <#${this.gameChannel.id}>`,
                    color: config.colors.promptsFailed
                }
            });
        }, time);
    }

    /** Store responses the player gives. 
     * @param {Discord.Message} msg - Message object containing the response to process
    */
    handleResponse(msg) {
        if(this.timedOut || this.responses.length >= this.max) return;

        this.responses.push(msg.content);

        if(this.responses.length === 1 && this.max > 1) {
            this.playerChannel.send({
                embed: {
                    title: `Round #${this.round}, Prompt #2`,
                    description: this.prompt2,
                    color: config.colors.prompt
                }
            });
        } else if(this.responses.length === this.max) {
            this.timedOut = true;
            clearTimeout(this.timer);

            this.playerChannel.send({
                embed: {
                    title: "All prompts answered!",
                    description: `Click here to return to the game: <#${this.gameChannel.id}>`,
                    color: config.colors.promptsSuccess
                }
            }).catch((e) => {
                console.error("[Error] Error occured when sending timeout message.");
                console.error(e);
            });
        }
    }

    /** Terminate all asynchronous operations and delete the channel this player resides in. */
    dispose() {
        if(this.responseCollector)
            this.responseCollector.stop();
        if(this.roundTimer)
            this.roundTimer.cancel();
        clearTimeout(this.timer);
        this.playerChannel.delete();
        this.disposed = true;
    }
}

/** Class representing a timer message. */
class GameTimer {
    /**
     * Create a timer.
     * @param {Discord.Channel} channel - Channel to send the timer message in.
     * @param {number} time - Timer duration in milliseconds.
     * @param {string} title - Title of the timer embed.
     * @param {string} action - Action the timer message says to do.
     */
    constructor(channel, time, title, action) {
        this.channel = channel;
        this.time = time;
        this.title = title;
        this.action = action;
        this.segments = time / 4000 > 16 ? 7 : Math.floor((time / 4000 - 2) / 2 + .5);
        this.maxPos = this.segments * 2 + 2;
        this.posLength = time / (this.maxPos);
    }

    /** Create the initial embed object and send it. */
    async init() {
        this.timerEmbed = {
            title: this.title,
            description: `You have **${Math.floor(this.time/1000)}** seconds to ${this.action}.`,
            fields: [
                {
                    name: "Time remaining",
                    value: this.progressBarString(this.maxPos)
                }
            ],
            color: config.colors.promptDelay
        };
        this.msg = await this.channel.send({embed: this.timerEmbed});
    }

    /** Edits the timer message periodically until time runs out. */
    async start() {
        let beganAt = Date.now();
        for(let i = 1; i < this.maxPos + 1; i++) {
            await wait(this.posLength - (Date.now() - beganAt - (i - 1) * this.posLength));
            if(this.canceled)
                break;
            this.timerEmbed.fields[0].value = this.progressBarString(this.maxPos - i);
            await this.msg.edit({embed: this.timerEmbed});
        }
        this.msg.delete({timeout: 1000});
    }
    
    /**
     * Creates a string of emojis to represent the progress bar's requested state.
     * @param {number} pos - How many steps are left in the progress bar.
     */
    progressBarString(pos) {
        let progressBar = "";
        progressBar += config.progressBar.leftCap[pos === 0 ? "empty" : "full"];
        for(let i = 0; i < this.segments; i++) {
            const segPos = (i + 1) * 2;
            progressBar += config.progressBar.middle[pos < segPos ? "empty" : (pos === segPos ? "middle" : "full")];
        }
        progressBar += config.progressBar.rightCap[pos < this.maxPos ? "empty" : "full"];
        return progressBar;
    }

    /** Terminate the timer. */
    cancel() {
        this.canceled = true;
    }
}

module.exports = Game;
