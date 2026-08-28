# The Glacier Model — the version that's easy to understand

*Should your company keep buying AI by the token, or buy its own machines and run free
open-source models instead? This is the whole answer, told once, with one picture.
The [nerd version](glacier-math.md) has the equations; the
[dashboard](../index.html) lets you plug in your own numbers. For the sector-wide story,
read [When Open Source Gets Cheap Enough](https://claude.ai/code/artifact/40c001e6-97f2-4796-bf2f-a538cfdf8142).*

---

## The picture

Every million tokens you buy from an AI company costs you something — say $4 today. Every
million tokens you could serve on your own machines costs you something much smaller in
electricity — say 10 cents. The gap between those two numbers is a **glacier of savings**:
thick today, and yours to harvest if you show up with the right equipment.

But this glacier is melting.

- **The sun above it** is falling AI prices. Providers cut token prices roughly in half
  every year. Every cut thins the glacier — the savings you were going to harvest next
  year just got smaller.
- **The warm ground below it** is your electricity bill. Power prices are drifting up a
  few percent a year, and every uptick raises the floor your costs sit on.
- **Fresh snowfall** is your own efficiency: better serving software and better open
  models mean the same machines push out more tokens each year, which thickens the
  glacier back a little.

And between you and the ice stands a **toll gate**: you have to pay engineers to build the
thing (a few hundred thousand dollars, once), buy the chips (thousands of dollars per GPU,
and they lose resale value fast), and keep a small team running it (a few hundred thousand
a year, forever).

**The whole decision is one question: can you harvest more ice than the toll costs before
the glacier is gone?**

## The two gates

That one question is really two, and companies that merge them get the wrong answer.

**Gate 1 — is the ice real?** Is a token on your own machines actually cheaper than a
token you buy, today? Usually yes, by a lot. This gate is about *margins*, and it's easy
to pass.

**Gate 2 — can you carry out enough ice to pay the toll?** All your savings, added up over
the years and discounted, have to beat the dev cost plus the hardware plus the team. This
gate is about *volume*, and it's brutal.

The trap — and most mid-sized companies are standing in it — is passing Gate 1 and
failing Gate 2. Real margin on every token, and still not enough tokens for the margin to
pay for the machine that makes it. Our worked example: a company spending $21k/month on
tokens has a savings glacier worth about $570k over three years… against a toll of about
$1.6M. Clear margin, clear no.

As a rule of thumb from our defaults: self-hosting starts to pay somewhere around **15–20
billion tokens a month** — a serious AI product, not a feature. Below that, keep buying
and enjoy the falling prices; the sun is working for you.

## The catch nobody prices in

Suppose you're big enough to pass both gates against the fancy frontier models. There's a
third character in the story: companies that **rent out the same open-source models you
were about to buy machines for** — at prices that are already close to bare electricity
cost, and falling just as fast.

Beating the frontier API isn't the real bar. Beating the *rented open model* is, and in
our numbers even a company with a $200k+/month token bill loses that comparison by
millions. Renting shares one set of machines across hundreds of customers, so their
utilization beats yours. You only clear this bar when APIs are off the table — your data
can't leave, regulators are watching, latency has to be local — or when your machines run
hot around the clock like theirs do.

## About your electricity bill

You asked what rising electricity does to this. Honestly: **it presses down, and it
presses gently.**

Power is only a few percent of what running your own AI machines really costs — the chips
and the people are the big money. Electricity going up 6% a year drags your token yield
(the value you get per dollar of token spend) down by a fraction of a percent a year.
Meanwhile falling API prices push a token *buyer's* yield up by around 60% a year. Those
two forces are not in the same weight class. The price of power will never decide this
question for you.

What *can* decide it is whether you can get power at all. The binding problem in 2026
isn't the price per kilowatt-hour, it's the **megawatts** — grid connections, rack power at
your colo. If you can't plug the machines in, the glacier might as well be on the moon.
Watch the megawatts, not the meter rate.

## The twist that protects the sellers

One more thing, and it's the cleverest part of the whole story: your savings are a slice
of *their* price. When the frontier providers cut prices, your glacier thins — so the
better a deal buying becomes, the weaker the case for ever leaving. The people selling
you tokens control the speed at which your alternative stops being worth it, and cutting
prices — the thing they were going to do anyway — is their best defense. The sector-level
version of this (with a half-life: roughly four years for half the expensive workload to
migrate) is in [Two Gates and a Half-Life](https://claude.ai/code/artifact/aaa96ee8-841e-450f-90a1-52865e584372).

## So: when does open source make sense?

- **You're small or mid-sized** (under ~15B tokens/month): buy. Revisit yearly; the
  thresholds move.
- **You're big and your workload is steady** (high utilization, batch-heavy): the frontier
  comparison can favor building within about three years — check the hosted-open comparison before
  signing anything.
- **Your data can't leave the building**: build — but knowingly, as a compliance cost, not
  as a savings play the arithmetic doesn't support.
- **You're anywhere near the line**: waiting is cheap. The toll gate gets cheaper every
  year (chips, tooling, open models), and the glacier's fate will be clearer in twelve
  months. The one thing melting fast is the *reason to switch*, not the *ability to*.

Plug your own numbers into the [dashboard](../index.html) — plain mode for the six inputs
that matter, nerd mode for all of them, and the two gates will tell you which side of the
line you're on.

---

### The metaphor, decoded

| In the story | In the model |
|---|---|
| the glacier | per-token savings margin `a(t) = c(t) − κ·ε(t)` |
| the sun | API price melt rate `λ` (halving time) |
| the warm ground | electricity escalation `γ` |
| fresh snowfall | efficiency gains on your hardware `μ` |
| the toll gate | dev cost `D` + hardware + team `m` − resale value |
| harvestable ice | discounted glacier value `G` |
| when the glacier is gone | melt time `t* = ln(c₀/κε₀)/(λ+γ−μ)` |
| Gate 1 / Gate 2 | margin condition / participation condition |

*Analytical work, not investment advice. Every number here comes from the model in this
repository and its defaults are estimates as of August 2026 — the dashboard exists so you
can disagree with them.*
