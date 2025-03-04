![Figma](https://img.shields.io/badge/figma-black.svg?style=for-the-badge&logo=figma&logoColor=white)
![Astro](https://img.shields.io/badge/astro-%232D4DEF.svg?style=for-the-badge&logo=astro&logoColor=white)
![Svelte](https://img.shields.io/badge/svelte-%23FC2E18.svg?style=for-the-badge&logo=svelte&logoColor=white)
![CSS](https://img.shields.io/badge/css-rebeccapurple?style=for-the-badge&logo=css3&logoColor=white)

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
