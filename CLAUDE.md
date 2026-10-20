# Лучше

iOS-приложение (Expo SDK 54, React Native, expo-router): короткий опрос о состоянии →
подбор практики → таймер → оценка. Работает офлайн, сервера нет. В App Store —
[«Лучше»](https://apps.apple.com/app/id6759188135). Первые версии (до 1.1.0) собирал Manus.

## Команды

```bash
pnpm install              # пакеты; .npmrc node-linker=hoisted обязателен для nativewind
pnpm start                # dev-сервер Expo (pnpm web — в браузере)
pnpm check                # tsc
pnpm test                 # vitest: подбор практик, часы таймера
```

Сборка и выкладка — EAS. Свежему eas-cli нужен Node ≥ 22.13:

```bash
npx eas-cli@latest build -p ios --profile production --auto-submit
```

## Что важно знать

- `bundleIdentifier` (`space.manus.…`) и `slug` (`practice-selector`) не менять:
  под ними опубликовано приложение и связан проект EAS.
- Версия (`version` в `app.config.ts` и `package.json`) должна быть выше всех, что когда-либо
  загружались в App Store Connect: Manus выгружал 1.0.1–1.0.9. Номер сборки ведёт EAS.
- Тема только светлая: все экраны сверстаны под светлый фон.
- Каталог практик — `assets/practices.json`; подбор — `lib/scoring.ts` и
  `lib/practice-selector.ts`. Время в опросе — верхняя граница («до N минут»).
- Таймер считает от часов, а не тиками (`lib/practice-timer.ts`): с заблокированным экраном
  гонг звонит локальным уведомлением (`lib/timer-notification.ts`, звук `assets/sounds/gong.caf`).
  Сменили `gong.mp3` — перегенерировать caf: `afconvert -f caff -d ima4 gong.mp3 gong.caf`.
