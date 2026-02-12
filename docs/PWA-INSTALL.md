# Why the PWA install option might not show on mobile

Here are the usual reasons and what to check.

## 1. **Missing or wrong-sized icons (most common)**

Browsers (especially Chrome on Android) require **at least one 192×192 and one 512×512 PNG** icon in the manifest for the install prompt to appear.

- **Fix:** Add `src/icons/icon-192.png` and `src/icons/icon-512.png` (see `src/icons/README.md`).  
- Regenerate the app (e.g. `ng build`) and deploy so the manifest and icons are served.

## 2. **Not served over HTTPS**

PWAs must run in a **secure context**: HTTPS in production, or `localhost` in development.  
If you open the app on your phone via `http://192.168.x.x:4200` or any other `http://` URL, the service worker will not register and the install prompt will not show.

- **Fix:** Deploy to a host that serves the app over HTTPS and open it from the phone via that URL.

## 3. **Service worker not registered**

In this project the service worker is **only registered in production** (when the hostname is not `localhost` or `127.0.0.1`). So:

- On your **desktop** at `http://localhost:4200` it does **not** register (by design, for hot reload).
- On your **phone** at `https://your-domain.com` it **does** register, as long as the page is HTTPS.

If you test on the phone using the dev server (e.g. `http://YOUR_IP:4200`), the worker may try to register but will fail because `http` (non-localhost) is not a secure context.

- **Fix:** Use a production build over HTTPS for installability (e.g. deploy and open `https://your-domain.com` on the phone).

## 4. **Chrome’s engagement rules**

Chrome does not show the install banner on the first visit. It may require:

- A few visits or some time on the site  
- The user not having already installed the app  
- Other internal heuristics  

So the prompt can appear only after a bit of use.

## 5. **iOS Safari (iPhone / iPad)**

On iOS there is **no automatic install banner** like on Chrome. The user has to add the app manually:

- Tap the **Share** button (square with arrow)  
- Choose **“Add to Home Screen”**  
- Confirm  

The manifest and icons still improve the icon and name shown on the home screen.

---

## Summary checklist for “Install” to show (e.g. Chrome Android)

| Requirement              | What to do |
|--------------------------|------------|
| 192×192 and 512×512 PNG  | Add `src/icons/icon-192.png` and `icon-512.png` (see `src/icons/README.md`). |
| HTTPS                    | Serve the app over HTTPS (or use localhost on the same machine only). |
| Production build         | Deploy a production build; the service worker is only registered when not on localhost. |
| Engagement               | Use the site a bit; the install prompt may appear after a few visits. |
| iOS                      | Use Share → “Add to Home Screen”; there is no automatic install banner. |

After adding the two PNG icons and deploying over HTTPS, the install option should be more likely to appear on supported browsers (e.g. Chrome on Android).
