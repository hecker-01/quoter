<p align="center">
  <img src="assets/logo.png" alt="Quoter logo" width="160" />
</p>

<h1 align="center">Quoter</h1>

<p align="center">
  <em>"Every message has a story; I'll make sure it's remembered."</em>
</p>

<p align="center">
  <a href="https://discord.com/oauth2/authorize?client_id=1373998912569872497">Add to Discord</a> ·
  <a href="https://heckr.dev/quoter">Website</a>
</p>

Quoter is a Discord app that turns any message into a quote image: the author's avatar next to the message text, their name and the date. Every quote comes with controls underneath, so you can restyle it afterwards without making a new one.

## Using it

- Right-click (or long-press) a message, then **Apps**, then **Quote Message**
- **Quote Message Silently** keeps the quote private to you
- Reply to a message and mention the app to quote it
- `/quote` takes a message link or ID and an optional starting theme
- `/help`, or mentioning the app on its own, shows these steps

Quoter needs the **Attach Files** permission in a channel to send the image. It works in servers, group DMs and in the app's own DMs, and quotes message text, attachments, stickers and embeds.

## Customization

- Eight themes, from soft black and white to rose, silver, warm, muted, haze and gold
- Nineteen fonts, three sizes or a custom size, and your own text colors by hex code
- Image effects: GIF export, curved blend, flip, lyric style, grayscale, blur, brightness, pixelate, speech bubble, magik and hide name

Text colors are chosen to stay readable on each theme, including the random-color option. Only the person who made a quote can change it.

## Running it yourself

Requires Node.js 20 or newer.

```bash
npm install
```

Create a `.env` file with your app's credentials:

```env
TOKEN=your-bot-token
CLIENT_ID=your-application-id
```

Register the commands with Discord once (and again whenever they change), then start the app:

```bash
npm run deploy
npm start
```

`npm run dev` restarts on file changes. `config.json` is loaded at startup and holds an owner ID and a mod role ID; no command uses them yet.

### Emoji images

Emoji in quotes are drawn from the [Twemoji](https://github.com/jdecked/twemoji) PNG set in `Functions/twemoji/`. To pull the latest set:

```bash
npm run update:emojis
```

## Built with

[discord.js](https://discord.js.org), [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas) for drawing the image, and `gif-encoder-2` for GIF export. Emoji art is Twemoji, fonts are served from Fontsource packages.

## Known quirks

- GIFs have 256 colors, so soft gradients show banding
- Custom colors and sizes are kept in memory, so a restart forgets them and older quotes fall back to the theme defaults
- Lyric style is its own layout, so curved blend and magik do nothing there
