import { Router } from 'express';

export const legalRouter = Router();

const updated = '7 October 2026';

legalRouter.get('/privacy', (_req, res) => {
  res.type('html').send(page('PROSPOR privacy policy', privacyBody()));
});

legalRouter.get('/terms', (_req, res) => {
  res.type('html').send(page('PROSPOR terms', termsBody()));
});

legalRouter.get('/delete', (_req, res) => {
  res.type('html').send(page('Delete your PROSPOR data', deleteBody()));
});

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; line-height: 1.5; color: #0f172a; background: #fff; margin: 0; }
    main { max-width: 40rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    h1 { font-size: 1.75rem; line-height: 1.2; }
    h2 { font-size: 1.1rem; margin-top: 2rem; }
    a { color: #1d4ed8; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>Updated ${updated}.</p>
    ${body}
  </main>
</body>
</html>`;
}

function privacyBody(): string {
  return `
    <p>PROSPOR is a mobile app that saves posts you choose and writes a short summary of them. This policy explains what we store and why.</p>
    <h2>What we collect</h2>
    <ul>
      <li>Your sign-in details from Google or Apple, including the account id and email address the provider gives us.</li>
      <li>Posts you save: the link, caption, screenshot, or Instagram reel you send to the PROSPOR Instagram account.</li>
      <li>The summary we generate: title, summary, key points, and tags.</li>
      <li>If you connect Instagram, the Instagram id of the account that sends us messages.</li>
    </ul>
    <h2>How we use it</h2>
    <p>We use this information to keep your saves in your account, to write the summary, and to reply on Instagram when you connect or send a reel. Screenshots and reel files are used to create the summary and are then deleted. We keep the text of the summary.</p>
    <p>Summaries are produced by Google Gemini under a paid API account. We do not send your posts to a free AI tier.</p>
    <h2>Who can see it</h2>
    <p>Your saves are private to your account. We do not sell them. The services that store and process them are Supabase, the PROSPOR server, Google sign-in, and Google Gemini.</p>
    <h2>How long we keep it</h2>
    <p>We keep your account and the text of your saves until you delete them. How to ask for deletion is on the <a href="/delete">data deletion page</a>.</p>
    <h2>Contact</h2>
    <p>Message the Instagram account get.prospor.ai from the account you use with PROSPOR.</p>
  `;
}

function termsBody(): string {
  return `
    <p>PROSPOR lets you save posts from Instagram, X, Reddit, and LinkedIn and read a summary later. The app is an early version.</p>
    <h2>Your content</h2>
    <p>You choose what to save. You are responsible for having the right to send us that post. We store it so you can read the summary in your account.</p>
    <h2>The summary</h2>
    <p>Summaries are generated automatically. They can be incomplete or wrong. Check the original post before you rely on a summary.</p>
    <h2>The service</h2>
    <p>We can change or stop the app, including while it is in testing. Instagram replies work only for accounts that can message our bot.</p>
    <h2>Ending your account</h2>
    <p>You can ask us to delete your account and saves. The steps are on the <a href="/delete">data deletion page</a>.</p>
  `;
}

function deleteBody(): string {
  return `
    <p>You can ask PROSPOR to delete your account and the posts, summaries, screenshots, and Instagram link stored for it.</p>
    <h2>How to ask</h2>
    <ol>
      <li>Sign in to the PROSPOR app with the same Google or Apple account you want deleted.</li>
      <li>Send a direct message to the Instagram account get.prospor.ai that says “Delete my account”, from the Instagram account you connected, if you connected one.</li>
    </ol>
    <p>We delete the saved posts, summaries, uploaded screenshots, device notification tokens, and the sign-in record for that account. Deletion is not instant. It is completed after we match the request to your account.</p>
    <p>The <a href="/privacy">privacy policy</a> describes what we store.</p>
  `;
}
