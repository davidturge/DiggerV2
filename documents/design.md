# DIGGER VERSUS

**Full, Annotated Design Document**

A modern remake of Digger (1983) — Solo campaign + online 1v1

*This document is written so that anyone — including someone who was not part of the design process — can fully understand the game.*

Version 2.0 (expanded) · Working document

---

## Table of Contents

0. Introduction — How to Read This Document
1. What This Game Is, in Broad Strokes
2. The Heart of the Game — What the Player Actually Does
3. The Characters
4. The Enemies
5. The Bosses
6. Upgrades (Campaign Only)
7. Campaign Structure
8. Online 1v1 Mode

---

## 0. Introduction — How to Read This Document

This document describes a video game called Digger Versus, from beginning to end. It is written so that even someone unfamiliar with the concept can understand every part. Every mechanic is explained from scratch, with examples.

The structure: we start with the big picture (what the game is and why it's special), continue to the "heart" of the game — what the player actually does — and then get into the details: characters, enemies, bosses, the competitive mode, monetization, technology, and the build order.

**How to read the boxes in this document:**

- Blue box = a central principle or an especially important point.
- Green box = a concrete example ("here's how it looks in practice").
- Yellow box = a scope decision / what makes it into the first release.

---

## 1. What This Game Is, in Broad Strokes

### 1.1 Where It Comes From

Digger is a classic arcade game from 1983. The idea is simple: you control a "digger" character who lives underground. You dig tunnels through the dirt, collect diamonds scattered in the ground, and avoid monsters. To fight the monsters, you can drop heavy gold sacks on them that are lodged in the ground — you dig away the dirt beneath a sack, and it falls and crushes them.

That game was very popular in its day, but it's old — simple graphics, only one player, and nothing modern. We take its good idea and build a completely new version for phones.

### 1.2 What We're Adding — and the Thing That Makes It Special

The big upgrade: a two-player, one-against-the-other (1v1) online mode. And here's the magic —

> **🔵 The core idea of the entire game:**
>
> In the original game, the ground you dig is yours alone. In our version, both players share the same map — so every tunnel you dig is both an asset and a risk. It's your path to the diamonds, but also the path through which your opponent can reach and attack you. You are simultaneously building your escape route and your opponent's attack route.
>
> No similar game does this, and it's what makes the 1v1 tense and interesting.

### 1.3 Two Game Modes

The game has two separate parts, and both use the same "core" (the same basic gameplay):

**Mode 1 — Single-player campaign (solo):**
A series of levels you clear alone. Every few levels you enter a new "world" with its own theme (ice world, lava world, etc.), and each world ends with a battle against a "boss" — a giant, special monster. It's an experience of adventure and progression — you always want to see what the next level holds.

**Mode 2 — Online 1v1 (two players):**
You play against a real person over the internet. There's ranking (like a league — the more you win, the higher your rank climbs), and there's a friendly mode to play against a friend without pressure. It's a competitive experience — you always want to improve and win.

The link between the two: things you unlock in the campaign (new characters) are also available in 1v1. So there's a reason to play both.

### 1.4 Who the Game Is For

- Platform: phones (Android), distributed through the Google Play Store.
- Audience: all ages. The visuals are colorful and friendly (a "clay"/cartoon style), not violent or scary.
- Monetization: the game is free with ads, and you can buy cosmetics or remove ads. You cannot buy an in-game advantage — this matters for fairness.

---

## 2. The Heart of the Game — What the Player Actually Does

This is the most important chapter. If you understand this chapter, you understand the game. Everything else is built on what's written here. The core is identical in both the campaign and 1v1.

### 2.1 The Basic Action: Dig and Collect

The screen shows an underground field — imagine a cross-section of earth seen from the side, full of dirt. Your character is inside the ground. As you move, you dig a tunnel — the dirt you pass through disappears, leaving an empty space (a tunnel) behind you.

Glowing diamonds are scattered in the dirt. When you pass over a diamond, you collect it, and it's worth points. The basic goal: collect as many diamonds as possible.

> **🟢 Example:**
>
> You see a cluster of 5 diamonds to your right, but there's dirt between you. You move right — digging a tunnel through the dirt — and reach the diamonds. You pass over them one by one, and each adds points. Now there's a new tunnel leading to where you stand.

### 2.2 The Three Decisions That Keep Recurring

On top of the basic action, there are three questions you constantly ask yourself. These are the "tactical heart" of the game:

- **Where to dig?** Every tunnel you open gives you access to something (diamonds), but also opens a path someone (an enemy or opponent) can use to reach you.
- **When to drop a gold sack?** This is your main weapon (explained in the next section).
- **When to shoot?** You have a gun, but it's limited — so every shot is a decision.

*The feel we want: measured and tactical. Meaning — the player has time to think and plan; it's not just a game of rapid taps.*

### 2.3 Movement

The character moves in 8 directions (up, down, sideways, and diagonals), smoothly.

On phone: there's a virtual "joystick" on the screen (a circle you drag with your finger) for movement, and buttons for actions (automatic digging while moving, shooting, and a special ability).

### 2.4 Gold Sacks — The Central Weapon

Gold sacks are heavy objects lodged in the ground. They are your main weapon, and here's how they work:

- When you dig away the dirt beneath a sack, it loses support. It doesn't fall immediately — first it wobbles for a few seconds (a "warning signal" everyone can see), and then it falls.
- A falling sack crushes and kills anyone beneath it — an enemy, your opponent, or even you if you're not careful.
- If the sack fell from a height of 2 tiles or more, it breaks on landing and the gold scatters — you can collect it for a few extra points. If it fell from a single tile, it stays intact.
- You can also push a sack sideways to move it wherever you want.

> **🟢 Example — how to kill an opponent with a sack:**
>
> You see your opponent standing beneath a gold sack. You quickly dig away the dirt below the sack. The sack starts to wobble (the opponent sees this and tries to flee). If you timed it right — the sack falls on them before they escape, crushes them, and also breaks and scatters gold that you collect. A kill + loot in one blow.

> **🔵 Important for balance: dropping a sack is not instant.**
>
> Because the sack wobbles before it falls, the pursued player always has a brief moment to react — to flee, block, or turn it against you. This is what makes it a real "struggle," not a "whoever pressed the button first wins." It's easy to initiate a drop attempt, but there's a short reaction window.

### 2.5 Shooting and the "Heat Meter"

Your character also has a rifle. But you can't shoot without limit — and that's a deliberate choice, because free shooting would make the game too simple. Instead there's a "heat meter":

- Every shot heats the rifle (the meter rises). If you shoot too much too fast, the rifle overheats and jams for a few seconds — and during that time you're exposed and weaponless.
- If you shoot in smart bursts and let the rifle cool between shots, you always have ammo.
- At the start of each round the rifle is cold and ready — you can open fire immediately.

**What does shooting do? An important point:**

- Shooting an enemy — kills it.
- Shooting the opponent (another player) — does not kill! It slows or pushes them. It's a control tool, not a kill.

> **🟢 Example — why non-lethal shooting is brilliant:**
>
> You see an opponent beneath a wobbling sack. They start to flee. You shoot them — the shot slows/pushes them for a moment — and that delay is enough for the sack to fall on them before they escape. The shot didn't kill them directly, but it's what enabled the kill. The two mechanics (shooting and the sack) work together as one system.

### 2.6 The Cherry and "Frenzy" Mode

Midway through each round, a single cherry appears at the center of the map. It's a very special item:

- Whoever reaches and grabs the cherry first becomes the "hunter" for 5 seconds.
- During that time, the enemies (and the opponent) flee from them, and they can catch and eat them simply by touch (a bit like Pac-Man).
- If they catch the opponent in this state — they steal the diamonds the opponent hasn't yet deposited (it doesn't fully kill them, just robs them).

Because the cherry appears mid-round and in the center, both players lunge for it — creating a guaranteed clash in the middle of every round.

### 2.7 The "Bank" Mechanic — One of the Important Innovations

This is an idea that wasn't in the original, and it adds a lot of depth. The rule:

> **🔵**
>
> A diamond you collect is not "counted" until you deposit it at a special deposit point on the map.
>
> As long as you're carrying undeposited diamonds — they're at risk. If you're killed (by a gold sack or by frenzy), they spill out and you lose them.

Why is this good? Because it creates a constant dilemma:

- "Keep collecting more diamonds" — risky, because if you're killed you lose everything.
- "Run to deposit what I have" — safe, but wastes time you could have spent collecting more.

> **🟢 Example — a dramatic peak moment:**
>
> 10 seconds remain in the round. You're carrying 15 undeposited diamonds, and you're in the lead. You run to the deposit point — but the opponent knows this and has set a sack trap on the way. If they drop you before you arrive — you lose all 15 and lose the round. The whole round comes down to this moment.

### 2.8 The More You Carry — The Slower You Get

Connected to the bank mechanic: the more undeposited diamonds you carry, the slower you move (gradually). This gives a real "price" to greed — if you've collected a lot and not deposited, you're heavy and slow and therefore easier to catch. It also balances whoever is in the lead (they become slow), without giving "artificial" help to the loser.

### 2.9 Two Types of Ground

The ground isn't uniform — there are two types, and this is a tool for designing the maps:

| Type | How it's dug | Role |
|---|---|---|
| Regular dirt | One dig — fast | Most of the map |
| Hard rock | Two digs — slow | Creates natural "walls" that shape routes and tighten the battlefield |

The rock creates areas that are hard to pass through — narrow corridors, hiding spots, and strategic points. Without rock, the whole map would be too open and boring.

---

## 3. The Characters

The game has three digger characters to choose from. Each plays differently, because each has two unique things: a "passive" ability (something always active) and an "active" ability (a button you trigger, with a wait time between uses — a "cooldown"). The same character is available in both the campaign and 1v1.

### 3.1 Buster — The Aggressor

- **Style:** aggressive. Wins through attacking and eliminating the opponent. Suited to those who like to fight.
- **Passive (always active):** the sacks he drops fall faster — harder to dodge.
- **Active "Knockback":** a button that sends a short wave pushing the opponent a tile or two. The classic use — pushing an opponent under a wobbling sack.
- **Weakness:** less good at collecting diamonds. If he fails to eliminate the opponent — he falls behind on points.

### 3.2 Gemma — The Collector

- **Style:** economic. Wins through fast collecting and building a diamond advantage. Suited to those who like to gather and flee with the loot.
- **Passive:** collects diamonds from a larger range, and deposits at the bank faster.
- **Active "Sprint":** a 3-second speed burst that temporarily cancels the slowdown from carrying diamonds. Perfect for fleeing with loot, or a fast run to the bank before you're caught.
- **Weakness:** weak in direct confrontation. If she's caught carrying a lot — it's a big robbery.

### 3.3 Drill — The Technical One

- **Style:** spatial control. Wins through maneuvering and cleverness, not force. Suited to those who like to plan and block.
- **Passive:** digs dirt faster than anyone, and breaks hard rock in one dig (instead of two). Meaning — rock doesn't slow him down, and he's the most mobile on the map.
- **Active "Super Tunnel":** digs at super-speed along a long, straight line in any direction (several tiles at once). Creates an instant path — to attack, flee, or quickly reach a distant diamond.
- **Weakness:** he has no strong direct attack. Wins through traps and control — and if the opponent is clever and doesn't fall for them, he struggles.

### 3.4 How the Characters Are Balanced

No character is "the best" — each has opposing strengths and weaknesses (like rock-paper-scissors):

> **🔵**
>
> Buster (aggressor) beats Gemma (catches her) ← Gemma (collector) accumulates faster than Drill ← Drill (technical) blocks and neutralizes Buster. A closed loop — no vertex dominates.

Principles that ensure the balance:

- Every character has an equal "power budget," just distributed differently. An advantage in one area = a disadvantage in another.
- Every ability has a cost (cooldown or exposure) — no ability is "free."
- No ability wins on its own — it always requires timing and skill.

> **🟡 Important for development:**
>
> The precise balance (how fast, how strong, how long the cooldown) is determined through testing and tuned along the way. So all these numbers need to be easy to change in a config file, not "hard-coded."

---

## 4. The Enemies

In the campaign (and to some degree everywhere) there are monsters that roam the map and threaten you. We put a lot of thought into making them fun to fight and fun to kill.

### 4.1 The Important Rule: Enemies Don't Dig

This is a foundational rule that ensures the game is fair:

- The basic enemy moves only within tunnels you've already dug. It cannot dig dirt itself. This means you're always in control — you know exactly where it can reach, because you created the paths.
- The "upgraded" enemy (which appears more in advanced levels) is simply faster — but it too doesn't dig.
- Only bosses can dig. That's what makes them special and frightening.

> **🔵 Why this matters:**
>
> If a regular enemy could dig, it could suddenly break through to you from any direction — and that's unfair, because you couldn't see it coming. Because enemies are limited to your tunnels, you can always plan and defend.

### 4.2 The Design: "Slimes" (Clay Creatures)

Our enemies are the "slime" family — small, roundish creatures made of clay (clay style). They're cute-annoying, friendly for all ages, and above all — fun to kill, because when crushed they splatter and burst like jelly. We chose them over the original monsters because they fit our visual style perfectly.

| Slime type | Behavior |
|---|---|
| Basic | Slow, chases you through existing tunnels |
| Nimble (upgraded) | Faster, but still doesn't dig |
| Puffy | When crushed, splits into two smaller slimes — fun and chaos |
| Swarm | Moves in groups; if you drop a sack on several at once — rewarding group crush |

### 4.3 Three Ways to Kill an Enemy

| Method | How | What you see (the effect) |
|---|---|---|
| Gold sack | Drop a sack on it | Flash, "splat," clay splatter, screen shake |
| Shooting | Shoot it | Bursts into pieces, pop, sparks |
| Frenzy | Eat it by touch in cherry mode | Funny animation, happy sound, popping score |

### 4.4 Why It's Fun — The "Juiciness" (Game Feel)

"Game Feel" is a term in the games world for the physical sensation each action gives. The more satisfying killing an enemy feels and sounds, the more fun the game is. The tools:

- "Hit-stop" — a tiny time freeze (a fraction of a second) at the moment of impact, giving a sense of "weight."
- Particles (sparks/splatter) + layered sounds on every kill.
- Light screen shake and phone vibration.
- A "combo" system: consecutive kills raise a counter, change color and sound, and reward points. This is the "heart" of the fun in killing.

### 4.5 Why the Game Isn't Too Easy (Even Though Enemies Don't Dig)

A logical question: if enemies only come from my tunnels, maybe I'll just not dig toward them and stay safe? The answer: you must dig to win, and that's what creates the challenge:

- The most valuable diamonds are in exposed, dangerous places — you must enter danger to collect them.
- Enemies spawn from fixed points on the map and multiply as the level progresses — you don't control the source.
- Enemies block tunnels and force you to dig a detour — losing precious time.
- "Playing safe and slow" simply makes you lose on points or on time.

---

## 5. The Bosses

At the end of each world in the campaign a "boss" awaits — a giant, special monster. The bosses are the campaign's climactic moments, and each has a completely unique mechanic. Important principle: you beat a boss through the ground (sacks, digging, water) combined with shooting — not just "shoot it until it dies."

Each boss embodies its world's theme, and before each of its attacks there's a clear "warning signal" (telegraph) so the fight is fair. If you lose — you return only to the start of the boss fight, not the whole world.

### 5.1 World 1 Boss — "The Drill" (Dirt World)

The first boss, whose role is to teach the player how to fight bosses.

- **Who it is:** the only boss that can dig itself. It burrows toward you through the dirt, leaving a tunnel behind it — there's no hiding place.
- **How to win:** lead it beneath a gold sack and drop it. You need 2-3 successful drops.
- **Escalation:** after each hit it gets faster and more enraged. Later it also starts dropping tunnels on you.

### 5.2 World 2 Boss — "The Ice Golem" (Ice World)

- **Who it is:** a slow but durable ice giant, covered in ice armor.
- **The twist:** (a) it breathes frost that freezes the floor and makes it slippery — you slide and it's hard to maneuver. (b) Regular shooting doesn't hurt it because it's armored — first you have to break the armor.
- **How to win:** drop a gold sack on it to crack the ice armor, then shoot the exposed spot. A "break-then-shoot" puzzle.

### 5.3 World 3 Boss — "The Lava Golem" (Lava World)

- **Who it is:** a golem made of boiling lava, which fills your tunnels with lava (your battlefield shrinks).
- **The problem:** it's soft and scalding — if you drop a sack on it, the sack will burn. First you have to harden it.
- **How to win ("cool-and-crush"):** the map has water reservoirs. You dig into a water reservoir → the water flows to the golem → the lava cools and becomes a brittle shell (for a few seconds) → then you drop a gold sack that shatters the shell. Repeat 2-3 times.

This is a fight of map planning (where the water is, where the sack is, how to time it), not just reflexes.

### 5.4 World 4 Boss — "The Octopus" (Water World)

- **Who it is:** a giant sea creature living in water that rises gradually and fills the map from the bottom.
- **The threat:** it sends arms through the tunnels that grab you, and it raises the flooding rate. If the water reaches the top of the map — you lose (real time pressure).
- **How to win:** its head (the weak point) is exposed only when the water is low. You dig "drainage channels" that lower the water → the head is exposed → gold sack + shooting.

### 5.5 World 5 Boss — "The Mine Core" (Final Boss)

The climax of the whole game. Unlike the other bosses (which have a single phase), this boss has three phases, and it tests everything you learned throughout the campaign. It also closes the story (this is the core that awakened all the monsters).

- **Phase 1 "The Swarm":** the core spawns waves of slimes while you look for an opening to hit it.
- **Phase 2 "The Chase":** a drill-arm burrows after you (like the drill from world 1) — you lead it into sack traps.
- **Phase 3 "The Rage":** the entire arena attacks at once (lava + flooding + collapses), and you burrow toward the exposed core to deliver the final blow.

There's a short breather between phases (so it's epic and not exhausting). At the end — a special reward (an exclusive character/cosmetic) and a closing cutscene.

---

## 6. Upgrades (Campaign Only)

> **🟡**
>
> Important to understand: upgrades exist only in the campaign (single-player mode). There are no upgrades at all in 1v1.

### 6.1 What an Upgrade Is and How It Works

An upgrade is a temporary improvement you receive mid-level, which resets at the end. Here's how it works:

- You start each level as a regular character, with no upgrades.
- Every time you deposit diamonds at the bank, you "level up."
- On each level-up, the game shows you 3 random cards (3 possible upgrades). You choose one, and it takes effect immediately.
- The more you collect, the more levels you gain and the more upgrades you choose — becoming stronger and stronger until the end of the level.
- At the end of the level, all upgrades reset. The next level starts fresh.

> **🟢 Example:**
>
> You started a level as usual. You collected and deposited 5 diamonds → you leveled up → 3 cards appear: "Fast Legs," "Double Shot," "Collection Radius." You chose "Double Shot" → from now on you fire 2 bullets. You continue, deposit more → another level-up → 3 new cards → choose another. And so on.

Why it's fun: each time you play, the random cards are different, so you build a different "build" — once all offensive, once all economic. You start weak and become strong along the way. It's an addictive feeling (coming from a genre called "roguelite").

### 6.2 The Rules

- Each level you accumulate roughly 4-6 upgrades.
- Numeric upgrades (speed, damage) can be taken again and again to strengthen them; special abilities — only once.
- There are rarer upgrades ("legendary") that are powerful and special — their appearance is an exciting moment. In the campaign they're allowed to be strong, because there's no opponent to balance against.
- You also accumulate upgrades during a boss fight (the boss resets like any level).

### 6.3 Examples of Upgrades

| Category | Examples |
|---|---|
| Movement | Fast Legs · Sharp Drill (fast digging) · Light Armor (less slowdown) |
| Attack | Double Shot · Fast Cooling · Heavy Sack (falls fast and hard) |
| Economy | Collection Radius · Double Diamond Value · Deep Pocket (carry more) |
| Defense | Shield (absorbs a hit) · Fast Respawn · Push Wave |
| Legendary | Lightning (auto-fire) · Super Magnet · King Midas (a killed enemy leaves a diamond) |

### 6.4 Why There Are No Upgrades in 1v1

In 1v1 we wanted competitive purity — that victory be decided by skill alone, not luck. Pausing a fast competitive match to pick a card would hurt both the pace and the fairness. So both players in 1v1 start completely identical, and all the difference is talent: reading the map, timing, and control of the ground. Upgrades get a natural home in the campaign, where they shine.

---

## 7. Campaign Structure

The campaign is the single-player experience — a series of levels organized into worlds.

### 7.1 The Big Picture

- 5 worlds, each with 8 levels = 40 levels total (including 5 bosses).
- The worlds: Dirt ← Ice ← Lava ← Water/Flood ← Core. Each world introduces a new mechanic/environment.
- At a pace of 2-3 minutes per level, that's about one to two hours of basic content — but in practice much more, because of the 3 difficulty levels, the stars to collect, and the random challenges (see below).

### 7.2 How a World Is Built (8 Levels)

Each world is built as a "learning arc": it introduces a new mechanic, teaches it gradually, and tests it in the boss. Example:

- **Level 1:** soft introduction of the new mechanic (also serves as natural tutorial).
- **Levels 2-3:** practice and adding elements.
- **Levels 4-6:** escalation and combination.
- **Level 7:** the peak challenge before the boss.
- **Level 8:** the boss.

### 7.3 Level Types (For Variety)

| Type | What you do |
|---|---|
| Collection | Collect all the diamonds to open the exit (the classic) |
| Escape / Survival | The map collapses or floods behind you — burrow out in time (the most tense) |
| Puzzle | A limited number of digs — you must plan a route |
| Chase | Something chases constantly — perpetual motion |
| Boss | End of world |

### 7.4 Difficulty Levels

Three levels: Easy / Medium / Hard. Difficulty changes everything — enemy speed, damage, quantity, and even how much time you have to react before a boss attacks (on Easy you have more time). The same levels, just with different settings — cheap to produce and multiplies the content.

### 7.5 What Brings You Back

- 1-3 stars per level (based on performance quality) + a best time to beat.
- Random challenges — auto-generated maps, nearly infinite content beyond the 40 levels.
- Unlocking new characters throughout the campaign (which are also available in 1v1).

### 7.6 Story (Light Narrative)

There's a simple background story that pulls you forward (no long cutscenes): you dig into the depths of the earth to reach the "living core" that awakens all the monsters, and each world is a deeper layer. A few sentences before each boss, and a short closing cutscene at the end.

---

## 8. Online 1v1 Mode

The competitive heart. Two real players on the same map, fighting each other over the internet.

### 8.1 How You Win

Whoever collected more diamonds by the end of the time wins the round. But there are two ways to obtain diamonds:

- **Collect yourself** — dig to the diamonds and deposit them.
- **Attack and steal** — eliminate the opponent (knockout), and each elimination steals a portion of their undeposited diamonds and transfers them to you.

So a player can win through both collecting and aggression. You constantly balance three approaches: collect quietly / attack and rob / defend and seal off paths the opponent could come from.

**Structure: "Best of 3" — whoever takes 2 rounds wins the match.**

### 8.2 Ranked and Friendly Mode

- **Ranked:** the game matches you with an opponent at your level, and a win/loss raises/lowers your rank. The ranks are leagues: Bronze ← Silver ← Gold ← Diamond.
- **Friendly:** a match against a friend with no effect on ranking — just for fun.
- **Global Leaderboard** — the best in the world.

### 8.3 Inviting a Friend

You create a game room and get a short code (e.g., "X7K2"). You send the code to a friend via any app, and they type it in the game to join. This way there's always someone to play with (even if not many people are online), and it also makes people invite friends — natural growth.

### 8.4 Visible Information — Everything Is Open

In line with the fairness principle, in 1v1 everything is visible: you see the whole map, the opponent's position at all times, their character and upgrades, and their diamond count. This way victory is decided by skill and reading the situation, not by surprises and luck.

### 8.5 How Players Are Made to Confront Each Other (and Not Hide in Corners)

A possible problem: if each player just scatters to a corner and collects quietly, there's no struggle. So the maps are designed such that the way to win is to confront:

- The most valuable diamonds are in the center of the map — you must get there, and that's where you meet.
- The cherry (frenzy) appears in the center mid-round — a magnet for confrontation.
- In the last 15 seconds the map begins to collapse from the edges inward — pushing both toward the center.
- The map is compact — you always "hear" the opponent digging nearby.


---

*— End of Document —*
