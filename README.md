# Kits4U — The World's Finest Kits

A premium storefront for international football jerseys, built on the MotionSites 3D hero framework.
It's a static site with **no build step, no frameworks and no external JS**, so you can open `index.html` or deploy the folder to any static host (GitHub Pages, Netlify, Vercel, S3).

## Pages

| Page | File | Notes |
| --- | --- | --- |
| Home | `index.html` | "Global Kit Vault" 3D hero, featured kits, nations grid, live personalisation demo, delivery perks, newsletter |
| Country Collections | `collections.html` | Filter by nation / kit type / search / sort. Filters are kept in the URL, e.g. `?country=bra&type=retro` |
| Product | `product.html?kit=<id>` | Front/back/crest views, variants, Fan/Player fit, stock-aware sizes, size guide, name & number |
| Kit Bag (cart) | `cart.html` | Change quantities, promo codes, free-delivery meter. A slide-in cart drawer also appears on every page |
| Checkout | `checkout.html` | Contact, delivery (UK and international methods), card validation, order confirmation |

## The 3D hero: from planets to nations

The MotionSites composition is kept exactly: the `--u` design unit, the six responsive tiers, the entrance choreography, the burger menu and the switcher behaviour. The space theme is mapped onto nations like this:

- **Planet video backdrop → live WebGL stadium** (`assets/js/gl.js`). A floodlit digital stadium with mown turf, pitch lines, a scanning vault grid, twinkling camera flashes in the stands, and a giant **flag football** rising over the horizon. The ball's panels are true truncated-icosahedron seams, textured with the featured nation's flag. Visitors can **drag to spin** the ball, and the backdrop crossfades in 0.22s.
- **Planet cut-outs → live flag-football orbs.** The left and right slots show the previous and next nation (8 nations, fully reversible). Clicking an orb swaps its texture and repaints it in the same frame. Arrow keys also cycle through the nations.
- All orbs share **one** WebGL context. If WebGL isn't available, the site falls back to Canvas 2D.
- Reduced-motion visitors get a still render, no entrance animation and no transitions.

## Editing the catalogue

Everything lives in `assets/js/data.js`:

- `K.countries`: nation name, flag tint, hero copy and collection blurb
- `kits`: price, colours, collar, pattern and tagline for each kit
- `K.config`: currency, free-delivery threshold, personalisation price and Player-fit upcharge
- `K.shipping`, `K.promos` (`KITS4U10`, `WORLDCUP15`, `FREESHIP`), sizes and size guide

Jersey artwork is generated as SVG by `assets/js/jersey.js`. To use real product photography, add an `images` field to a kit and render it in `K.kitCard` / `product.js`.

## Going live with payments

Checkout runs in **test mode** (`K.config.testMode: true`). No payment is taken, and card details never leave the page. To take real payments, replace the body of `submitOrder()` in `assets/js/checkout.js` with your provider's flow (for example, a Stripe Checkout Session created on your server), then set `testMode: false`.
