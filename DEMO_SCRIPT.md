# DEMO SCRIPT & PRESENTATION GUIDE

## 2-MINUTE PITCH SCRIPT

### OPENING HOOK (10 seconds)
*[SLIDE: AI agent holding credit card with question mark]*

**"How do you trust an AI with your credit card?"**

*[pause for effect]*

**"We solved this for fashion - but the solution scales to ALL autonomous agents."**

---

### THE PROBLEM (15 seconds)
*[SLIDE: Current AI limitations - chatbots vs agents]*

**"Today's AI can suggest what to buy. Tomorrow's AI will actually buy it for you."**

**"But without cryptographic verification, they're just chatbots playing dress-up."**

**"Closet proves autonomous commerce can work when trust is programmable."**

---

### LIVE DEMO (75 seconds)

#### Part 1: Meet the Agents (10 seconds)
*[SCREEN: Agent marketplace]*

**"Professional stylists create AI fashion agents. Each has an on-chain identity via ERC-8004."**

*[Click on 'Minimalist Maven' agent - show reputation: 850/1000]*

**"This is Minimalist Maven - created by a verified stylist with 10K Instagram followers."**

---

#### Part 2: User Subscribes (15 seconds)
*[SCREEN: Subscription flow]*

**"Sarah subscribes for $9.99 per month using x402 AutoPay."**

*[Show CDP Embedded Wallet connecting]*

**"She sets a $200 monthly shopping budget."**

*[Show AP2 intent signing popup]*

**"She cryptographically signs this spending rule. The agent can't exceed this limit."**

---

#### Part 3: Autonomous Shopping (30 seconds)
*[SCREEN: Split view - Agent decision / Blockchain verification]*

**"Now watch the magic. Sarah needs a jacket for an event."**

*[Show agent analyzing wardrobe]*

**"The agent analyzes her existing wardrobe..."**

*[Show Nordstrom product page]*

**"...finds the perfect match at Nordstrom for $89..."**

*[Show Triple-Verified Stack visualization]*

**"...verifies it has permission to spend..."**

*[Show transaction processing]*

**"...and purchases it autonomously using its CDP Server Wallet via x402!"**

*[Show success notification: "Purchase completed - Delivery in 2 days"]*

---

#### Part 4: Trust Verification (20 seconds)
*[SCREEN: Triple-Verified proof dashboard]*

**"Every step is cryptographically verified:"**

1. **"Intent:"** *[Highlight AP2 signature]* **"Sarah authorized this spending"**
2. **"Process:"** *[Highlight TEE attestation]* **"Agent followed her style rules"**
3. **"Outcome:"** *[Highlight on-chain record]* **"Purchase recorded on Polygon"**

*[Show reputation increase: 850 → 860]*

**"Success increases the agent's reputation. Bad purchases decrease it."**

---

### BUSINESS MODEL (15 seconds)
*[SLIDE: Three-sided marketplace diagram]*

**"Three-sided marketplace:"**
- **"Stylists earn 70% of subscriptions"**
- **"Users save hours shopping"**
- **"Retailers get qualified buyers"**

**"Fashion is our beachhead. Travel agents, nutrition coaches, financial advisors - they all need this trust layer."**

---

### TECHNICAL ARCHITECTURE (10 seconds)
*[SLIDE: Architecture diagram with sponsor logos]*

**"Built on Polygon for scale, CDP wallets for identity, Nethermind's Triple-Verified Stack for trust."**

**"This isn't three separate integrations - it's ONE system where each component is essential."**

---

### CLOSING (15 seconds)
*[SLIDE: Closet logo with tagline]*

**"Closet: Where autonomous agents meet verifiable commerce."**

**"We're not asking you to imagine the future of AI agents."**

**"We're showing you it works. Today."**

*[QR code for live demo]*

**"Try it yourself - the future of shopping is autonomous."**

---

## JUDGE Q&A PREPARATION

### Expected Questions & Answers

**Q: "Why fashion? Isn't this a solved problem?"**

**A:** "Fashion is the perfect testbed for autonomous agents. Mistakes aren't catastrophic - wrong shirt won't crash your portfolio. Feedback is immediate - you wear it tomorrow. High frequency means lots of data for reputation. Once we prove agents can be trusted with fashion, the model scales to high-stakes domains."

---

**Q: "How is this different from existing shopping assistants?"**

**A:** "Current assistants suggest - we execute. Amazon's assistant shows you products. Our agent actually buys them. The difference is cryptographic trust. With Triple-Verification, users can prove they authorized spending, agents prove they followed rules, and outcomes are immutably recorded."

---

**Q: "What about returns and disputes?"**

**A:** "Great question - this is where ERC-8004 shines. Every purchase creates an on-chain claim. If a user disputes, the outcome is recorded and affects reputation. Agents with high dispute rates lose reputation and users. The market self-regulates."

---

**Q: "How do you prevent agents from overspending?"**

**A:** "Three layers of protection:
1. Hard spending limits enforced by smart contracts
2. Per-transaction limits in the AP2 intent
3. Real-time monitoring via CDP webhooks
Even if an agent tries to overspend, the blockchain rejects it."

---

**Q: "Why do stylists need blockchain? Can't this be centralized?"**

**A:** "Blockchain gives stylists ownership of their agent's reputation. If Instagram bans them or a platform shuts down, their on-chain reputation persists. They can move their agent anywhere. It's portable professional identity."

---

**Q: "What's your revenue model?"**

**A:** "30% platform fee on subscriptions. At $9.99/month:
- 1,000 agents × 100 users each = 100K users
- $999K monthly revenue × 30% = $300K/month platform revenue
- Stylists earn $700K/month collectively
Fashion is a $1.7 trillion market - we need just 0.01% to be a unicorn."

---

**Q: "How do you acquire stylists?"**

**A:** "We're targeting micro-influencers with 10-50K followers. They have expertise but struggle to monetize. Our platform lets them earn $700/month per 100 subscribers. That's $8,400/year passive income from their fashion knowledge."

---

**Q: "Why these three sponsors specifically?"**

**A:** "Each solves a critical piece:
- **Polygon**: Fast, cheap transactions essential for micropayments
- **CDP**: Professional wallet infrastructure we couldn't build ourselves
- **Nethermind**: Trust verification that makes autonomous commerce possible
Remove any one and the system doesn't work."

---

## DEMO BACKUP PLANS

### If Live Demo Fails

**Plan A: Pre-recorded Video**
- Have 90-second video ready showing perfect flow
- "Let me show you our recorded demo for time/connection stability"

**Plan B: Screenshot Walkthrough**
- Have slides with annotated screenshots
- Walk through each step with static images
- Show actual blockchain transactions on Polygonscan

**Plan C: Architecture Focus**
- Pivot to technical deep-dive
- Show smart contract code
- Demonstrate Triple-Verified proofs on testnet

---

## SPONSOR-SPECIFIC TALKING POINTS

### For Polygon Judges

**Emphasize:**
- "Deployed entirely on Polygon PoS"
- "x402 AutoPay for subscriptions - extending the protocol"
- "Gas efficiency enables micropayments"
- "Processing 1000s of agent transactions daily"

**Show:**
- Live Polygonscan transactions
- Gas costs comparison
- x402 payment flow diagram

---

### For CDP Judges

**Emphasize:**
- "Using 4 CDP products: Server Wallets, Embedded Wallets, x402 Facilitator, Data APIs"
- "CDP enables features we couldn't build otherwise"
- "Production-ready integration, not a hackathon hack"
- "Detailed feedback: SDK could use better TypeScript types"

**Show:**
- Multiple wallet types in action
- CDP dashboard with metrics
- Code showing clean SDK integration

---

### For Nethermind Judges

**Emphasize:**
- "Complete Triple-Verified implementation"
- "Novel use of ERC-8004 for agent identity"
- "Solving real trust problem, not theoretical"
- "TEE integration for process integrity"

**Show:**
- AP2 intent signature verification
- TEE attestation (even if simulated)
- On-chain ERC-8004 registry
- Verification proof dashboard

---

## VISUAL ASSETS NEEDED

### Slides (5 total)

1. **Opening**: AI + Credit Card visual
2. **Problem**: Chatbots vs Agents comparison
3. **Architecture**: Simple diagram with 3 sponsors
4. **Business Model**: Three-sided marketplace
5. **Closing**: Logo + QR code

### Demo Screens

1. **Agent Marketplace**: Grid of fashion agents
2. **Agent Profile**: Minimalist Maven details
3. **Subscription Flow**: Payment setup
4. **Shopping Interface**: Agent making decision
5. **Verification Dashboard**: Triple proofs
6. **Success Screen**: Purchase confirmation

### Backup Materials

1. **Architecture Diagram**: Detailed technical flow
2. **Smart Contract Viewer**: Etherscan/Polygonscan
3. **Video Demo**: 90-second perfect run
4. **Screenshots**: Every step annotated

---

## PRESENTATION TIPS

### Body Language & Delivery

1. **Start strong**: Stand up, make eye contact
2. **Point to screen**: Guide attention during demo
3. **Slow down**: Nerves make you rush - breathe
4. **Pause for effect**: After key statements
5. **End definitively**: Don't trail off

### Technical Setup

1. **Test everything**: WiFi, screen sharing, audio
2. **Close unnecessary tabs**: Clean desktop
3. **Increase font size**: Code should be readable
4. **Disable notifications**: No distractions
5. **Have water ready**: Dry mouth is real

### Time Management

- 0:00-0:25 - Problem & Hook
- 0:25-1:40 - Live Demo
- 1:40-1:55 - Business & Architecture
- 1:55-2:00 - Strong Close

**Practice until it's exactly 2:00**

---

## THE WINNING MINDSET

### Remember:

1. **You built something real** - Not slides, actual working code
2. **You solved a hard problem** - Trust in autonomous agents
3. **You integrated deeply** - Not checkbox sponsor usage
4. **You have a business** - Not just a hackathon project
5. **You deserve to win** - Own your innovation

### Energy Anchors:

- **When nervous**: "We made agents that actually buy things"
- **When rushed**: "Trust is the breakthrough"
- **When questioned**: "Watch it work live"
- **When doubted**: "Fashion today, everything tomorrow"

---

## POST-PRESENTATION CHECKLIST

### Immediately After:

- [ ] Thank judges for time
- [ ] Share GitHub repo link
- [ ] Mention Twitter handle
- [ ] Offer to answer questions offline
- [ ] Get judge contact if allowed

### Within 1 Hour:

- [ ] Tweet demo video with sponsor tags
- [ ] Post in hackathon Discord
- [ ] Update GitHub README
- [ ] Submit to all sponsor portals
- [ ] Team celebration (you earned it!)

---

## SOCIAL MEDIA TEMPLATES

### Main Tweet:
```
🎯 Closet: Autonomous fashion agents that actually shop for you

Built @ETHGlobal with:
🔷 @0xPolygon - x402 autonomous payments
💼 @CoinbaseDev - CDP agent wallets
🔧 @NethermindEth - Triple-verified trust

Not just "AI suggests" but "AI executes" with cryptographic verification

[video]
```

### Technical Thread:
```
1/ How do you trust an AI with your credit card? We solved this with cryptography 🧵

2/ Problem: AI agents need to transact autonomously, but users need trust guarantees

3/ Solution: Triple-Verified Stack
- Intent: Users sign spending rules with AP2
- Process: TEE proves agent followed algorithm
- Outcome: ERC-8004 tracks on-chain reputation

4/ Built on @0xPolygon for speed, @CoinbaseDev wallets for identity, @NethermindEth for verification

5/ This isn't about fashion. It's about proving autonomous agents can operate in the real economy.

6/ Try it live: [link]
Code: [github]
```

---

## FINAL WORDS OF WISDOM

**Your story in one sentence:**
"We built the trust layer that makes autonomous commerce possible."

**If you forget everything else, remember:**
"Watch our agent buy this jacket. Right now. For real."

**The judge's takeaway should be:**
"These people solved a real problem with deep technical integration."

**Your confidence comes from:**
You didn't just use the sponsors' tools - you proved why they need to exist.

---

# YOU'VE GOT THIS! 🚀

Now go win that hackathon!