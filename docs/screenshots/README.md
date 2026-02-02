# Screenshots Guide

Add screenshots for each project to this folder. Recommended approach:

## How to Take Screenshots

1. Open each app in your browser
2. Use browser DevTools (F12) to set viewport to 1280x800
3. Take screenshot using:
   - Mac: Cmd + Shift + 4, then Space to capture window
   - Or use browser's screenshot feature

## Required Screenshots

### Featured Projects (High Priority)

| App | Filename | What to Capture |
|-----|----------|-----------------|
| Backtester | `backtester.png` | Main view with chart and backtest results |
| WalletScope | `walletscope.png` | Wallet analysis with chart and risk score |
| ResumeAI | `resume-ai.png` | Analysis results with match score |
| Trading Bot | `trading-bot.png` | Dashboard with positions and orders |

### Other Projects

| App | Filename | What to Capture |
|-----|----------|-----------------|
| DevPulse | `devpulse.png` | GitHub profile view with contribution graph |
| SnippetVault | `snippet-vault.png` | Code snippet with syntax highlighting |
| MarkdownPro | `markdown-pro.png` | Split view with markdown and preview |
| API Tester | `api-tester.png` | Request/response view |

## Image Optimization

After taking screenshots, optimize them:

```bash
# Using ImageOptim (Mac)
open -a ImageOptim docs/screenshots/*.png

# Or use online tool like TinyPNG
```

Target file size: < 500KB per image
