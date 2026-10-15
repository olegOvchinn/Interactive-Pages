# Scan a photo: backend

The wizard pages are static, so they cannot hold an AI key. This tiny server does. It takes the shrunken photo
from `photo-triage.js`, asks Claude which wizard card it shows, and returns only a card id and a short reason.
Photos are not stored or logged.

## Today (demo on git)

Do nothing. With `endpoint: ''` the page runs in **demo mode**: the full flow works, but a drop-down in the
dialog decides what the stand-in "AI" recognises. It is safe to publish on git as it is.

## Client pays: admin pastes their own key (no server)

In demo mode the dialog shows "Connect your AI key". A helpdesk admin pastes their company's Anthropic key once;
it is kept only in that browser (localStorage) and the page calls Anthropic directly, so the client's own account
is billed and nothing of ours is involved. This works on git or any static host.

- For helpdesk and admin use only. Never give a key to the public: anyone using that browser can read it.
- Advise clients to create a key just for this, with a monthly spend limit in their Anthropic console.
- "Remove key" in the dialog deletes it (use it on shared computers). A rejected key is removed automatically.
- `PhotoTriage.init({ byoKey: false })` hides the option; `model: '...'` changes the model.
- The card descriptions used in this mode live in the `SIGNS` list at the bottom of the page script. Keep them in step with `catalogue.js`.

For end users, run the server below with the client's key instead, so the key never reaches their phones.

## When you host it on your server

Needs Node 18 or newer. No packages to install.

```
cd triage-server
ANTHROPIC_API_KEY=sk-ant-... \
ALLOWED_ORIGIN=https://help.yourcompany.com \
node server.js
```

Put it behind your usual HTTPS reverse proxy, then in the wizard page set the endpoint:

```js
PhotoTriage.init({ endpoint: 'https://help.yourcompany.com/triage', ... })
```

Demo mode switches off by itself as soon as `endpoint` is set.

| Setting | Meaning |
|---|---|
| `ANTHROPIC_API_KEY` | Required. Keep it on the server only. |
| `MODEL` | Claude model with picture support. Default `claude-sonnet-4-5`. |
| `ALLOWED_ORIGIN` | Site(s) allowed to call this server, comma-separated. |
| `RATE_PER_MIN`, `RATE_PER_DAY` | Pictures per visitor (defaults 6 and 60). |
| `DAILY_CAP` | Pictures per day across everyone (default 1000). A hard limit on cost. |

`GET /health` answers `{"ok":true}`.

## Keeping it in step with the wizard

`catalogue.js` lists the cards the AI may choose from (`handset` and `mobile`). The ids must match the card ids
in the wizard pages. When you add a card to a wizard, add it here too, with a concrete `signs` description of
what the screen looks like (exact words on screen, colours, buttons). Wrong or vague `signs` is the usual
reason for a poor match.

## Safety built in

- The AI can only return a card that exists in `catalogue.js`. It cannot write its own advice.
- Text inside a picture is treated as data. A screenshot that says "ignore your instructions" does nothing.
- The server checks the origin, picture size and type, and rate-limits each visitor.
- Anything below about 35% confidence goes to a "pick from the list" screen, and the client can always email support.

## Before you go live

- Test with 20 or more real handset photos and app screenshots, in bad light, at an angle and blurry, and look at the matches.
- Tell users a picture is sent to an AI service (the dialog already says so), and check that fits your data-protection terms.
