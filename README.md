# ⭐ Conpilot ⭐

Write some code, get roasted by **Conpilot**.

Try it live here: https://conpilot.vercel.app

## How does it work?

**Conpilot** uses [llama-3-8b](https://replicate.com/meta/meta-llama-3-8b-instruct) and the [SpeechSynthesis API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) to roast your code.

## Setup

Clone this repo, make a [Replicate](https://replicate.com) account and update the `.env` file with your API token:

```
REPLICATE_API_TOKEN="<token>"
```

## Run it

```bash
npm install
npm run dev
```
