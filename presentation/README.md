# StyleAgent Presentation Package

## 📁 Contents

This directory contains all materials for the ETH Global 2-minute pitch presentation.

### Slides (8 total)

All slides are located in `slides/` directory as high-quality WebP images (16:9 aspect ratio, 2K resolution):

1. **slide-01-vision.webp** - Opening hook: AI agent + closet + blockchain
2. **slide-02-problem.webp** - Three pain points (decision fatigue, waste, paralysis)
3. **slide-03-wardrobe.webp** - Working Feature: Smart wardrobe analysis
4. **slide-04-outfits.webp** - Working Feature: AI outfit generation
5. **slide-05-shopping.webp** - Working Feature: Smart shopping intelligence
6. **slide-06-payments.webp** - Working Feature: Web3 payment rails (CDP + x402)
7. **slide-07-architecture.webp** - Technical stack diagram with status
8. **slide-08-roadmap.webp** - Vision timeline (Now → Next → Future)

### Documentation

- **PRESENTATION.md** (in root) - Complete presentation guide with:
  - Full speaker script with exact timing
  - Detailed slide content for each image
  - Judge Q&A responses
  - Backup plans if demo fails
  - Delivery tips and mindset coaching

## 🎨 Using the Slides

### Import to Presentation Software

**Google Slides:**
1. Create new presentation
2. Go to Slide → Change theme → Import theme
3. Or manually: Insert → Image for each slide
4. Add text overlays as specified in PRESENTATION.md

**PowerPoint:**
1. Insert → Pictures → insert each slide image
2. Add text boxes for titles and content
3. Use the slide content from PRESENTATION.md

**Keynote:**
1. Insert → Choose → select slide images
2. Add text overlays per PRESENTATION.md specifications

### Recommended Text Overlays

For each slide, add text as specified in the "Slide Content" sections of PRESENTATION.md.

**Example for Slide 1:**
- Large title: "StyleAgent"
- Subtitle: "Autonomous Fashion Intelligence"
- Main text: "What if your AI didn't just suggest—it understood, acted, and proved it?"

## ⏱️ Presentation Timing

**Total: 2:00 (120 seconds)**

- **Opening (Slides 1-2):** 0:00-0:20 (20 seconds)
- **Demo (Slides 3-6):** 0:20-1:20 (60 seconds)
- **Tech (Slide 7):** 1:20-1:35 (15 seconds)
- **Vision (Slide 8):** 1:35-2:00 (25 seconds)

## 📝 Speaker Notes

Full speaker script with exact wording is in **PRESENTATION.md** under "SPEAKER SCRIPT WITH TIMING".

### Key Talking Points

**Opening:**
"What if your AI stylist didn't just suggest clothes—it actually understood your wardrobe, bought for you, and proved it did the right thing? That's the future of autonomous agents. We built the foundation to make it real."

**Demo:**
Show 4 working features in sequence, emphasizing "This is live, not mocked."

**Tech:**
"Production-grade TypeScript monorepo. Not a hackathon hack. We built the hard parts."

**Close:**
"Fashion is proof-of-concept. The model scales to any autonomous agent. We proved the core works. The rest is just engineering."

## 🎯 Judge Q&A Preparation

See **PRESENTATION.md** section "JUDGE Q&A RESPONSE GUIDE" for:
- 8 expected questions with polished answers
- Sponsor-specific talking points (Polygon, CDP, Nethermind)
- How to handle tough questions about missing features

### Key Response Framework

**For missing features:**
"We chose depth over breadth. In 48 hours, we wanted to prove the hard parts work—real AI vision, real payment infrastructure. The missing pieces are features we know how to build. The hard technical problems are solved."

## 🚨 Backup Plans

If the demo fails during presentation:

### Option A: Pre-recorded Video
- Record a 60-second video of the demo working perfectly
- Have it queued and ready
- "For time and stability, here's our recorded demo"

### Option B: Screenshots
- Take screenshots of each working feature
- Walk through static images
- Emphasize "We have this working, showing screenshots for time"

### Option C: Architecture Deep Dive
- Skip to Slide 7 immediately
- Show actual code on GitHub
- Demonstrate technical credibility instead of live demo

## 💡 Presentation Tips

### Delivery
1. **Start strong** - Own the opening question
2. **Slow down during demo** - Don't rush the working features
3. **Pause for effect** - After key statements, let them land
4. **Eye contact** - Look at judges, not just the screen
5. **End definitively** - "Try it yourself. The future is autonomous." [Hold]

### Technical Setup Checklist
- [ ] Test demo on venue WiFi
- [ ] Backup video ready and queued
- [ ] Screenshots accessible
- [ ] Close unnecessary tabs
- [ ] Disable notifications
- [ ] Increase font sizes
- [ ] Water bottle nearby

### Mental Preparation
**Energy Anchors:**
- When nervous: "We made AI that actually works"
- When rushed: "The hard parts are solved"
- When questioned: "Watch it work live"
- When doubted: "Fashion first, everything next"

## 🏆 Winning Mindset

### Remember:
1. You built something **real** - actual working code
2. You made **hard choices** - depth over breadth shows maturity
3. You integrated **deeply** - not checkbox sponsor usage
4. You have **clear vision** - you know what's next and why
5. You **deserve to win** - own your innovation

### The Judge's Takeaway:
"These people solved real technical problems with production-quality code, have a clear vision for what's next, and understand the sponsors' technology deeply."

## 📊 File Sizes

All slides are optimized WebP format:
- Slide 1: 1.3 MB
- Slide 2: 1.0 MB
- Slide 3: 1.4 MB
- Slide 4: 1.0 MB
- Slide 5: 1.0 MB
- Slide 6: 1.1 MB
- Slide 7: 1.1 MB
- Slide 8: 1.1 MB

Total: ~9 MB for all slides

## 🔄 Regenerating Slides

If you need to regenerate any slide:

```bash
# From project root
bun scripts/generate-image.ts \
  --prompt "[Prompt from PRESENTATION.md]" \
  --aspect-ratio "16:9" \
  --image-size "2K"

# Then copy to presentation folder
cp scripts/generated-images/generated-*.webp presentation/slides/slide-XX-name.webp
```

All prompts are in PRESENTATION.md under each slide section.

## 📱 Social Media

After the presentation, use the social media templates in PRESENTATION.md to share:

```
🎯 StyleAgent: Autonomous fashion agents with verifiable trust

Built at @ETHGlobal with:
🔷 @0xPolygon - x402 autonomous payments
💼 @CoinbaseDev - CDP wallet infrastructure
🔧 @NethermindEth - Triple-Verified Stack

We proved autonomous commerce works when trust is programmable.

Fashion today. Everything tomorrow.
```

## 📚 Additional Resources

- **PRESENTATION.md** (root) - Complete presentation guide
- **TECHNICAL_INTEGRATION.md** (root) - Deep technical details
- **DEMO_SCRIPT.md** (root) - Original 2-minute demo script
- **project.md** (root) - Full product vision

---

## 🚀 FINAL CHECKLIST

Before going on stage:

- [ ] Slides imported to presentation software
- [ ] Text overlays added per PRESENTATION.md
- [ ] Speaker notes reviewed
- [ ] Demo tested on venue WiFi
- [ ] Backup materials ready
- [ ] Q&A responses memorized
- [ ] Deep breath taken
- [ ] Confidence engaged

**Now go win! 🏆**

The future of autonomous agents isn't theoretical. You made it real.
